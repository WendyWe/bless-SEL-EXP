/**
 * Express server configuration for BLESS application
 * Handles user authentication, session management, activity tracking, AI feedback, and daily education article
 * @module server
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db/config');
const OpenAI = require('openai');

const app = express();
const port = 3000;

/**
 * Middleware Configuration
 */
app.use(cors());
app.use(bodyParser.json());
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:3000 https://api.openai.com"
  );
  next();
});

app.use('/experimental', express.static(path.join(__dirname, 'public', 'experimental')));
app.use('/shift_comparison', express.static(path.join(__dirname, 'public', 'shift_comparison')));

/**
 * OpenAI Client
 */
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Login endpoint
 */
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    const query = 'SELECT * FROM users WHERE username = ?';
    db.get(query, [username], (err, user) => {
        if (err) {
            console.error(err);
            return res.json({ success: false, message: 'Database error' });
        }
        
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        if (password === user.password) {
            const loginTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' });
            const period = getTaipeiPeriod();
            
            db.run(
                'INSERT INTO sessions (user_id, login_time, period) VALUES (?, ?, ?)',
                [user.id, loginTime, period],
                function(err) {
                    if (err) {
                        console.error(err);
                        return res.json({ success: false, message: 'Session creation failed' });
                    }
                    
                    res.json({
                        success: true,
                        userId: user.id,
                        sessionId: this.lastID,
                        loginTime,
                        period
                    });
                }
            );
        } else {
            res.json({ success: false, message: 'Invalid password' });
        }
    });
});

/**
 * Activity tracking endpoints
 */
app.post('/api/activity/start', (req, res) => {
    const { userId, featureType } = req.body;
    
    db.run(
        'INSERT INTO activities (user_id, type, start_time) VALUES (?, ?, ?)',
        [userId, featureType, new Date().toISOString()],
        function(err) {
            if (err) {
                console.error(err);
                return res.json({ success: false });
            }
            res.json({ success: true, activityId: this.lastID });
        }
    );
});

app.post('/api/activity/end', (req, res) => {
    const { activityId } = req.body;
    const endTime = new Date().toISOString();
    
    db.run(
        `UPDATE activities 
         SET end_time = ?, 
             duration = ROUND((JULIANDAY(?) - JULIANDAY(start_time)) * 24 * 60)
         WHERE id = ?`,
        [endTime, endTime, activityId],
        (err) => {
            if (err) {
                console.error(err);
                return res.json({ success: false });
            }
            res.json({ success: true });
        }
    );
});

/**
 * Feedback API
 */
app.post('/api/feedback', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: '請提供 text' });

        const completion = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `
                    你是心理寫作回饋助理。使用者的文字會依四位格（我／你／他／回到我）書寫。  
                    請依下列原則回饋：  
                    1. 特點與情緒  
                    2. 心理意涵  
                    3. 以開放式問題或反思句邀請使用者探索（連結 SEL 自我覺察：情緒覺察、自我認識、自我價值觀）。 
                    4. 請避免每段都用同樣的開頭，可以用不同表達方式，如：或許可以、另一種理解是、這顯示…

                    位格規則：
                    - 我：接納感受並引導情緒覺察
                    - 你：把苛責改為溫柔反思式提問
                    - 他：以第三人稱呈現脈絡，並用問題引出多重解釋
                    - 回到我：整合觀察並鼓勵自我認識

                    回覆格式：  
                    【我的位格】→ 回饋  
                    【你的位格】→ 回饋  
                    【他的位格】→ 回饋  
                    【回到我的位格】→ 回饋  

                    請用繁體中文，每段 2–3 句，以問題或開放式反思結尾，避免提供具體步驟或建議。
                    `
                },
                { role: 'user', content: text }
            ]
        });

        const feedback = completion.choices[0].message.content;
        res.json({ feedback });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * Daily Education Article API
 */
const articles = [
    {
        title: "放鬆心靈的力量",
        content: `
          <p>在忙碌的生活中，我們很容易忽略內心的聲音。適當的休息與冥想，
          可以幫助我們更好地面對壓力，並培養更深的覺察力。</p>
          <p>🌿 試著每天花 10 分鐘，深呼吸並靜靜觀察內在感受。</p>
        `
    },
    {
        title: "情緒調節的三個方法",
        content: `
          <p>研究顯示，覺察情緒、表達感受，以及重新詮釋經驗，
          是有效的情緒調節策略。</p>
          <ul>
            <li>🧘 呼吸練習</li>
            <li>📝 書寫日記</li>
            <li>🤝 與朋友傾訴</li>
          </ul>
        `
    },
    {
        title: "自我慈悲：與自己和解",
        content: `
          <p>自我慈悲代表著在失敗或痛苦時，仍能以善意與理解對待自己。</p>
          <blockquote>💡 「像對待朋友一樣，溫柔對待自己。」</blockquote>
        `
    }
];

/**
 * Daily article
 */

app.get("/api/daily-article", (req, res) => {
    const today = new Date();
    const index = today.getDate() % articles.length; // 用日期決定索引
    const article = articles[index];

    res.json({
        title: article.title,
        date: today.toISOString().split("T")[0],
        content: article.content
    });
});

/**
 * Daily Video API
 */
const videos = [
    "video1.mp4",
    "video2.mp4",
    "video3.mp4"
];


app.use('/Videos/daily', express.static(path.join(__dirname, 'public', 'experimental', 'videos')));

app.get("/api/daily-video", (req, res) => {
    const videos = ["video1.mp4", "video2.mp4", "video3.mp4"];

    // 如果有 query string，就用 query，沒有才用今天
    let day = req.query.day ? parseInt(req.query.day) : new Date().getDate();

    const index = day % videos.length;
    const videoUrl = `/experimental/videos/${videos[index]}`;

    console.log("Day:", day, "→ 播放:", videoUrl);

    res.json({ day, url: videoUrl });
});


/**
 * Helper: 判斷時段
 */
function getTaipeiPeriod() {
    const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' });
    const hour = new Date(now).getHours();
    if (hour >= 0 && hour < 12) return '早';
    if (hour >= 12 && hour < 18) return '中';
    return '晚';
}

app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});

