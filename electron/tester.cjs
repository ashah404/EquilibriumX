const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const { XRAY_EXE } = require('./download-xray.cjs');

function buildStreamSettings(params, host_addr) {
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
      try {
        let extraStr = params.extra;
        if (extraStr.startsWith('%')) {
          extraStr = decodeURIComponent(extraStr);
        }
        Object.assign(xhttp, JSON.parse(extraStr));
      } catch (e) {}
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

// Parse a vless:// URL to Xray JSON outbound config
function parseVlessToOutbound(vlessUrl) {
  try {
    const parsed = new URL(vlessUrl);
    if (parsed.protocol !== 'vless:') return null;

    const uuid = parsed.username;
    const address = parsed.hostname;
    const port = parseInt(parsed.port || '443');
    
    const params = {};
    for (const [k, v] of parsed.searchParams.entries()) {
      params[k] = v;
    }

    const user = { id: uuid, encryption: "none" };
    if (params.flow) user.flow = params.flow;

    const outbound = {
      protocol: "vless",
      settings: {
        vnext: [{
          address: address,
          port: port,
          users: [user]
        }]
      },
      streamSettings: buildStreamSettings(params, address)
    };

    return outbound;
  } catch (err) {
    console.error("Failed to parse VLESS:", err);
    return null;
  }
}

// =============================================
// Single-process per test (reliable like v2rayN)
// =============================================
function getRandomPort() {
  return 30000 + Math.floor(Math.random() * 30000);
}

async function testSingleConfig(vlessStr) {
  return new Promise((resolve) => {
    const outbound = parseVlessToOutbound(vlessStr);
    if (!outbound) {
      return resolve({ success: false, error: 'Invalid URL' });
    }

    const listenPort = getRandomPort();
    const config = {
      log: { loglevel: "none" },
      inbounds: [{
        port: listenPort,
        listen: "127.0.0.1",
        protocol: "http"
      }],
      outbounds: [outbound]
    };

    const configPath = path.join(__dirname, '..', 'bin', `temp_${listenPort}.json`);
    
    let done = false;
    let xrayProcess = null;
    
    const finish = (result) => {
      if (done) return;
      done = true;
      if (xrayProcess) {
        try { xrayProcess.kill(); } catch (e) {}
      }
      fs.promises.unlink(configPath).catch(() => {});
      resolve(result);
    };

    fs.promises.writeFile(configPath, JSON.stringify(config))
      .then(() => {
        if (done) return;
        xrayProcess = spawn(XRAY_EXE, ['run', '-c', configPath], {
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe']
        });

        // If xray crashes immediately
        xrayProcess.on('exit', (code) => {
          if (!done) {
            finish({ success: false, error: `Core exit (${code})` });
          }
        });
      })
      .catch((err) => {
        finish({ success: false, error: `FS Error: ${err.message}` });
      });



    // Poll until port is open
    let attempts = 0;
    const maxAttempts = 25; // 5 seconds max
    const pollTimer = setInterval(() => {
      if (done) { clearInterval(pollTimer); return; }
      attempts++;
      
      if (attempts > maxAttempts) {
        clearInterval(pollTimer);
        finish({ success: false, error: 'Start timeout' });
        return;
      }

      const sock = net.createConnection(listenPort, '127.0.0.1');
      sock.on('connect', () => {
        sock.destroy();
        clearInterval(pollTimer);

        // Port is open, send the test request
        const startTime = Date.now();
        const req = http.request({
          host: '127.0.0.1',
          port: listenPort,
          method: 'GET',
          path: 'http://www.google.com/generate_204',
          timeout: 5000,
          agent: false
        }, (res) => {
          const ping = Date.now() - startTime;
          if (res.statusCode === 204 || res.statusCode === 200) {
            finish({ success: true, ping });
          } else {
            finish({ success: false, error: `HTTP ${res.statusCode}` });
          }
        });
        req.on('error', (err) => finish({ success: false, error: err.message }));
        req.on('timeout', () => { req.destroy(); finish({ success: false, error: 'Timeout' }); });
        req.end();
      });
      sock.on('error', () => sock.destroy());
    }, 200);

    // Absolute failsafe
    setTimeout(() => finish({ success: false, error: 'Process timeout' }), 12000);
  });
}

module.exports = { testSingleConfig };
