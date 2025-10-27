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
        username TEXT UNIQUE,
        password TEXT
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
    `);


    console.log("✅ PostgreSQL connected & tables ready");
  } catch (err) {
    console.error("❌ Database initialization failed:", err);
  }
})();

/* -------------------------------
   ⚙️ Middleware
---------------------------------*/
app.use(cors());
app.use(bodyParser.json());
app.use((req, res, next) => {
  const allowedConnectSrc = [
    "'self'",
    "https://bless-sel-exp.onrender.com",
    "https://api.openai.com",
  ];
  res.setHeader(
    "Content-Security-Policy",
    `
    default-src 'self';
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    connect-src ${allowedConnectSrc.join(" ")};
    img-src 'self' data:;
    font-src 'self' data:;
    `
  );
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
    const result = await db.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
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
        [user.id, loginTime, period]
      );

      res.json({
        success: true,
        userId: user.id,
        sessionId: sessionInsert.rows[0].id,
        loginTime,
        period,
      });
    } else {
      res.json({ success: false, message: "Invalid password" });
    }
  } catch (err) {
    console.error(err);
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
      `
      UPDATE activities 
      SET end_time = NOW(),
          duration = EXTRACT(EPOCH FROM (NOW() - start_time)) / 60
      WHERE id = $1
    `,
      [activityId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
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
   📚 Daily Article
---------------------------------*/
const articles = [
  {
    title: "放鬆心靈的力量",
    content: `<p>在忙碌的生活中，我們很容易忽略內心的聲音。適當的休息與冥想，
    可以幫助我們更好地面對壓力，並培養更深的覺察力。</p>
    <p>🌿 試著每天花 10 分鐘，深呼吸並靜靜觀察內在感受。</p>`,
  },
  {
    title: "情緒調節的三個方法",
    content: `<p>研究顯示，覺察情緒、表達感受，以及重新詮釋經驗，
    是有效的情緒調節策略。</p>
    <ul><li>🧘 呼吸練習</li><li>📝 書寫日記</li><li>🤝 與朋友傾訴</li></ul>`,
  },
  {
    title: "自我慈悲：與自己和解",
    content: `<p>自我慈悲代表著在失敗或痛苦時，仍能以善意與理解對待自己。</p>
    <blockquote>💡 「像對待朋友一樣，溫柔對待自己。」</blockquote>`,
  },
];

app.get("/api/daily-article", (req, res) => {
  const today = new Date();
  const index = today.getDate() % articles.length;
  const article = articles[index];
  res.json({
    title: article.title,
    date: today.toISOString().split("T")[0],
    content: article.content,
  });
});

/* -------------------------------
   🎥 Daily Video
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
