const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const execFileAsync = promisify(execFile);

const ffmpeg = process.env.FFMPEG_PATH;
const commandTemplate = process.env.FFMPEG_COMMAND;
const thumbCommandTemplate = process.env.FFMPEG_THUMBNAIL_COMMAND;
const intro = process.env.FFMPEG_INTRO;
const outro = process.env.FFMPEG_OUTRO;

const outputDir = process.env.OUTPUT_DIR;
const thumbDir = process.env.THUMBNAIL_DIR;
const metaDir = process.env.META_DIR;

const dbFile = path.join(metaDir, 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { files: [] });

async function processFile(inputPath) {
  const base = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(outputDir, base + '.mp4');
  const thumbPath = path.join(thumbDir, base + '.png');

  // 1. Generate thumbnail
  const thumbCmd = thumbCommandTemplate
    .replace('{FFMPEG_INPUT}', inputPath)
    .replace('{FFMPEG_THUMBNAIL}', thumbPath);

  console.log('[Processor] Generating thumbnail...');
  await execFileAsync(ffmpeg, parseArgs(thumbCmd));

  // 2. Merge intro + main + outro with progress
  const mergeCmd = commandTemplate
    .replace('{FFMPEG_INTRO}', intro)
    .replace('{FFMPEG_INPUT}', inputPath)
    .replace('{FFMPEG_OUTRO}', outro)
    .replace('{FFMPEG_OUTPUT}', outputPath);

  console.log('[Processor] Merging video with FFmpeg...');
  await runFfmpegWithProgress(ffmpeg, parseArgs(mergeCmd), (progress) => {
    process.stdout.write(`\r[Processor] FFmpeg progress: ${progress}%   `);
  });

  // 3. Prepare metadata object
  const metadata = {
    id: base, // unique key
    filename: path.basename(outputPath),
    thumbnail: path.basename(thumbPath),
    original: path.basename(inputPath),
    outputPath,
    thumbnailPath: thumbPath,
    processedAt: new Date().toISOString(),
    duration: await getVideoDuration(outputPath)
  };

  // 4. Persist metadata (overwrite if id exists)
  await db.read();
  const index = db.data.files.findIndex(f => f.id === base);
  if (index !== -1) {
    db.data.files[index] = metadata;
    console.log('[Processor] Overwrote existing metadata entry');
  } else {
    db.data.files.push(metadata);
    console.log('[Processor] Added new metadata entry');
  }
  await db.write();

  // 5. Delete original
  fs.unlinkSync(inputPath);
  console.log('\n[Processor] Deleted original file:', inputPath);

  return metadata;
}

function parseArgs(cmd) {
  return cmd.match(/(?:[^\s"]+|"[^"]*")+/g).map(s => s.replace(/"/g, ''));
}

async function getVideoDuration(filePath) {
  const probeCmd = [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath
  ];
  try {
    const ffprobe = ffmpeg.replace(/ffmpeg(\.exe)?$/, 'ffprobe');
    const { stdout } = await execFileAsync(ffprobe, probeCmd);
    return parseFloat(stdout.trim());
  } catch (err) {
    console.warn('[Processor] Could not get duration:', err.message);
    return null;
  }
}

async function getVideoDurationFromInputs(args) {
  const inputFiles = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-i' && args[i + 1]) {
      inputFiles.push(args[i + 1]);
    }
  }

  let total = 0;
  for (const file of inputFiles) {
    const dur = await getVideoDuration(file);
    if (dur) total += dur;
  }
  return total;
}

async function runFfmpegWithProgress(ffmpegPath, args, onProgress) {
  const totalDuration = await getVideoDurationFromInputs(args);
  return new Promise((resolve, reject) => {
    const proc = execFile(ffmpegPath, args);

    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (data) => {
      const lines = data.trim().split(/\r?\n/);
      for (const line of lines) {
        const [key, value] = line.split('=');
        if (key === 'out_time_ms') {
          const outTimeSec = parseInt(value) / 1_000_000;
          const percent = totalDuration > 0
            ? Math.min(100, Math.round((outTimeSec / totalDuration) * 100))
            : 0;
          onProgress(percent);
        }
      }
    });

    proc.stderr.on('data', () => {}); // optional: suppress output

    proc.on('exit', (code) => {
      onProgress(100); // force 100% at end
      process.stdout.write('\n');
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });
  });
}

module.exports = { processFile };
