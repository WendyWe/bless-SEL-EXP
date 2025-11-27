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
   🤖 OpenAI Client
---------------------------------*/
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* -------------------------------
   👤 Login
---------------------------------*/
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.query("SELECT * FROM users WHERE userid = $1", [username]);
    const user = result.rows[0];

    if (!user)
      return res.json({ success: false, message: "User not found" });

    if (password === user.password) {
    const loginTime = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Taipei",
    });
    const period = getTaipeiPeriod();

    const sessionInsert = await db.query(
      "INSERT INTO sessions (user_id, login_time, period) VALUES ($1, $2, $3) RETURNING id",
      [userid, loginTime, period]
    );

    res.json({
      success: true,
      userId: user.userid,                 // 存 TEST001 到前端
      sessionId: sessionInsert.rows[0].id,
      loginTime,
      period,
      group: user.group_label
    });
  }else {
      res.json({ success: false, message: "Invalid password" });
    }
  } catch (err) {
    console.error("❌ Login DB Error:", err);
    res.json({ success: false, message: "Database error" });
  }
});

/* -------------------------------
   📊 Activity Tracking
---------------------------------*/
app.post("/api/activity/start", async (req, res) => {
  const { userId, featureType } = req.body;
  const taipeiTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" });

  try {
    const result = await db.query(
      "INSERT INTO activities (user_id, type, start_time) VALUES ($1, $2, $3) RETURNING id",
      [userId, featureType, taipeiTime]
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
  const { userId, phase, featureType, responses } = req.body; // ✅ 加上 featureType
  try {
    const loginTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" });

    await db.query(
      `INSERT INTO avi_results (user_id, phase, feature_type, responses, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, phase, featureType, responses, loginTime] // ✅ 新增 featureType & loginTime
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
app.get("/api/daily/check", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.json({ usedToday: false });

  const today = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Taipei",
  }).split(",")[0]; // yyyy/mm/dd

  try {
    const result = await db.query(
      `SELECT 1 FROM daily_usage
       WHERE user_id = (SELECT id FROM users WHERE userid = $1)
       AND date = $2`,
      [userId, today]
    );

    if (result.rows.length > 0) {
      return res.json({ usedToday: true });
    }

    res.json({ usedToday: false });
  } catch (err) {
    console.error("❌ Daily Check Error:", err);
    res.json({ usedToday: false });
  }
});

/* -------------------------------
   📝 Mark Today Used
---------------------------------*/
app.post("/api/daily/markUsed", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.json({ success: false });

  const today = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Taipei",
  }).split(",")[0];

  try {
    await db.query(
      `INSERT INTO daily_usage (user_id, date)
       VALUES ((SELECT id FROM users WHERE userid = $1), $2)
       ON CONFLICT DO NOTHING`,
      [userId, today]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Mark Daily Usage Error:", err);
    res.json({ success: false });
  }
});


/* -------------------------------
   💬 Feedback (OpenAI)
---------------------------------*/
app.post("/api/feedback", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "請提供 text" });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
            你是心理寫作回饋助理。使用者的文字會依四位格（我／你／他／回到我）書寫。
            請依下列原則回饋：
            1. 特點與情緒
            2. 心理意涵
            3. 以開放式問題或反思句邀請使用者探索。
            4. 避免每段都用同樣開頭。
          `,
        },
        { role: "user", content: text },
      ],
    });

    const feedback = completion.choices[0].message.content;
    res.json({ feedback });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
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
      `SELECT task FROM task_sequence
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

app.get("/api/daily-article", (req, res) => {
  const articles = ["article1.html", "article2.html", "article3.html"];
  const day = req.query.day ? parseInt(req.query.day) : new Date().getDate();
  const index = day % articles.length;
  const articleUrl = `/experimental/articles/${articles[index]}`;
  console.log("Day:", day, "→ 派送文章:", articleUrl);
  res.json({ day, url: articleUrl });
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
   🚀 Start Server
---------------------------------*/
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
