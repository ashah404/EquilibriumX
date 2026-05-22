import React, { useState } from 'react';

export default function Landing({ onStart }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    // Calculate rotation angles based on mouse position
    const x = (e.clientX / window.innerWidth - 0.5) * 30; // Max rotation 15deg
    const y = (e.clientY / window.innerHeight - 0.5) * -30;
    setMousePos({ x, y });
  };

  return (
    <div className="landing-page" onMouseMove={handleMouseMove}>
      <div className="landing-layout">
        
        {/* Left Side: Content */}
        <div 
          className="landing-content-split"
          style={{ 
            transform: `perspective(1200px) rotateY(${mousePos.x * 0.15}deg) rotateX(${mousePos.y * 0.15}deg)` 
          }}
        >
          <div className="badge landing-badge">ابزار جامع اینترنت آزاد</div>
          <h1 className="landing-title" style={{fontSize: "50px"}}>
            پلتفرم ساخت تونل و<br/><span>فرار از فیلترینگ</span>
          </h1>
          <p className="landing-description">
            جعبه‌ابزاری قدرتمند و همه‌کاره برای ساخت VPN شخصی از طریق سرورهای ابری (Vercel, Netlify, GitHub)، تولید و مدیریت کانفیگ، و ادغام آن‌ها در یک لود بالانسر پیشرفته.
          </p>
          
          <div className="landing-features-split">
            <div className="feature-item">
              <span className="feature-icon-small">☁️</span>
              <div>
                <h4>ایجاد VPN ابری</h4>
                <p>راه‌اندازی سرور اختصاصی رایگان روی پلتفرم‌های ابری</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon-small">⚙️</span>
              <div>
                <h4>تولید کانفیگ شخصی</h4>
                <p>ساخت حرفه‌ای انواع کانفیگ‌های مدرن با بالاترین امنیت</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon-small">⚖️</span>
              <div>
                <h4>لود بالانسر هوشمند</h4>
                <p>ترکیب ده‌ها لینک در Xray برای رسیدن به پایداری ۱۰۰٪</p>
              </div>
            </div>
          </div>

          <button className="btn btn-primary cta-btn glow-effect" onClick={onStart}>
            ورود به ابزارها
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: "8px", transform: "rotate(180deg)"}}>
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>

        {/* Right Side: Interactive Visual */}
        <div className="landing-visual">
          <div 
            className="visual-wrapper" 
            style={{ 
              transform: `perspective(1200px) rotateY(${mousePos.x}deg) rotateX(${mousePos.y}deg)` 
            }}
          >
            <img src="./tunnel_abstract.png" alt="Tunnel Abstract" className="floating-image" style={{boxShadow: "0 30px 60px rgba(0, 140, 255, 0.4)", border: "1px solid rgba(0, 140, 255, 0.2)"}} />
            
            {/* Floating Glass Cards */}
            <div 
              className="glass-card overlay-card-1"
              style={{ transform: `translateZ(60px) translateX(${mousePos.x * -0.5}px)` }}
            >
              <span className="card-icon">🛡️</span> 
              <div>
                <strong>دور زدن فایروال</strong>
                <span>تونل‌زنی امن و قدرتمند</span>
              </div>
            </div>

            <div 
              className="glass-card overlay-card-2"
              style={{ transform: `translateZ(40px) translateX(${mousePos.x * 0.5}px)` }}
            >
              <span className="card-icon">⚡</span> 
              <div>
                <strong>اتصال پایدار</strong>
                <span>ترکیب استراتژیک سرورها</span>
              </div>
            </div>
          </div>
        </div>

      </div>
      
      {/* Decorative Background Elements */}
      <div 
        className="glow-blob top-glow" 
        style={{ transform: `translate(${mousePos.x * 1.5}px, ${-mousePos.y * 1.5}px)` }}
      ></div>
      <div 
        className="glow-blob bottom-glow" 
        style={{ transform: `translate(${-mousePos.x * 1.5}px, ${mousePos.y * 1.5}px)` }}
      ></div>
    </div>
  );
}
