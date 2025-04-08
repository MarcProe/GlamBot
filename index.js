require('dotenv').config();
const { getNextFile } = require('./modules/driveWatcher');
const { processFile } = require('./modules/processor');

const intervalMs = parseInt(process.env.WATCH_INTERVAL_MS || '5000', 10);
let isProcessing = false;

console.log('[GlamBot] Starting polling loop...');

async function poll() {
  if (isProcessing) {
    return;
  }

  const filePath = getNextFile();
  if (!filePath) {
    return;
  }

  isProcessing = true;
  console.log(`[GlamBot] Found file: ${filePath}`);

  try {
    const metadata = await processFile(filePath);
    console.log(`[GlamBot] Finished processing: ${metadata.outputPath}`);
  } catch (err) {
    console.error('[GlamBot] Error:', err);
  } finally {
    isProcessing = false;
  }
}

setInterval(poll, intervalMs);
