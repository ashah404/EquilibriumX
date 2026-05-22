const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { ensureXrayExists } = require('./download-xray.cjs');
const { testSingleConfig } = require('./tester.cjs');

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    // Removes default Windows frame to look more like a custom app (optional)
    // frame: false, 
    // titleBarStyle: 'hidden',
    backgroundColor: '#050811',
    show: false // Wait until ready-to-show to prevent visual flash
  });

  // Load the React app
  if (isDev) {
    win.loadURL('http://localhost:5173');
    // win.webContents.openDevTools(); // Open DevTools by default in dev
  } else {
    // In production, load the built index.html
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  win.once('ready-to-show', () => {
    win.show();
  });
}

app.whenReady().then(() => {
  createWindow();

  // IPC Handlers
  ipcMain.handle('check-xray', async (event) => {
    return await ensureXrayExists(event.sender);
  });

  ipcMain.handle('test-ping', async (event, vlessConfig) => {
    return await testSingleConfig(vlessConfig);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
