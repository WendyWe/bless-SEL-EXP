const fs = require("fs");
const path = require("path");
const https = require("https");

// 修正路徑：腳本在 scripts/，所以 .. 是根目錄
const VIDEO_DIR = path.join(__dirname, "..", "videos");
const MANIFEST = path.join(__dirname, "..", "video_manifest.csv");

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // 處理 Google Drive 的重新導向 (301, 302, 303)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }

      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
    }).on("error", (err) => {
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

// main 函數保持不變，但記得檢查 path 是否正確
async function main() {
  if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });
  if (!fs.existsSync(MANIFEST)) throw new Error(`Manifest not found at: ${MANIFEST}`);

  const lines = fs.readFileSync(MANIFEST, "utf8").trim().split("\n");
  const rows = lines.slice(1);

  for (const row of rows) {
    if (!row.trim()) continue;
    const [filename, driveFileId] = row.split(",").map((s) => s.trim());
    const out = path.join(VIDEO_DIR, filename);

    if (fs.existsSync(out)) {
      console.log(`Skip (exists): ${filename}`);
      continue;
    }

    const url = `https://drive.google.com/uc?export=download&id=${driveFileId}`;
    console.log(`Downloading: ${filename} from Drive...`);
    try {
      await download(url, out);
      console.log(`Saved: ${filename}`);
    } catch (e) {
      console.error(`Failed to download ${filename}:`, e.message);
    }
  }
}

main().catch((e) => {
  console.error("Download process failed:", e.message);
  process.exit(1);
});
