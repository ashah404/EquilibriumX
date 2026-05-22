import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function ConfigTester({ configs, buttonText = "🧪 تست کانفیگ‌ها", buttonClassName = "btn btn-secondary" }) {
  const [showTestModal, setShowTestModal] = useState(false);
  const [xrayStatus, setXrayStatus] = useState({ status: 'idle', message: 'آماده‌سازی لایه دسکتاپ...' });
  const [testResults, setTestResults] = useState({});
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [batchSize, setBatchSize] = useState(5);
  const stopTestingRef = useRef(false);

  // Normalize configs to an array of non-empty strings
  const configsArray = React.useMemo(() => {
    if (!configs) return [];
    if (Array.isArray(configs)) {
      return configs.filter(c => c && c.trim());
    }
    if (typeof configs === 'string') {
      return configs.split('\n').filter(c => c && c.trim());
    }
    return [];
  }, [configs]);

  // IPC communication for Electron
  let ipcRenderer = null;
  try {
    if (typeof window !== 'undefined' && typeof window.require !== 'undefined') {
      const electron = window['require']('electron');
      ipcRenderer = electron ? electron.ipcRenderer : null;
    }
  } catch (e) {
    console.warn('Not in Electron environment or require failed:', e);
  }

  useEffect(() => {
    if (showTestModal && ipcRenderer) {
      // Listen for download status updates
      const handleStatus = (event, data) => {
        setXrayStatus(data);
      };
      ipcRenderer.on('xray-status', handleStatus);
      
      // Trigger check
      ipcRenderer.invoke('check-xray').then(ready => {
        if (!ready) setXrayStatus({ status: 'error', message: 'خطا در بارگذاری هسته Xray' });
      });

      return () => {
        ipcRenderer.removeListener('xray-status', handleStatus);
      };
    } else if (showTestModal && !ipcRenderer) {
      setXrayStatus({ status: 'error', message: 'این قابلیت فقط در نسخه دسکتاپ (Electron) در دسترس است.' });
    }
  }, [showTestModal]);

  const handleTestPing = async (config, index) => {
    setTestResults(prev => ({ ...prev, [index]: { status: 'testing' } }));
    try {
      const result = await ipcRenderer.invoke('test-ping', config);
      setTestResults(prev => ({ ...prev, [index]: result }));
    } catch (err) {
      setTestResults(prev => ({ ...prev, [index]: { success: false, error: 'IPC Error' } }));
    }
  };

  const handleTestAll = async () => {
    if (!ipcRenderer || configsArray.length === 0) return;
    setIsTestingAll(true);
    stopTestingRef.current = false;

    // Process in batches
    for (let i = 0; i < configsArray.length; i += batchSize) {
      if (!showTestModal || stopTestingRef.current) break;

      const batch = configsArray.slice(i, i + batchSize);

      // Mark batch as testing
      const testingState = {};
      batch.forEach((_, idx) => testingState[i + idx] = { status: 'testing' });
      setTestResults(prev => ({ ...prev, ...testingState }));

      // Run batch concurrently (each spawns its own xray)
      await Promise.all(batch.map((cfg, idx) => handleTestPing(cfg, i + idx)));
    }
    setIsTestingAll(false);
  };

  const handleStopTest = () => {
    stopTestingRef.current = true;
    setIsTestingAll(false);
  };

  // Calculations for stats
  const total = configsArray.length;
  let testedCount = 0;
  let successCount = 0;
  let failCount = 0;
  let totalPing = 0;

  for (let i = 0; i < total; i++) {
    const res = testResults[i];
    if (res && res.status !== 'testing') {
      testedCount++;
      if (res.success) {
        successCount++;
        totalPing += res.ping;
      } else {
        failCount++;
      }
    }
  }

  const avgPing = successCount > 0 ? Math.round(totalPing / successCount) : 0;
  const progressPercent = total > 0 ? Math.round((testedCount / total) * 100) : 0;

  return (
    <>
      <button
        className={buttonClassName}
        onClick={() => setShowTestModal(true)}
        disabled={total === 0}
      >
        {buttonText}
      </button>

      {showTestModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowTestModal(false)}>
          <div 
            className="modal-content test-dashboard-modal" 
            onClick={e => e.stopPropagation()} 
            style={{ width: '95%', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}
          >
            <button className="modal-close" onClick={() => setShowTestModal(false)}>×</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', background: 'rgba(255,255,255,0.03)', padding: '14px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '22px' }}>🧪</span>
              <h2 style={{ color: '#fff', margin: 0, fontSize: '18px', fontWeight: 600 }}>مانیتورینگ وضعیت کانفیگ‌ها</h2>
            </div>

            {xrayStatus.status !== 'ready' ? (
              <div className="empty-state" style={{ margin: '30px 0' }}>
                <div className="icon">{xrayStatus.status === 'error' ? '❌' : '⏳'}</div>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.6', marginTop: '16px' }}>
                  {xrayStatus.message}
                </p>
                {xrayStatus.status === 'downloading' && (
                  <p style={{ fontSize: '12px', color: '#00ffb3', marginTop: '8px' }}>
                    لطفاً شکیبا باشید. اینترنت شما برای دانلود از GitHub استفاده می‌شود.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="dashboard-stats">
                  <div className="stat-badge">
                    <span className="stat-value" style={{ color: '#00d2ff' }}>{total}</span>
                    <span className="stat-label">کل کانفیگ‌ها</span>
                  </div>
                  <div className="stat-badge">
                    <span className="stat-value" style={{ color: '#34c759' }}>{successCount}</span>
                    <span className="stat-label">متصل شده</span>
                  </div>
                  <div className="stat-badge">
                    <span className="stat-value" style={{ color: '#ff453a' }}>{failCount}</span>
                    <span className="stat-label">خطا / تایم‌اوت</span>
                  </div>
                  <div className="stat-badge">
                    <span className="stat-value" style={{ color: '#ffcc00' }}>{avgPing > 0 ? `${avgPing}ms` : '---'}</span>
                    <span className="stat-label">میانگین پینگ</span>
                  </div>
                </div>

                {isTestingAll && (
                  <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                )}

                <div className="test-control-bar">
                  <div className="control-group">
                    <label>هم‌زمانی:</label>
                    <input
                      type="number"
                      min="1"
                      value={batchSize}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val > 0) setBatchSize(val);
                        else if (e.target.value === "") setBatchSize("");
                      }}
                      onBlur={() => { if (batchSize === "" || batchSize < 1) setBatchSize(1); }}
                      disabled={isTestingAll}
                    />

                    {!isTestingAll ? (
                      <button className="btn-test-start" onClick={handleTestAll}>
                        ⚡ شروع تست
                      </button>
                    ) : (
                      <button className="btn-test-stop" onClick={handleStopTest}>
                        ⏹ توقف
                      </button>
                    )}
                  </div>

                  <button
                    className="btn-download-success"
                    disabled={successCount === 0}
                    onClick={() => {
                      const successConfigs = configsArray.filter((_, idx) => testResults[idx]?.success);
                      const sorted = successConfigs
                        .map(cfg => ({ cfg, ping: testResults[configsArray.indexOf(cfg)]?.ping || 9999 }))
                        .sort((a, b) => a.ping - b.ping)
                        .map(x => x.cfg);
                      const blob = new Blob([sorted.join('\n')], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `working-configs-${successCount}.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    ⬇ دانلود موفق‌ها ({successCount})
                  </button>
                </div>

                <div className="configs-grid" style={{ flex: 1, overflowY: 'auto' }}>
                  {(() => {
                    const configObjects = configsArray.map((cfg, originalIdx) => ({
                      cfg,
                      originalIdx,
                      res: testResults[originalIdx]
                    }));

                    configObjects.sort((a, b) => {
                      const resA = a.res;
                      const resB = b.res;

                      if (resA?.success && resB?.success) return resA.ping - resB.ping;
                      if (resA?.success && !resB?.success) return -1;
                      if (!resA?.success && resB?.success) return 1;
                      if (resA?.status === 'testing' && resB?.status !== 'testing') return -1;
                      if (resA?.status !== 'testing' && resB?.status === 'testing') return 1;

                      const aFailed = resA && !resA.success && resA.status !== 'testing';
                      const bFailed = resB && !resB.success && resB.status !== 'testing';
                      if (aFailed && !bFailed) return 1;
                      if (!aFailed && bFailed) return -1;

                      return a.originalIdx - b.originalIdx;
                    });

                    return configObjects.map(({ cfg, originalIdx, res }) => {
                      let name = "Config";
                      let hostname = "";
                      try {
                        const parsed = new URL(cfg);
                        name = decodeURIComponent(parsed.hash.substring(1)) || "Config";
                        hostname = parsed.hostname;
                      } catch (e) {}

                      let pillClass = 'idle';
                      let pingText = '---';

                      if (res?.status === 'testing') {
                        pillClass = 'testing';
                        pingText = 'در حال تست...';
                      } else if (res?.success) {
                        pillClass = 'success';
                        pingText = `${res.ping} ms`;
                      } else if (res && !res.success) {
                        pillClass = 'error';
                        pingText = res.error;
                      }

                      return (
                        <div key={originalIdx} className="config-card">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', overflow: 'hidden', flex: 1 }}>
                            <div className={`status-dot ${pillClass}`}></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                              <span style={{ color: '#fff', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                {name}
                              </span>
                              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
                                {hostname}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                            <div className={`ping-pill ${pillClass}`}>
                              {pingText}
                            </div>

                            <button
                              className="btn-retest"
                              onClick={() => handleTestPing(cfg, originalIdx)}
                              disabled={res?.status === 'testing' || isTestingAll}
                            >
                              تست
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
