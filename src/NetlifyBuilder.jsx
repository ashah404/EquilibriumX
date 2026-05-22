import React, { useState } from 'react';
import { DEFAULT_DOMAINS, DEFAULT_IPS } from './utils/defaults';
import ConfigTester from './ConfigTester';


export default function NetlifyBuilder({ onBack }) {
  const [domains, setDomains] = useState("");
  const [ips, setIps] = useState("");
  const [uuid, setUuid] = useState("");
  const [host, setHost] = useState("");
  const [path, setPath] = useState("");
  const [xhttpExtra, setXhttpExtra] = useState("{\n  \"mode\": \"auto\"\n}");
  const [buildMode, setBuildMode] = useState("domains_only");
  const [outputConfigs, setOutputConfigs] = useState("");
  const [copied, setCopied] = useState(false);
  const [configName, setConfigName] = useState("");

  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleDownload = () => {
    const blob = new Blob([outputConfigs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Netlify-Configs-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerate = () => {
    const domainList = domains.split("\n").map(d => d.trim()).filter(Boolean);
    const ipList = ips.split("\n").map(i => i.trim()).filter(Boolean);

    if (domainList.length === 0) {
      alert("لطفاً حداقل یک دامنه وارد کنید.");
      return;
    }

    if (!host) {
      alert("لطفاً آدرس HOST نتلیفای را وارد کنید.");
      return;
    }

    const finalUuid = uuid.trim() || generateUUID();
    if (!uuid.trim()) {
      setUuid(finalUuid);
    }

    const encodedPath = encodeURIComponent(path.trim() || "/");

    let extraStr = xhttpExtra;
    try {
      JSON.parse(xhttpExtra);
      extraStr = encodeURIComponent(xhttpExtra);
    } catch {
      alert("ورودی XHTTP EXTRA یک JSON معتبر نیست.");
      return;
    }

    const encodedHost = encodeURIComponent(host.trim());
    let results = [];

    const baseName = configName.trim() || "Netlify";
    let counter = 1;

    if (buildMode === "domains_only") {
      for (const d of domainList) {
        const cName = encodeURIComponent(`${baseName}-${counter++}`);
        const config = `vless://${finalUuid}@${d}:443?encryption=none&security=tls&sni=${d}&fp=chrome&alpn=h2%2Chttp%2F1.1&insecure=1&allowInsecure=1&type=xhttp&host=${encodedHost}&path=${encodedPath}&mode=auto&extra=${extraStr}#${cName}`;
        results.push(config);
      }
    } else {
      if (ipList.length === 0) {
        alert("لطفاً حداقل یک IP وارد کنید.");
        return;
      }
      for (const d of domainList) {
        for (const ip of ipList) {
          const cName = encodeURIComponent(`${baseName}-${counter++}`);
          const config = `vless://${finalUuid}@${ip}:443?encryption=none&security=tls&sni=${d}&fp=chrome&alpn=h2%2Chttp%2F1.1&insecure=1&allowInsecure=1&type=xhttp&host=${encodedHost}&path=${encodedPath}&mode=auto&extra=${extraStr}#${cName}`;
          results.push(config);
        }
      }
    }

    setOutputConfigs(results.join("\n"));
  };

  const handleLoadDefaults = () => {
    setDomains(DEFAULT_DOMAINS);
    setIps(DEFAULT_IPS);
  };

  return (
    <div className="converter-layout">
      <div className="top-glow-app"></div>

      <div className="converter-header">
        <div className="badge premium-badge">🌐 Netlify Method</div>
        <h1>ساخت کانفیگ <span>Netlify</span></h1>
        <p>لیست دامنه‌ها و IPهای خود را وارد کنید تا کانفیگ نهایی ساخته شود</p>
      </div>

      <div
        className="converter-grid"
        style={{
          gridTemplateColumns: outputConfigs ? '1fr 1fr' : '1fr',
          maxWidth: outputConfigs ? '1200px' : '800px'
        }}
      >
        {/* Input Column */}
        <div className="converter-panel glass-panel">
          <div className="panel-header">
            <span className="panel-icon">⚙️</span>
            <h3>ورودی دامنه‌ها و IPها</h3>
          </div>
          <div className="panel-content">
            <p className="label">لیست دامنه‌ها (هر خط یک دامنه)</p>
            <textarea
              value={domains}
              onChange={e => setDomains(e.target.value)}
              placeholder={"example1.com\nexample2.com\n..."}
              spellCheck={false}
              style={{ height: "140px", marginBottom: "20px" }}
            />

            <p className="label">لیست IPهای تمیز (هر خط یک IP)</p>
            <textarea
              value={ips}
              onChange={e => setIps(e.target.value)}
              placeholder={"104.104.104.104\n100.100.100.100\n..."}
              spellCheck={false}
              style={{ height: "100px", marginBottom: "12px" }}
            />

            <button
              className="btn btn-secondary"
              onClick={handleLoadDefaults}
              style={{ padding: '10px 16px', fontSize: '14px', marginBottom: '24px', width: '100%' }}
            >
              📥 بارگذاری لیست‌های پیش‌فرض
            </button>

            <p className="label">نام کانفیگ (پیشوند)</p>
            <input
              className="styled-input"
              style={{ marginBottom: "20px" }}
              type="text"
              value={configName}
              onChange={e => setConfigName(e.target.value)}
              placeholder="e.g. MyVPN"
              dir="ltr"
            />

            <p className="label">شناسه (UUID)</p>
            <input
              className="styled-input"
              style={{ marginBottom: "20px" }}
              type="text"
              value={uuid}
              onChange={e => setUuid(e.target.value)}
              placeholder="e.g. 12345678-1234-1234-1234-1234567890ab"
              dir="ltr"
            />

            <p className="label">آدرس HOST (لینک ساخته شده نتلیفای)</p>
            <input
              className="styled-input"
              style={{ marginBottom: "20px" }}
              type="text"
              value={host}
              onChange={e => setHost(e.target.value)}
              placeholder="example.netlify.app"
              dir="ltr"
            />

            <p className="label">مسیر (PATH)</p>
            <input
              className="styled-input"
              style={{ marginBottom: "20px" }}
              type="text"
              value={path}
              onChange={e => setPath(e.target.value)}
              placeholder="/"
              dir="ltr"
            />

            <p className="label">ورودی XHTTP EXTRA (با فرمت JSON)</p>
            <textarea
              value={xhttpExtra}
              onChange={e => setXhttpExtra(e.target.value)}
              placeholder={"{\n  \"mode\": \"auto\"\n}"}
              spellCheck={false}
              style={{ height: "100px" }}
            />

            <div className="strategy-selector" style={{ marginTop: "20px" }}>
              <div className="label">حالت ساخت کانفیگ:</div>
              <div className="strategy-options">
                <button
                  className={`strategy-btn ${buildMode === 'domains_only' ? 'active' : ''}`}
                  onClick={() => setBuildMode('domains_only')}
                >
                  🌐 فقط دامنه‌ها
                </button>
                <button
                  className={`strategy-btn ${buildMode === 'domains_ips' ? 'active' : ''}`}
                  onClick={() => setBuildMode('domains_ips')}
                >
                  ⚡ دامنه‌ها + IPها
                </button>
              </div>
            </div>

            <div className="btn-row" style={{ marginTop: "auto", paddingTop: "24px" }}>
              <button className="btn btn-secondary" onClick={onBack}>
                ➔ بازگشت
              </button>
              <button className="btn btn-primary glow-effect" onClick={handleGenerate}>
                ⚡ تولید کانفیگ
              </button>
            </div>
          </div>
        </div>

        {/* Output Column */}
        {outputConfigs && (
          <div className="converter-panel glass-panel" style={{ minHeight: 0 }}>
            <div className="panel-header">
              <span className="panel-icon">📤</span>
              <h3>خروجی کانفیگ‌ها</h3>
              <span className="tab-badge" style={{ marginRight: 'auto' }}>{outputConfigs.split('\n').length} کانفیگ</span>
            </div>
            <div className="panel-content" style={{ minHeight: 0 }}>
              <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                <div className="output-box" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, height: '100%' }}>
                  <div className="output-code">{outputConfigs}</div>
                </div>
              </div>
              <div className="btn-row" style={{ marginTop: "24px" }}>
                <ConfigTester
                  configs={outputConfigs}
                  buttonText="🧪 تست کانفیگ"
                  buttonClassName="btn btn-secondary"
                />
                <button
                  className="btn btn-primary"
                  onClick={handleDownload}
                >
                  📥 دانلود فایل
                </button>
                <button
                  className={`btn ${copied ? "btn-success" : "btn-secondary"}`}
                  onClick={() => {
                    navigator.clipboard.writeText(outputConfigs);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? "✓ کپی شد!" : "کپی کانفیگ‌ها"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


