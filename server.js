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
const MAX_ARTICLES = 10; 

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
        started_at TIMESTAMP,           
        avi_posttest_done BOOLEAN DEFAULT false, 
        completed_at TIMESTAMP,         
        created_at TIMESTAMP DEFAULT NOW()
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
      CREATE TABLE IF NOT EXISTS calm_kit_moods (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      phase TEXT,            
      x INTEGER,             
      y INTEGER,             
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
   🎨 情緒安心角：前後測情緒座標儲存
---------------------------------*/
app.post("/api/calm-kit/save-mood", async (req, res) => {
  const { userId, mode, x, y, kitType, duration } = req.body;

  try {
    // 1. 根據 userid 找出真正的 user_id (整數)
    const userResult = await db.query(
      "SELECT id FROM users WHERE userid = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "找不到使用者" });
    }

    const realId = userResult.rows[0].id;
    const taipeiTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" });

    // 2. 存入新表格 calm_kit_moods
    await db.query(
      `INSERT INTO calm_kit_moods (user_id, phase, x, y, kit_type, duration, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [realId, mode, x, y, kitType, duration, taipeiTime]
    );

    console.log(`✅ [Calm Kit] 存入成功: User=${userId}, Phase=${mode}, (${x}, ${y})`);
    res.json({ success: true });

  } catch (err) {
    console.error("❌ Calm Kit Save Error:", err);
    res.status(500).json({ success: false, message: "伺服器儲存失敗" });
  }
});

/* -------------------------------
   📚 學習心得：專屬儲存路由
---------------------------------*/
app.post("/api/study/save-reflection", async (req, res) => {
  const { userId, articleIndex, articleTitle, reflectionText, duration } = req.body;

  try {
    // 1. 將 TEST001 轉為真正的 user_id
    const userResult = await db.query(
      "SELECT id FROM users WHERE userid = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const realId = userResult.rows[0].id;
    const time = getTaipeiNow(); // 使用你現有的 helper function

    // 2. 存入新表格 study_reflections
    await db.query(
      `INSERT INTO study_reflections (user_id, article_index, article_title, reflection_text, duration, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [realId, articleIndex, articleTitle, reflectionText, duration, time]
    );

    console.log(`✅ [Study] 心得存入成功: User=${userId}, 文章=${articleTitle}`);
    res.json({ success: true });

  } catch (err) {
    console.error("❌ Study Reflection Save Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});



/* -------------------------------
   🔒 Check Daily Usage (一天一次限制)
---------------------------------*/
app.post("/api/daily/check", async (req, res) => {
  const { userId } = req.body;  

  try {
    const userResult = await db.query(
      "SELECT id FROM users WHERE userid = $1",
      [userId]
    );if (userResult.rows.length === 0) {return res.json({ success: false, message: "User not found" });}
    const realId = userResult.rows[0].id;
    const today = getTaipeiDateString();
    
    const check = await db.query(
      "SELECT 1 FROM daily_usage WHERE user_id = $1 AND date = $2 AND avi_posttest_done = true LIMIT 1",
      [realId, today]
    );

    res.json({ success: true, blocked: check.rows.length > 0 });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});



app.post("/api/daily/status", async (req, res) => {
  const { userId, isFinished, featureType } = req.body;

  try {
    const userResult = await db.query(
      "SELECT id FROM users WHERE userid = $1",
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }

    const realId = userResult.rows[0].id;
    const today = getTaipeiDateString();
    const nowTaipei = getTaipeiNow();

    if (isFinished) {
      // 🎯 完成時：更新 avi_posttest_done 為 true，並記錄完成時間
      await db.query(
        `UPDATE daily_usage 
         SET avi_posttest_done = true, completed_at = $1 
         WHERE id = (
           SELECT id FROM daily_usage 
           WHERE user_id = $2 AND date = $3 AND feature_type = $4 AND avi_posttest_done = false 
           ORDER BY started_at DESC 
           LIMIT 1
         )`,
        [nowTaipei, realId, today, featureType]
      );
      console.log(`✅ User ${userId} 已完成今日任務`);
    } else {
      // 🎯 開始時：建立紀錄 (如果還沒有的話)，標記開始時間
      await db.query(
        `INSERT INTO daily_usage (user_id, date, started_at, avi_posttest_done, feature_type) 
         VALUES ($1, $2, $3, false, $4)`,
        [realId, today, nowTaipei, featureType]
      );
      console.log(`🚩 User ${userId} 已開始今日任務`);
    }
    res.json({ success: true });

  } catch (err) {
    console.error("❌ daily/status Error:", err);
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

app.get("/api/daily-article", (req, res) => {
  const { userId, source, index } = req.query;

  // 🧪 行為驗證用 log（建議保留）
  console.log("🧪 DAILY ARTICLE REQUEST", {
    userId,
    source,
    index,
    time: new Date().toISOString()
  });

  // ① 基本防呆
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  // ② 只允許 study
  if (source !== "study") {
    return res.status(403).json({ error: "Invalid source" });
  }

  // ③ 解析文章 index（前端負責給）
  const articleIndex = parseInt(index, 10);

  if (
    Number.isNaN(articleIndex) ||
    articleIndex < 1 ||
    articleIndex > MAX_ARTICLES
  ) {
    return res.status(400).json({
      error: "Invalid article index",
      max: MAX_ARTICLES
    });
  }

  // ④ 組出文章路徑
  const articleFilename = `article${articleIndex}.html`;
  const articlePath = path.join(
    __dirname,
    "public",
    "experimental",
    "articles",
    articleFilename
  );

  // ⑤ 確認檔案真的存在（避免回傳死連結）
  if (!fs.existsSync(articlePath)) {
    console.warn("⚠️ Article file missing", {
      articleIndex,
      articleFilename
    });

    return res.status(404).json({
      error: "Article not available yet",
      articleIndex
    });
  }

  // ✅ 成功派發（不改任何狀態）
  res.json({
    articleIndex,
    url: `/Articles/daily/${articleFilename}`
  });
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
function getTaipeiDateString() {
  // 回傳 YYYY-MM-DD
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
}

function getTaipeiNow() {
  // 回傳完整時間字串
  return new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" });
}
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
