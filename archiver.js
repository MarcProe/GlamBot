const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const ignore = require("ignore");

const OUTPUT_ZIP = "project.zip"; // Ziel-Dateiname
const BASE_DIR = process.cwd();   // Aktuelles Arbeitsverzeichnis

// .gitignore einlesen
const gitignorePath = path.join(BASE_DIR, ".gitignore");
const gitignoreContent = fs.existsSync(gitignorePath)
  ? fs.readFileSync(gitignorePath, "utf8")
  : "";

const ig = ignore().add(gitignoreContent).add(".git"); // .git immer ignorieren

// Dateien rekursiv einsammeln, unter Beachtung von .gitignore
function walkDir(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(BASE_DIR, fullPath);

    if (ig.ignores(relPath)) continue;

    if (entry.isDirectory()) {
      walkDir(fullPath, fileList);
    } else if (entry.isFile()) {
      fileList.push({ fullPath, relPath });
    }
  }

  return fileList;
}

// Projekt zippen
function zipProject() {
  const output = fs.createWriteStream(OUTPUT_ZIP);
  const archive = archiver("zip", { zlib: { level: 9 } });

  output.on("close", () => {
    console.log(`✅ ZIP-Datei erstellt: ${OUTPUT_ZIP} (${archive.pointer()} Bytes)`);
  });

  archive.on("error", err => {
    throw err;
  });

  archive.pipe(output);

  const files = walkDir(BASE_DIR);
  for (const file of files) {
    archive.file(file.fullPath, { name: file.relPath });
  }

  archive.finalize();
}

zipProject();
