const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const rootDir = __dirname;
const zipPath = path.join(rootDir, 'Equilibrium-X-Source-And-Release.zip');

// Clean up old zip if exists
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

const zip = new AdmZip();

function addFilesRecursively(dir, relativePath = '') {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const itemRelative = relativePath ? path.join(relativePath, item) : item;
    
    // Normalize path separators to forward slashes for matching
    const normalizedRelative = itemRelative.replace(/\\/g, '/');

    // Exclude patterns
    if (
      normalizedRelative.startsWith('node_modules') || 
      normalizedRelative.startsWith('.git') || 
      normalizedRelative.startsWith('.gemini') || 
      normalizedRelative.startsWith('Equilibrium-X-Source-And-Release.zip') ||
      normalizedRelative.startsWith('zip-project.cjs') ||
      normalizedRelative.startsWith('release/win-unpacked') ||
      normalizedRelative.endsWith('.blockmap') ||
      normalizedRelative.endsWith('builder-debug.yml')
    ) {
      continue;
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      addFilesRecursively(fullPath, itemRelative);
    } else {
      // For files, zipPath is the destination folder inside the zip.
      // E.g., if relativePath is 'src/utils', we want to place it in 'src/utils' folder.
      const zipDestDir = relativePath ? relativePath.replace(/\\/g, '/') : '';
      zip.addLocalFile(fullPath, zipDestDir);
    }
  }
}

console.log('Starting zipping project source & release...');
try {
  addFilesRecursively(rootDir);
  zip.writeZip(zipPath);
  console.log('Zipping completed successfully.');
  console.log('Saved to:', zipPath);
} catch (err) {
  console.error('Error zipping project:', err);
  process.exit(1);
}
