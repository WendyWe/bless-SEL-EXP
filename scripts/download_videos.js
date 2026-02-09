const fs = require("fs");
const path = require("path");
const https = require("https");

const VIDEO_DIR = path.join(__dirname, "..", "videos");
const MANIFEST = path.join(__dirname, "..", "video_manifest.csv");

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", (err) => {
        fs.unlink(dest, () => reject(err));
      });
  });
}

async function main() {
  if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });

  if (!fs.existsSync(MANIFEST)) {
    throw new Error("video_manifest.csv not found at repo root");
  }

  const lines = fs.readFileSync(MANIFEST, "utf8").trim().split("\n");
  const rows = lines.slice(1); // skip header

  for (const row of rows) {
    if (!row.trim()) continue;
    const [filename, driveFileId] = row.split(",").map((s) => s.trim());
    const out = path.join(VIDEO_DIR, filename);
    if (fs.existsSync(out)) {
      console.log(`Skip (exists): ${filename}`);
      continue;
    }

    // 直連下載（注意：若你的 Drive 檔案不是「任何知道連結的人可檢視」，會失敗）
    const url = `https://drive.google.com/uc?export=download&id=${driveFileId}`;
    console.log(`Downloading: ${filename}`);
    await download(url, out);
    console.log(`Saved: ${out}`);
  }
}

main().catch((e) => {
  console.error("Download videos failed:", e.message);
  process.exit(1);
});
