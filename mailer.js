const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
require('dotenv').config();

// Setup database
const metaDir = process.env.META_DIR;
const dbFile = path.join(metaDir, 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { files: [] });

// Setup mail transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT == 465, // True for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Function to send email
async function sendMail(entry) {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: entry.email,
    subject: process.env.MAIL_SUBJECT.replace("{filename}", entry.filename),
    text: process.env.MAIL_BODY,
    attachments: [
      {
        filename: entry.filename,
        path: path.join(process.env.OUTPUT_DIR, entry.filename)  // The path to the file
      }
    ]
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${entry.email}`);
  } catch (error) {
    console.error(`Error sending email to ${entry.email}:`, error);
  }
}

// Function to update entry status and delete file
async function processEntry(entry) {
  // Update the processed status
  entry.processed = true;
  await db.write();

  // Delete the file (but not the thumbnail)
  const filePath = path.join(process.env.OUTPUT_DIR, entry.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`Deleted file: ${entry.filename}`);
  }

  // Don't delete the thumbnail (already handled)
  // Add any other necessary cleanup here if required
}

// Main loop to check for unprocessed entries
async function mailLoop() {
  while (true) {
    await db.read();
    const entry = db.data.files.find(f => f.processed === false); // Find the first unprocessed entry
    if (entry) {
      console.log(`\nProcessing entry: ${entry.filename}`);
      await sendMail(entry);
      await processEntry(entry);
    } else {
        process.stdout.write('.');
    }
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds before checking again
  }
}

// Start the mail loop
mailLoop();
