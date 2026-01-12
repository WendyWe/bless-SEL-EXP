/**
 * Express server configuration for BLESS application
 * Handles authentication, activity tracking, AI feedback, and daily educational content
 * ✅ Compatible with Render PostgreSQL + OpenAI + public static assets
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const { Pool } = require("pg");
const OpenAI = require("openai");
const fs = require("fs");

const app = express();
const port = process.env.PORT || 3000;

/* -------------------------------
   🧩 PostgreSQL (Render)
---------------------------------*/
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* 自動建立資料表（如果不存在） */
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        userid TEXT UNIQUE,
        password TEXT,
        group_label TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        login_time TIMESTAMP,
        period TEXT
      );
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type TEXT,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        duration REAL
      );
      CREATE TABLE IF NOT EXISTS avi_results (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        phase TEXT, 
        feature_type TEXT,                
        responses JSONB,           
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS daily_usage (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, date)
      );
      CREATE TABLE IF NOT EXISTS task_sequence_test (
        subject_id TEXT,
        trial INTEGER,
        task TEXT,
        PRIMARY KEY (subject_id, trial)
      );
      CREATE TABLE IF NOT EXISTS user_progress (
        user_id INTEGER UNIQUE REFERENCES users(id),
        current_trial INTEGER DEFAULT 1
      );
    `);
    console.log("✅ PostgreSQL connected & tables ready");
  } catch (err) {
    console.error("❌ Database initialization failed:", err);
  }
})();

/* -------------------------------
   ⚙️ Middleware (CORS + CSP)
---------------------------------*/
app.use(cors());
app.use(bodyParser.json());

app.use((req, res, next) => {
  const allowedConnectSrc = [
    "'self'",
    "https://bless-sel-exp.onrender.com",
    "https://api.openai.com"
  ];

  const allowedScriptSrc = ["'self'", "'unsafe-inline'"];
  const allowedStyleSrc = ["'self'", "'unsafe-inline'"];
  const allowedImgSrc = ["'self'", "data:"];
  const allowedFontSrc = ["'self'", "data:"];

  const csp =
    "default-src 'self'; " +
    "script-src " + allowedScriptSrc.join(" ") + "; " +
    "style-src " + allowedStyleSrc.join(" ") + "; " +
    "connect-src " + allowedConnectSrc.join(" ") + "; " +
    "img-src " + allowedImgSrc.join(" ") + "; " +
    "font-src " + allowedFontSrc.join(" ") + ";";

  res.setHeader("Content-Security-Policy", csp);
  next();
});


/* -------------------------------
   🤖 OpenAI Client
---------------------------------*/
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* -------------------------------
   👤 Login
---------------------------------*/
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await db.query(
      "SELECT * FROM users WHERE userid = $1",
      [username]
    );

    const user = result.rows[0];
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (user.password !== password) {
      return res.json({ success: false, message: "Invalid password" });
    }

    // 建立 session
    const loginTime = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Taipei",
    });
    const period = getTaipeiPeriod();

    const sessionInsert = await db.query(
      `INSERT INTO sessions (user_id, login_time, period)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [user.id, loginTime, period]
    );

    res.json({
      success: true,
      userId: user.userid,          // TEST001 → 前端用
      sessionId: sessionInsert.rows[0].id,
      loginTime,
      period,
      group: user.group_label
    });

  } catch (err) {
    console.error("❌ Login DB Error:", err);
    res.json({ success: false, message: "Database error" });
  }
});

app.get("/api/progress", async (req, res) => {
  const userId = req.query.userId;

  const userResult = await db.query(
    "SELECT id FROM users WHERE userid = $1",
    [userId]
  );
  const realId = userResult.rows[0].id;

  const prog = await db.query(
    "SELECT current_trial FROM user_progress WHERE user_id = $1",
    [realId]
  );

  if (prog.rows.length === 0) {
    // 第一次登入，自動建立
    await db.query(
      "INSERT INTO user_progress (user_id, current_trial) VALUES ($1, 1)",
      [realId]
    );
    return res.json({ trial: 1 });
  }

  res.json({ trial: prog.rows[0].current_trial });
});

