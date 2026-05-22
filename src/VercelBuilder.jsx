import React, { useState } from "react";

export default function VercelBuilder({ onBack }) {
  const [outputConfigs, setOutputConfigs] = useState("");

  return (
    <div className="converter-layout">
      <div className="top-glow-app"></div>

      <div className="converter-header">
        <div className="badge premium-badge">🔺 Vercel</div>
        <h1>ساخت کانفیگ <span>Vercel</span></h1>
        <p>کانفیگ‌های VLESS مبتنی بر Vercel را به صورت خودکار بسازید</p>
      </div>

      <div className="converter-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '800px', margin: '0 auto' }}>
        <div className="converter-panel glass-panel">
          <div className="panel-header">
            <span className="panel-icon">⚙️</span>
            <h3>تنظیمات Vercel</h3>
          </div>
          <div className="panel-content">

            <div className="empty-state" style={{ margin: '40px 0' }}>
              <div className="icon">🔺</div>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', lineHeight: '1.8', marginTop: '16px' }}>
                این ابزار در حال آماده‌سازی است.
              </p>
            </div>

            <div className="btn-row" style={{ marginTop: "auto", paddingTop: "24px" }}>
              <button className="btn btn-secondary" onClick={onBack}>
                ➔ بازگشت
              </button>
              <button className="btn btn-primary glow-effect" disabled>
                ⚡ تولید کانفیگ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
