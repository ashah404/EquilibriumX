const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const http = require('http');
const { XRAY_EXE } = require('./electron/download-xray.cjs');

// Simple single-config test with full logging
async function debugSingleTest() {
  const vlessUrl = "vless://dc73f08f-2873-45db-b27b-272e592e353d@104.21.60.220:443?encryption=none&security=tls&sni=cluster-proportional-autoscaler.sigs.k8s.io&fp=chrome&alpn=h2%2Chttp%2F1.1&insecure=1&allowInsecure=1&type=xhttp&host=test.netlify.app&path=%2F&mode=auto&extra=%7B%0A%20%20%22mode%22%3A%20%22auto%22%0A%7D#Netlify-1";

  const parsed = new URL(vlessUrl);
  const uuid = parsed.username;
  const address = parsed.hostname;
  const port = parseInt(parsed.port || '443');
  const sni = parsed.searchParams.get('sni') || '';
  const host = parsed.searchParams.get('host') || '';
  const pathParams = parsed.searchParams.get('path') || '/';
  const type = parsed.searchParams.get('type') || 'tcp';
  
  let extra = null;
  try {
    const extraStr = parsed.searchParams.get('extra');
    if (extraStr) extra = JSON.parse(decodeURIComponent(extraStr));
  } catch (e) {}

  const outbound = {
    protocol: "vless",
    settings: { vnext: [{ address, port, users: [{ id: uuid, encryption: "none" }] }] },
    streamSettings: { network: type, security: "tls", tlsSettings: { allowInsecure: true, serverName: sni, fingerprint: "chrome" } }
  };

  if (type === 'xhttp') {
    outbound.streamSettings.xhttpSettings = {
      mode: parsed.searchParams.get('mode') || "auto",
      path: decodeURIComponent(pathParams),
      host: decodeURIComponent(host)
    };
    if (extra) outbound.streamSettings.xhttpSettings.extra = extra;
  }

  // Use a random high port
  const listenPort = 40000 + Math.floor(Math.random() * 10000);
  
  const config = {
    log: { loglevel: "warning" },
    inbounds: [{ port: listenPort, listen: "127.0.0.1", protocol: "http" }],
    outbounds: [outbound]
  };

  const configPath = path.join(__dirname, 'bin', 'debug_single.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  console.log(`Config written to ${configPath}`);
  console.log(`Using port: ${listenPort}`);
  console.log(`Config JSON:\n${JSON.stringify(config, null, 2)}`);

  const xrayProcess = spawn(XRAY_EXE, ['run', '-c', configPath]);

  xrayProcess.stdout.on('data', d => console.log('STDOUT:', d.toString().trim()));
  xrayProcess.stderr.on('data', d => console.log('STDERR:', d.toString().trim()));
  xrayProcess.on('exit', (code) => console.log('EXIT CODE:', code));

  // Wait then poll
  await new Promise(r => setTimeout(r, 2000));

  console.log('Trying to connect to port...');
  const socket = net.createConnection(listenPort, '127.0.0.1');
  socket.on('connect', async () => {
    console.log('PORT IS OPEN! Xray is running.');
    socket.destroy();

    // Now try the actual HTTP test
    console.log('Sending HTTP request through proxy...');
    const startTime = Date.now();
    const req = http.request({
      host: '127.0.0.1',
      port: listenPort,
      method: 'GET',
      path: 'http://www.google.com/generate_204',
      timeout: 8000,
      agent: false
    }, (res) => {
      const ping = Date.now() - startTime;
      console.log(`RESPONSE: Status=${res.statusCode}, Ping=${ping}ms`);
      xrayProcess.kill();
      try { fs.unlinkSync(configPath); } catch(e) {}
    });
    req.on('error', (err) => {
      console.log('REQUEST ERROR:', err.message);
      xrayProcess.kill();
      try { fs.unlinkSync(configPath); } catch(e) {}
    });
    req.on('timeout', () => {
      console.log('REQUEST TIMEOUT');
      req.destroy();
      xrayProcess.kill();
      try { fs.unlinkSync(configPath); } catch(e) {}
    });
    req.end();
  });
  socket.on('error', (err) => {
    console.log('PORT CONNECTION FAILED:', err.message);
    xrayProcess.kill();
    try { fs.unlinkSync(configPath); } catch(e) {}
  });
}

debugSingleTest();