app.post("/api/progress/update", async (req, res) => {
  const { userId, newTrial } = req.body;

  const userResult = await db.query(
    "SELECT id FROM users WHERE userid = $1",
    [userId]
  );
  const realId = userResult.rows[0].id;

  await db.query(
    "UPDATE user_progress SET current_trial = $1 WHERE user_id = $2",
    [newTrial, realId]
  );

  res.json({ success: true });
});



/* -------------------------------
   📊 Activity Tracking
---------------------------------*/
app.post("/api/activity/start", async (req, res) => {
  const { userId, featureType } = req.body; // userId = TEST001

  try {
    // 將 TEST001 → 找到真正的 users.id
    const userResult = await db.query(
      "SELECT id FROM users WHERE userid = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }

    const realId = userResult.rows[0].id;
    const taipeiTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" });

    const result = await db.query(
      `INSERT INTO activities (user_id, type, start_time)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [realId, featureType, taipeiTime]
    );

    res.json({ success: true, activityId: result.rows[0].id });

  } catch (err) {
    console.error("❌ Activity Save Error:", err);
    res.json({ success: false, message: err.message });
  }
});


app.post("/api/activity/end", async (req, res) => {
  const { activityId } = req.body;
  const taipeiTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" });

  try {
    await db.query(
      `UPDATE activities
       SET end_time = $1,
           duration = EXTRACT(EPOCH FROM ($1::timestamp - start_time)) / 60
       WHERE id = $2`,
      [taipeiTime, activityId]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("❌ Activity End Error:", err);
    res.json({ success: false, message: err.message });
  }
});



/* -------------------------------
   🧭 AVI 前後測儲存
---------------------------------*/
app.post("/api/avi/save", async (req, res) => {
  const { userId, phase, featureType, responses } = req.body; // userId = TEST001

  try {
    // 把 TEST001 → 查 user.id
    const userResult = await db.query(
      "SELECT id FROM users WHERE userid = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }

    const realId = userResult.rows[0].id;
    const time = new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" });

    await db.query(
      `INSERT INTO avi_results (user_id, phase, feature_type, responses, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [realId, phase, featureType, responses, time]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("❌ AVI Save Error:", err);
    res.json({ success: false, message: err.message });
  }
});



/* -------------------------------
   🔒 Check Daily Usage (一天一次限制)
---------------------------------*/
app.post("/api/daily/check", async (req, res) => {
  const { userId } = req.body;  // TEST001

  try {
    const userResult = await db.query(
      "SELECT id FROM users WHERE userid = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }

    const realId = userResult.rows[0].id;
    const today = new Date().toISOString().split("T")[0];

    const check = await db.query(
      "SELECT * FROM daily_usage WHERE user_id = $1 AND date = $2",
      [realId, today]
    );

    res.json({
      success: true,
      blocked: check.rows.length > 0
    });

  } catch (err) {
    console.error("❌ /api/daily/check Error:", err);
    res.json({ success: false, message: err.message });
  }
});



app.post("/api/daily/start", async (req, res) => {
  const { userId } = req.body;

  try {
    const userResult = await db.query(
      "SELECT id FROM users WHERE userid = $1",
      [userId]
    );
    const realId = userResult.rows[0].id;

    const today = new Date().toISOString().split("T")[0];

    await db.query(
      `INSERT INTO daily_usage (user_id, date)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [realId, today]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("❌ daily/start Error:", err);
    res.json({ success: false, message: err.message });
  }
});


/* -------------------------------
   🎯 Get Task Sequence (Trial-based)
---------------------------------*/
app.get("/api/getTask", async (req, res) => {
  const { subject, trial } = req.query;

  if (!subject || !trial) {
    return res.status(400).json({ error: "Missing subject or trial" });
  }

  try {
    const result = await db.query(
      `SELECT task FROM task_sequence_test
       WHERE subject_id = $1 AND trial = $2`,
      [subject, trial]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ task: result.rows[0].task });

  } catch (err) {
    console.error("❌ GetTask Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});


/* -------------------------------
   📚 Daily Article (Static)
---------------------------------*/
app.use(
  "/Articles/daily",
  express.static(path.join(__dirname, "public", "experimental", "articles"))
);

app.get("/api/daily-article", async (req, res) => {
  const { userId, source } = req.query; // source = "study"

  // 🧪 行為邊界感測（一定要放最前面）
  console.log("🧪 DAILY ARTICLE REQUEST", {
    userId,
    source,
    path: req.originalUrl,
    referer: req.headers.referer,
    time: new Date().toISOString()
  });

  // 🚫 基本防呆
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  // 🚫 僅允許 study 派發文章
  if (source !== "study") {
    return res.status(403).json({ error: "Invalid source" });
  }

  try {
    // 1️⃣ 找到真實 users.id
    const userResult = await db.query(
      "SELECT id FROM users WHERE userid = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const realId = userResult.rows[0].id;

    // 2️⃣ 取得或建立 education_progress
    let progress = await db.query(
      "SELECT education_count FROM education_progress WHERE user_id = $1",
      [realId]
    );

    if (progress.rows.length === 0) {
      await db.query(
        "INSERT INTO education_progress (user_id, education_count) VALUES ($1, 0)",
        [realId]
      );
      progress = { rows: [{ education_count: 0 }] };
    }

    const count = progress.rows[0].education_count;

    // 3️⃣ 根據使用次數決定文章
    const articleNumber = count + 1;
    const articleUrl = `/Articles/daily/article${articleNumber}.html`;

    // 🔒 防呆：確認文章檔案存在
    const articlePath = path.join(
      __dirname,
      "public",
      "experimental",
      "articles",
      `article${articleNumber}.html`
    );

    if (!fs.existsSync(articlePath)) {
      console.warn("⚠️ Article not found", {
        userId,
        articleNumber
      });

      return res.status(404).json({
        error: "Article not available yet",
        articleIndex: articleNumber
      });
    }

    console.log(
      `📘 User ${userId} | education_count=${count} → article${articleNumber}`
    );

    // 4️⃣ 僅派發，不推進狀態
    res.json({
      articleIndex: articleNumber, // debug 用
      url: articleUrl
    });

  } catch (err) {
    console.error("❌ daily-article error:", err);
    res.status(500).json({ error: "Server error" });
  }
});




/* -------------------------------
   🎥 Daily Video (Static)
---------------------------------*/
app.use(
  "/Videos/daily",
  express.static(path.join(__dirname, "public", "experimental", "videos"))
);

app.get("/api/daily-video", (req, res) => {
  const videos = ["video1.mp4", "video2.mp4", "video3.mp4"];
  const day = req.query.day ? parseInt(req.query.day) : new Date().getDate();
  const index = day % videos.length;
  const videoUrl = `/experimental/videos/${videos[index]}`;
  console.log("Day:", day, "→ 播放:", videoUrl);
  res.json({ day, url: videoUrl });
});

/* -------------------------------
   🕓 Helper: 時段判斷
---------------------------------*/
function getTaipeiPeriod() {
  const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" });
  const hour = new Date(now).getHours();
  if (hour >= 0 && hour < 12) return "早";
  if (hour >= 12 && hour < 18) return "中";
  return "晚";
}


/* -------------------------------
   🌐 Static Routes
---------------------------------*/
app.use(
  "/experimental",
  express.static(path.join(__dirname, "public", "experimental"))
);
app.use(
  "/shift_comparison",
  express.static(path.join(__dirname, "public", "shift_comparison"))
);

// 🏠 預設首頁導向
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "experimental", "index.html"));
});

/* -------------------------------
   🚀 Start Server
---------------------------------*/
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
