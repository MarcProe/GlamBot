const fs = require('fs');
const path = require('path');

const DRIVE_LETTER = process.env.WATCH_DRIVE || 'E:';
const SUBPATH = process.env.WATCH_INPUT_SUBPATH || '';

function driveExists() {
  return fs.existsSync(DRIVE_LETTER + '\\');
}

function getNextFile() {
  if (!driveExists()) {
    process.stdout.write('.');
    return null;
  }

  const inputDir = path.join(DRIVE_LETTER + '\\', SUBPATH);
  if (!fs.existsSync(inputDir)) {
    process.stdout.write('.');
    return null;
  }

  const files = fs.readdirSync(inputDir).filter(f =>
    f.toLowerCase().endsWith('.mp4')
  );

  if (files.length === 0) {
    process.stdout.write('.');
    return null;
  }

  const selected = path.join(inputDir, files[0]);
  console.log(`\n[DriveWatcher] Found file: ${selected}`);
  return selected;
}

module.exports = { getNextFile };
