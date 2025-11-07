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
        "INSERT INTO sessions (user_id, login_time, period) VALUES ($1, $2, $3)",
        [user.userid, loginTime, period]
        );


      res.json({
        success: true,
        userId: user.userid,
        sessionId: sessionInsert.rows[0].id,
        loginTime,
        period,
        group: user.group_label
      });
    } else {
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
  try {
    const result = await db.query(
      "INSERT INTO activities (user_id, type, start_time) VALUES ($1, $2, NOW()) RETURNING id",
      [userId, featureType]
    );
    res.json({ success: true, activityId: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

app.post("/api/activity/end", async (req, res) => {
  const { activityId } = req.body;
  try {
    await db.query(
      `UPDATE activities 
       SET end_time = NOW(),
           duration = EXTRACT(EPOCH FROM (NOW() - start_time)) / 60
       WHERE id = $1`,
      [activityId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

/* -------------------------------
   🧭 AVI 前後測儲存
---------------------------------*/
app.post("/api/avi/save", async (req, res) => {
  const { userId, phase, responses } = req.body; // phase = 'pre' or 'post'
  try {
    await db.query(
      "INSERT INTO avi_results (user_id, phase, responses) VALUES ($1, $2, $3)",
      [userId, phase, responses]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("❌ AVI Save Error:", err);
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
