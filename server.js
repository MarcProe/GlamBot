const express = require('express');
const path = require('path');
const fs = require('fs');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Read paths from .env
const thumbDir = process.env.THUMBNAIL_DIR || 'thumbnails';
const outputDir = process.env.OUTPUT_DIR || 'output';
const metaDir = process.env.META_DIR || 'meta';
const dbFile = path.join(metaDir, 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { files: [] });

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files
app.use('/thumbnails', express.static(path.resolve(thumbDir)));
app.use('/output', express.static(path.resolve(outputDir)));
app.use(express.static('public'));

// API route for file list (sorted by youngest first)
app.get('/api/files', async (req, res) => {
  await db.read();
  const sortedFiles = db.data.files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sortedFiles);
});

// API to update the email address
app.post('/api/update-email/:id', async (req, res) => {
  const { id } = req.params;
  const { email } = req.body;

  await db.read();
  const fileIndex = db.data.files.findIndex(f => f.id === id);
  
  if (fileIndex === -1) return res.status(404).json({ error: 'File not found' });

  // Update email in database
  db.data.files[fileIndex].email = email;
  db.data.files[fileIndex].processed = false; // Mark as not yet processed
  await db.write();

  res.json({ success: true });
});

// API route to get the last modified timestamp of the db
app.get('/api/last-change', (req, res) => {
  try {
    const stat = fs.statSync(dbFile);
    res.json({ lastModified: stat.mtime.toISOString() });
  } catch (e) {
    res.status(500).json({ error: 'Could not read DB file' });
  }
});

// DELETE route to remove processed file, thumbnail, and DB entry
app.delete('/api/delete/:id', async (req, res) => {
  const id = req.params.id;
  await db.read();
  const index = db.data.files.findIndex(f => f.id === id);
  if (index === -1) return res.status(404).json({ error: 'File not found' });

  const file = db.data.files[index];
  try {
    if (fs.existsSync(file.outputPath)) fs.unlinkSync(file.outputPath);
    const thumbPath = path.join(thumbDir, file.thumbnail);
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    db.data.files.splice(index, 1);
    await db.write();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

// POST route to reset an entry (remove email and set processed to false)
app.post('/api/reset-entry/:id', async (req, res) => {
  const fileId = req.params.id;

  await db.read();
  const file = db.data.files.find(f => f.id === fileId);

  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Reset the email and set processed to false
  file.email = null;
  file.processed = null;

  await db.write();
  res.json({ success: `File ${file.filename} has been reset.` });
});

// Start the server
app.listen(PORT, () => {
  console.log(`[Server] Web interface available at http://localhost:${PORT}`);
});
