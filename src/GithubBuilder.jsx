import React, { useState } from "react";
import { DEFAULT_IPS } from './utils/defaults';
import ConfigTester from "./ConfigTester";

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export default function GithubBuilder({ onBack }) {
  const [ips, setIps] = useState("");
  const [uuid, setUuid] = useState("");
  const [host, setHost] = useState("");
  const [path, setPath] = useState("");
  const [outputConfigs, setOutputConfigs] = useState("");
  const [copied, setCopied] = useState(false);
  const [configName, setConfigName] = useState("");

  const handleDownload = () => {
    const blob = new Blob([outputConfigs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GitHub-Configs-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerate = () => {
    const ipList = ips.split("\n").map(i => i.trim()).filter(Boolean);

    if (ipList.length === 0) {
      alert("لطفاً حداقل یک IP وارد کنید.");
      return;
    }

    if (!host.trim()) {
      alert("لطفاً آدرس HOST (لینک Codespace) را وارد کنید.");
      return;
    }

    const finalUuid = uuid.trim() || generateUUID();
    if (!uuid.trim()) setUuid(finalUuid);

    const encodedPath = encodeURIComponent(path.trim() || "/");
    const hostVal = host.trim();
    const baseName = configName.trim() || "GitHub";
    let results = [];
    let counter = 1;

    for (const ip of ipList) {
      const cName = encodeURIComponent(`${baseName}-${counter++}`);
      const config = `vless://${finalUuid}@${ip}:443?encryption=none&security=tls&sni=${hostVal}&fp=chrome&insecure=1&allowInsecure=1&type=xhttp&host=${hostVal}&path=${encodedPath}&mode=packet-up#${cName}`;
      results.push(config);
    }

    setOutputConfigs(results.join("\n"));
  };

  const handleLoadDefaults = () => {
    setIps(DEFAULT_IPS);
  };

  return (
    <div className="converter-layout">
      <div className="top-glow-app"></div>

      <div className="converter-header">
        <div className="badge premium-badge">🐙 GitHub Codespace</div>
        <h1>ساخت کانفیگ <span>GitHub</span></h1>
        <p>آدرس Codespace و لیست IPهای تمیز خود را وارد کنید تا کانفیگ نهایی ساخته شود</p>
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
            <h3>تنظیمات GitHub Codespace</h3>
          </div>
          <div className="panel-content">

            <p className="label">لیست IPهای تمیز (هر خط یک IP)</p>
            <textarea
              value={ips}
              onChange={e => setIps(e.target.value)}
              placeholder={"100.100.100.100\n200.200.200.200\n..."}
              spellCheck={false}
              style={{ height: "140px", marginBottom: "12px" }}
            />

            <button
              className="btn btn-secondary"
              onClick={handleLoadDefaults}
              style={{ padding: '10px 16px', fontSize: '14px', marginBottom: '24px', width: '100%' }}
            >
              📥 بارگذاری IPهای پیش‌فرض
            </button>

            <p className="label">نام کانفیگ (پیشوند)</p>
            <input
              className="styled-input"
              style={{ marginBottom: "20px" }}
              type="text"
              value={configName}
              onChange={e => setConfigName(e.target.value)}
              placeholder="e.g. MyGitHub"
              dir="ltr"
            />

            <p className="label">شناسه (UUID)</p>
            <input
              className="styled-input"
              style={{ marginBottom: "20px" }}
              type="text"
              value={uuid}
              onChange={e => setUuid(e.target.value)}
              placeholder="e.g. 12345678-1234-1234-1234-12"
              dir="ltr"
            />

            <p className="label">آدرس HOST (لینک Codespace)</p>
            <input
              className="styled-input"
              style={{ marginBottom: "20px" }}
              type="text"
              value={host}
              onChange={e => setHost(e.target.value)}
              placeholder="example.github.dev"
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
