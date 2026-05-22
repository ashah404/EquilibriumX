const fs = require('fs');
const path = require('path');
const https = require('https');
const AdmZip = require('adm-zip');

const { app } = require('electron');

const XRAY_VERSION = 'v26.5.9';
const XRAY_URL = `https://github.com/XTLS/Xray-core/releases/download/${XRAY_VERSION}/Xray-windows-64.zip`;
const BIN_DIR = app.isPackaged 
  ? path.join(app.getPath('userData'), 'bin')
  : path.join(__dirname, '..', 'bin');
const XRAY_EXE = path.join(BIN_DIR, 'xray.exe');

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    const request = (currentUrl) => {
      https.get(currentUrl, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          return request(response.headers.location);
        }
        
        if (response.statusCode !== 200) {
          fs.unlink(dest, () => {});
          return reject(new Error(`Failed to download: ${response.statusCode}`));
        }

        response.pipe(file);
        
        file.on('finish', () => {
          file.close(resolve);
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    };
    
    request(url);
  });
}

async function ensureXrayExists(webContents) {
  if (fs.existsSync(XRAY_EXE)) {
    webContents.send('xray-status', { status: 'ready', message: 'Xray Core is ready.' });
    return true;
  }

  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }

  const zipPath = path.join(BIN_DIR, 'xray.zip');
  
  try {
    webContents.send('xray-status', { status: 'downloading', message: `Downloading Xray-core ${XRAY_VERSION}...` });
    await downloadFile(XRAY_URL, zipPath);
    
    webContents.send('xray-status', { status: 'extracting', message: 'Extracting Xray-core...' });
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(BIN_DIR, true);
    
    fs.unlinkSync(zipPath); // Clean up
    
    webContents.send('xray-status', { status: 'ready', message: 'Xray Core downloaded and ready!' });
    return true;
  } catch (err) {
    console.error('Error downloading Xray:', err);
    webContents.send('xray-status', { status: 'error', message: `Failed to install Xray: ${err.message}` });
    return false;
  }
}

module.exports = { ensureXrayExists, XRAY_EXE };
