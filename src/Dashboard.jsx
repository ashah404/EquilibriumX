import React from 'react';

export default function Dashboard({ onNavigate }) {
  
  const tools = [
    { id: 'netlify', title: 'ساخت کانفیگ Netlify', icon: '🌐', type: 'build', status: 'active', description: 'ایجاد سریع Worker برای متد نتلیفای' },
    { id: 'vercel', title: 'ساخت کانفیگ Vercel', icon: '🔺', type: 'build', status: 'active', description: 'ایجاد کانفیگ مبتنی بر Vercel' },
    { id: 'github', title: 'ساخت کانفیگ GitHub', icon: '🐙', type: 'build', status: 'active', description: 'ایجاد کانفیگ مبتنی بر GitHub Pages' },
    { id: 'balancer', title: 'مبدل Equilibrium X', icon: '⚖️', type: 'tool', status: 'active', description: 'تبدیل کانفیگ‌های ساخته شده به ساختار پیشرفته لود بالانسر' },
  ];

  const tutorials = [
    { id: 'tut_netlify', title: 'آموزش ساخت متد نتلیفای', icon: '📺' },
    { id: 'tut_vercel', title: 'آموزش ساخت متد ورسل', icon: '📺' },
    { id: 'tut_github', title: 'آموزش ساخت متد گیتهاب', icon: '📺' },
    { id: 'tut_azure', title: 'آموزش ساخت متد آژور', icon: '📺' },
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>پیشخوان ابزارها</h2>
        <p>ابزار یا آموزش مورد نظر خود را برای ادامه انتخاب کنید</p>
      </div>

      <div className="dashboard-section">
        <h3 className="section-title">🛠️ ابزارهای ساخت و شبکه</h3>
        <div className="dashboard-grid">
          {tools.map((tool) => (
            <div 
              key={tool.id} 
              className={`dashboard-card ${tool.status === 'active' ? 'active-card' : 'disabled-card'}`}
              onClick={() => onNavigate(tool.status === 'active' ? (tool.id === 'balancer' ? 'app' : tool.id) : 'coming_soon')}
            >
              <div className="card-icon-large">{tool.icon}</div>
              <h4>{tool.title}</h4>
              {tool.description && <p className="card-desc">{tool.description}</p>}
              {tool.status === 'active' ? (
                <span className="card-badge success">ورود به ابزار ➔</span>
              ) : (
                <span className="card-badge warning">به زودی...</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-section" style={{marginTop: "48px"}}>
        <h3 className="section-title">📖 آموزش‌ها و مستندات</h3>
        <div className="dashboard-grid tutorial-grid">
          {tutorials.map((tut) => (
            <div 
              key={tut.id} 
              className="dashboard-card disabled-card tutorial-card"
              onClick={() => onNavigate('coming_soon')}
            >
              <div className="card-icon-large">{tut.icon}</div>
              <h4>{tut.title}</h4>
              <span className="card-badge warning">در حال آماده‌سازی</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
