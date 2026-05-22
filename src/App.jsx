import React, { useState, useCallback } from "react";
import { parseVless, buildConfig } from "./utils/xrayParser";
import Landing from "./Landing";
import Dashboard from "./Dashboard";
import NetlifyBuilder from "./NetlifyBuilder";
import GithubBuilder from "./GithubBuilder";
import VercelBuilder from "./VercelBuilder";
import ConfigTester from "./ConfigTester";
import "./index.css";

export default function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState([]);
  const [copied, setCopied] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState("landing");
  const [strategy, setStrategy] = useState("leastPing");

  const handleConvert = useCallback(() => {
    const lines = input.split("\n").map(l => l.trim()).filter(l => l.startsWith("vless://"));
    if (!lines.length) {
      setErrors(["هیچ لینک vless معتبری پیدا نشد."]);
      setResult(null);
      return;
    }
    const parsed = lines.map((l, i) => ({ ...parseVless(l), raw: l, idx: i }));
    const valid = parsed.filter(p => p && p.outbound);
    const invalid = parsed.filter(p => !p || !p.outbound).map(p => `خط ${p.idx + 1}: نامعتبر`);

    if (!valid.length) {
      setErrors(["هیچ لینکی پارس نشد."]);
      setResult(null);
      return;
    }

    // deduplicate tags
    const tagCount = {};
    valid.forEach(v => {
      const t = v.outbound.tag;
      tagCount[t] = (tagCount[t] || 0) + 1;
    });
    const tagIdx = {};
    valid.forEach(v => {
      const t = v.outbound.tag;
      if (tagCount[t] > 1) {
        tagIdx[t] = (tagIdx[t] || 0) + 1;
        v.outbound.tag = `${t}-${tagIdx[t]}`;
      }
    });

    const outbounds = valid.map(v => v.outbound);
    const config = buildConfig(outbounds, strategy);
    setResult({ config, count: valid.length, errors: invalid, activeStrategy: strategy });
    setErrors(invalid);
  }, [input, strategy]);

  const handleCopy = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result.config, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.config, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "equilibrium-x-config.json";
    a.click();
  }, [result]);

  const handleGithubClick = useCallback((e) => {
    if (typeof window !== 'undefined' && typeof window.require !== 'undefined') {
      e.preventDefault();
      try {
        const { shell } = window['require']('electron');
        shell.openExternal("https://github.com/ashah404");
      } catch (err) {
        window.open("https://github.com/ashah404", "_blank");
      }
    }
  }, []);



  const renderBalancerView = () => {
    return (
      <div className="converter-layout">
        <div className="converter-glow top-glow-app"></div>

        <div className="converter-header">
          <div className="badge premium-badge">💎 Equilibrium X</div>
          <h1>مبدل هوشمند <span>VLESS</span></h1>
          <p>کانفیگ‌های VLESS خود را وارد کنید تا به صورت خودکار کانفیگ را به بالانسر تبدیل کنید </p>
        </div>

        <div className="converter-grid" style={!result ? { gridTemplateColumns: '1fr', maxWidth: '600px', margin: '0 auto' } : {}}>
          {/* Input Column */}
          <div className="converter-panel glass-panel">
            <div className="panel-header">
              <span className="panel-icon">📥</span>
              <h3>لینک‌های ورودی VLESS</h3>
            </div>
            <div className="panel-content">
              <p className="label">لینک‌ها را وارد کنید (هر خط یک لینک)</p>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={"vless://uuid@host:port?security=tls&type=ws#نام\n..."}
                spellCheck={false}
              />

              <div className="strategy-selector">
                <div className="label">استراتژی لودبالانسر:</div>
                <div className="strategy-options">
                  <button className={`strategy-btn ${strategy === 'leastPing' ? 'active' : ''}`} onClick={() => setStrategy('leastPing')}>leastPing</button>
                  <button className={`strategy-btn ${strategy === 'random' ? 'active' : ''}`} onClick={() => setStrategy('random')}>random</button>
                  <button className={`strategy-btn ${strategy === 'roundRobin' ? 'active' : ''}`} onClick={() => setStrategy('roundRobin')}>roundRobin</button>
                </div>
              </div>

              <div className="btn-row" style={{ marginTop: "auto", paddingTop: "24px" }}>
                <button className="btn btn-secondary" onClick={() => setCurrentView("dashboard")}>
                  ➔ بازگشت
                </button>
                <ConfigTester
                  configs={input}
                  buttonText="🧪 تست پینگ سرورها"
                  buttonClassName="btn btn-secondary"
                />
                <button className="btn btn-primary glow-effect" onClick={handleConvert}>
                  ⚡ تبدیل به لود بالانسر
                </button>
              </div>
            </div>
          </div>

          {/* Output Column - only shown when result exists */}
          {result && (
            <div className="converter-panel glass-panel" style={{ minHeight: 0 }}>
              <div className="panel-header">
                <span className="panel-icon">📤</span>
                <h3>خروجی Custom Config</h3>
                <span className="tab-badge" style={{ marginRight: 'auto' }}>{result.count} سرور</span>
              </div>
              <div className="panel-content" style={{ minHeight: 0 }}>
                <div className="stats">
                  <div className="stat">
                    <div className="stat-num">{result.count}</div>
                    <div className="stat-label">سرور</div>
                  </div>
                  <div className="stat">
                    <div className="stat-num" style={{ color: "#ff9900" }}>{result.activeStrategy}</div>
                    <div className="stat-label">استراتژی</div>
                  </div>
                  <div className="stat">
                    <div className="stat-num" style={{ color: errors.length > 0 ? "#ff6060" : "#00ffb3" }}>
                      {errors.length}
                    </div>
                    <div className="stat-label">خطا</div>
                  </div>
                </div>

                <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                  <div className="output-box" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, height: '100%' }}>
                    <div className="output-code">{JSON.stringify(result.config, null, 2)}</div>
                  </div>
                </div>

                <div className="btn-row" style={{ marginTop: "24px" }}>
                  <button className={`btn ${copied ? "btn-success" : "btn-secondary"}`} onClick={handleCopy}>
                    {copied ? "✓ کپی شد!" : "کپی JSON"}
                  </button>
                  <button className="btn btn-primary" onClick={handleDownload}>
                    📥 دانلود فایل
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderView = () => {
    switch (currentView) {
      case "landing":
        return <Landing onStart={() => setCurrentView("dashboard")} />;
      case "dashboard":
        return <Dashboard onNavigate={(view) => setCurrentView(view)} />;
      case "netlify":
        return <NetlifyBuilder onBack={() => setCurrentView("dashboard")} />;
      case "github":
        return <GithubBuilder onBack={() => setCurrentView("dashboard")} />;
      case "vercel":
        return <VercelBuilder onBack={() => setCurrentView("dashboard")} />;
      case "coming_soon":
        return (
          <div className="coming-soon-view">
            <h2>🚧 به زودی...</h2>
            <p style={{ marginBottom: "24px", color: "#8ab8a8" }}>این ابزار در نسخه‌های بعدی در دسترس خواهد بود.</p>
            <button className="btn btn-secondary" onClick={() => setCurrentView("dashboard")}>بازگشت به پیشخوان</button>
          </div>
        );
      default:
        return renderBalancerView();
    }
  };

  return (
    <div className="full-screen-container">
      <button className="menu-toggle" onClick={() => setIsSidebarOpen(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <div className={`sidebar-overlay ${isSidebarOpen ? "open" : ""}`} onClick={() => setIsSidebarOpen(false)}></div>
      <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <button className="sidebar-close" onClick={() => setIsSidebarOpen(false)}>✕</button>
        <div className="sidebar-content">
          <h3>منوی دسترسی</h3>
          <ul className="sidebar-links">
            <li><a href="#" onClick={(e) => { e.preventDefault(); setCurrentView("landing"); setIsSidebarOpen(false); }}>🏠 معرفی (خانه)</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); setCurrentView("dashboard"); setIsSidebarOpen(false); }}>🗂️ پیشخوان ابزارها</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); setCurrentView("app"); setIsSidebarOpen(false); }}>⚡ مبدل Equilibrium X</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); setCurrentView("coming_soon"); setIsSidebarOpen(false); }}>📖 آموزش‌ها</a></li>
          </ul>
        </div>
      </div>

      {renderView()}

      <div className="badges-container">
        <a 
          href="https://github.com/ashah404" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="github-badge"
          onClick={handleGithubClick}
        >
          <svg viewBox="0 0 24 24">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
          </svg>
          <span>GitHub / ashah404</span>
        </a>
        <div className="version-badge">
          <span>v1.0.0</span>
        </div>
      </div>
    </div>
  );
}
