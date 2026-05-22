function parseQueryString(query) {
  const params = {};
  if (!query) return params;
  query.split("&").forEach(part => {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) return;
    const k = decodeURIComponent(part.slice(0, eqIdx));
    const v = decodeURIComponent(part.slice(eqIdx + 1));
    if (k) params[k] = v;
  });
  return params;
}

export function parseVless(url) {
  try {
    url = url.trim();
    if (!url.startsWith("vless://")) return null;
    const withoutScheme = url.slice(8);
    const atIdx = withoutScheme.indexOf("@");
    if (atIdx === -1) return null;
    const uuid = withoutScheme.slice(0, atIdx);
    const rest = withoutScheme.slice(atIdx + 1);
    const hashIdx = rest.indexOf("#");
    const remark = hashIdx !== -1 ? decodeURIComponent(rest.slice(hashIdx + 1)) : "";
    const hostAndQuery = hashIdx !== -1 ? rest.slice(0, hashIdx) : rest;
    const qIdx = hostAndQuery.indexOf("?");
    const hostPort = qIdx !== -1 ? hostAndQuery.slice(0, qIdx) : hostAndQuery;
    const query = qIdx !== -1 ? hostAndQuery.slice(qIdx + 1) : "";
    const lastColon = hostPort.lastIndexOf(":");
    const host = hostPort.slice(0, lastColon);
    const port = parseInt(hostPort.slice(lastColon + 1)) || 443;
    const params = parseQueryString(query);

    const user = { id: uuid, encryption: "none" };
    if (params.flow) user.flow = params.flow;

    const outbound = {
      protocol: "vless",
      settings: { vnext: [{ address: host, port, users: [user] }] },
      streamSettings: buildStream(params, host),
      tag: remark || `proxy-${host}:${port}`
    };
    return { outbound, remark, host, port };
  } catch {
    return null;
  }
}

function buildStream(params, host_addr) {
  const net = params.type || "tcp";
  const security = params.security || "none";
  const sni = params.sni || params.peer || host_addr;
  const fp = params.fp || "";
  const path = params.path || "/";
  const headerType = params.headerType || "";
  const hostHeader = params.host || host_addr;
  const serviceName = params.serviceName || "";
  const mode = params.mode || "auto";

  const stream = { network: net };

  if (net === "ws") {
    stream.wsSettings = { path, headers: { Host: hostHeader } };
  } else if (net === "xhttp" || net === "splithttp") {
    const xhttp = { host: hostHeader, path, mode };
    if (params.extra) {
      try { Object.assign(xhttp, JSON.parse(params.extra)); } catch {}
    }
    stream.xhttpSettings = xhttp;
  } else if (net === "grpc") {
    stream.grpcSettings = { serviceName, multiMode: false };
  } else if (net === "h2" || net === "http") {
    stream.httpSettings = { path, host: [hostHeader] };
  } else if (net === "httpupgrade") {
    stream.httpupgradeSettings = { path, host: hostHeader };
  } else if (net === "tcp") {
    if (headerType === "http") {
      stream.tcpSettings = {
        header: { type: "http", request: { path: [path], headers: { Host: [hostHeader] } } }
      };
    }
  } else if (net === "quic") {
    stream.quicSettings = {
      security: params.quicSecurity || "none",
      key: params.key || "",
      header: { type: headerType || "none" }
    };
  } else if (net === "kcp" || net === "mkcp") {
    stream.kcpSettings = {
      mtu: 1350, tti: 50, uplinkCapacity: 12, downlinkCapacity: 100,
      congestion: false, readBufferSize: 2, writeBufferSize: 2,
      header: { type: headerType || "none" },
      seed: params.seed || ""
    };
  }

  const allowInsecure = params.allowInsecure === "1" || params.insecure === "1";
  const alpnRaw = params.alpn || "";
  const alpnList = alpnRaw ? alpnRaw.split(",").map(s => s.trim()).filter(Boolean) : [];

  if (security === "tls") {
    stream.security = "tls";
    const tls = { serverName: sni, allowInsecure };
    if (fp) tls.fingerprint = fp;
    if (alpnList.length) tls.alpn = alpnList;
    stream.tlsSettings = tls;
  } else if (security === "reality") {
    stream.security = "reality";
    stream.realitySettings = {
      serverName: sni,
      fingerprint: fp || "chrome",
      publicKey: params.pbk || "",
      shortId: params.sid || "",
      spiderX: params.spx || ""
    };
  } else {
    stream.security = "none";
  }

  return stream;
}

export function buildConfig(outbounds, strategy = "leastPing") {
  const tags = outbounds.map(o => o.tag);
  return {
    log: { loglevel: "warning" },
    inbounds: [
      {
        tag: "socks",
        port: 10808,
        listen: "127.0.0.1",
        protocol: "socks",
        settings: { auth: "noauth", udp: true, userLevel: 8 }
      },
      {
        tag: "http",
        port: 10809,
        listen: "127.0.0.1",
        protocol: "http",
        settings: { userLevel: 8 }
      }
    ],
    outbounds: [
      ...outbounds,
      { tag: "direct", protocol: "freedom", settings: {} },
      { tag: "block", protocol: "blackhole", settings: { response: { type: "http" } } }
    ],
    routing: {
      domainStrategy: "IPIfNonMatch",
      balancers: [
        {
          tag: "main-balancer",
          selector: tags,
          strategy: { type: strategy }
        }
      ],
      rules: [
        {
          type: "field",
          ip: ["geoip:private"],
          outboundTag: "direct"
        },
        {
          type: "field",
          domain: ["geosite:category-ads-all"],
          outboundTag: "block"
        },
        {
          type: "field",
          network: "tcp,udp",
          balancerTag: "main-balancer"
        }
      ]
    },
    observatory: {
      subjectSelector: tags,
      probeUrl: "https://www.google.com/generate_204",
      probeInterval: "10m",
      enableConcurrency: true
    }
  };
}
