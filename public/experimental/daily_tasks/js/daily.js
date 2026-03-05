// === 全域變數 ===
let practiceSection, endSection, aviSection;
let practiceType = null;  // ⭐ 全域宣告，後面都能存取
let practicePages = {};   // ⭐ 也全域宣告
let afterPractice = false;

// ✅ 取得登入使用者 ID
const currentUserId = localStorage.getItem('userId');
if (!currentUserId) console.warn('⚠️ 未找到使用者登入資訊，請重新登入');

// === 每日任務限制：一天只能一次 ===
// === 每日任務限制：一天只能一次 ===
async function checkDailyUsageOnce() {
  const userId = localStorage.getItem("userId");
  
  // 🚩 這裡就是你截圖中報警的地方：如果 userId 為空，後端 check 就會失效
  if (!userId) {
    console.warn('⚠️ 未找到使用者登入資訊，限制檢查可能失效');
    // 如果這裡 return true，限制就會被繞過。
    // 建議：如果你希望強制執行限制，這裡應該 return false 並要求登入
  }

  try {
    // ✅ 這裡發送請求到 server.js 的 /api/daily/check
    const res = await fetch("/api/daily/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // 雖然 server.js 主要是看 Session，但傳入 userId 作為備援是好的
      body: JSON.stringify({ userId }) 
    });

    // 如果後端因為 requireLogin 擋住，這裡會收到 401
    if (res.status === 401) {
      console.error("Session 已過期，請重新登入");
      return true; 
    }

    const data = await res.json();

    // 後端回傳格式：{ success: true, blocked: true/false }
    if (!data.success) {
      console.warn("checkDailyUsage API 回傳失敗：", data.message);
      return true; 
    }

    // 🎯 核心限制邏輯
    if (data.blocked) {
      alert("你今天已經完成每日任務，請明天再來！");
      window.location.href = "/experimental/index.html";
      return false; 
    }

    return true;

  } catch (err) {
    console.error("❌ 前端 checkDailyUsageOnce Error:", err);
    return true; // 安全避風港：避免後端故障導致實驗中斷
  }
}

// ⭐ 不再在這裡直接呼叫 checkDailyUsageOnce()
// checkDailyUsageOnce();

// ✅ 進入頁面後，先等「一天一次」檢查跑完，再初始化 daily flow
document.addEventListener('DOMContentLoaded', async () => {
  const allowed = await checkDailyUsageOnce();
  if (!allowed) {
    return;
  }

  // === 區塊元素 ===
  const videoSection = document.getElementById('video-section');
  aviSection = document.getElementById('avi-section');
  const aviForm = document.getElementById('avi-form');
  practiceSection = document.getElementById('practice-section');
  endSection = document.getElementById('end-section');

  // === 影片載入 ===
const videoFrame = document.getElementById('dailyVideoFrame');
if (videoFrame) {
  fetch("/api/daily-video")
    .then(res => res.json())
    .then(data => {
      if (data.url) {
        videoFrame.src = data.url;
        
        // 🎯 只要使用者重新整理或進入頁面看到影片，就記一筆
        fetch("/api/daily/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            userId: currentUserId, 
            isFinished: false, 
            featureType: 'video_start' 
          })
        }).catch(err => console.error("紀錄影片開始失敗:", err));
      }
    });
}


  // === 複製 AVI（生成後測表單） ===
  const postAviForm = aviForm.cloneNode(true);
  postAviForm.id = 'avi-form-post';
  postAviForm.classList.add('hidden');
  postAviForm.dataset.type = 'post';
  aviSection.parentNode.insertBefore(postAviForm, aviSection.nextSibling);

  aviForm.dataset.type = 'pre';
  aviForm.classList.add('avi-form');
  postAviForm.classList.add('avi-form');

  // === 影片觀看計時器 (要求大於1分鐘) ===
  const finishBtn = document.getElementById('finish-video');
  let secondsLeft = 60; // 設定倒數秒數
  
  // 1. 初始化按鈕狀態
  finishBtn.disabled = true;
  finishBtn.innerText = `完成觀看（影片播畢後可按）`;

  // 2. 開始倒數
  const timer = setInterval(() => {
    secondsLeft--;
    if (secondsLeft > 0) {
      finishBtn.innerText = `完成觀看（影片播畢後可按）`;
    } else {
      clearInterval(timer);
      finishBtn.disabled = false;
      finishBtn.innerText = "完成觀看";
      finishBtn.classList.remove('btn-ghost'); // 確保樣式醒目
      finishBtn.classList.add('btn-primary');
    }
  }, 1000);

  // 3. 點擊按鈕跳轉至 AVI 前測
  finishBtn.addEventListener('click', () => {
    if (secondsLeft > 0) return; // 安全檢查

    videoSection.classList.add('hidden');
    aviSection.classList.remove('hidden');
    
    // 停止計時器以免佔用效能（如果使用者提早按的話）
    clearInterval(timer); 
  });

  // === 前測與後測共同提交邏輯 ===
  function handleAviSubmit(form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const formType = form.dataset.type;
      const formData = new FormData(form);
      const result = Object.fromEntries(formData.entries());

      if (formType === 'pre') {
        // --- 1. 抓取 Trial 與 Task ---
        const progRes = await fetch(`/api/progress?userId=${currentUserId}`);
        const progData = await progRes.json();
        const trial = progData.trial;

        const taskRes = await fetch(`/api/getTask?subject=${currentUserId}&trial=${trial}`);
        const taskData = await taskRes.json();

        if (!taskData.task) {
          alert("今日練習不存在，請連絡管理員");
          return;
        }

        // --- 2. 鎖定本次任務類型 ---
        practiceType = taskData.task; // 例如: 'loosen'

        // --- 3. 發送 daily_usage 開始紀錄 (包含 featureType) ---
        await fetch("/api/daily/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            userId: currentUserId, 
            isFinished: false, 
            featureType: practiceType 
          })
        }).catch(err => console.error("開始紀錄失敗:", err));

        // --- 4. 儲存 AVI 前測數據 (確保 featureType 有值) ---
        await fetch('/api/avi/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phase: 'pre',
            featureType: practiceType, // 👈 這裡傳入動態任務名稱
            responses: result
          })
        });

        // --- 5. 切換頁面 ---
        const TASK_PAGE_MAP = { loosen: "loosen2.html", breathe: "breathe.html", study: "study.html" };
        const page = TASK_PAGE_MAP[practiceType];
        const frame = document.getElementById("practiceFrame");

        form.classList.add('hidden');
        if (frame) {
          frame.src = `/experimental/daily_tasks/${practiceType}/${page}`;
          practiceSection.classList.remove("hidden");
        }
      } 
      else {
        // 🎯 後測提交區
        form.classList.add('hidden');

        // --- 1. 儲存 AVI 後測數據 (沿用 practiceType) ---
        await fetch('/api/avi/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phase: 'post',
            featureType: practiceType, // 👈 這裡同樣確保有值
            responses: result
          })
        });

        try {
          // --- 2. 發送 daily_usage 完成紀錄 ---
          await fetch("/api/daily/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              userId: currentUserId, 
              isFinished: true, 
              featureType: practiceType 
            })
          });
          
          // --- 3. 更新進度 ---
          // 取得目前進度
          const currentProgRes = await fetch("/api/progress");
          const currentProgData = await currentProgRes.json();

          const nextTrial = Number(currentProgData.trial) + 1;

          // 更新進度
          await fetch("/api/progress/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newTrial: nextTrial })
          });

          if (practiceType === 'study') {
            const currentArticleIndex = parseInt(localStorage.getItem("dailyArticleIndex") || "1", 10);
            const nextArticleIndex = currentArticleIndex + 1;
            
            // 更新索引，下次進入就會看到下一篇
            localStorage.setItem("dailyArticleIndex", nextArticleIndex);
            console.log(`✅ 閱讀任務完成，下次文章將從第 ${nextArticleIndex} 篇開始`);
          }
          
        } catch (err) {
          console.error("更新狀態失敗:", err);
        }

        endSection.classList.remove('hidden');
      }
    });
  }

  handleAviSubmit(aviForm);
  handleAviSubmit(postAviForm);
});

// === 練習完成後顯示後測 ===
window.addEventListener("message", (e) => {
  if (e?.data?.type === "practice-finished") {
    console.log("✅ practice finished! type =", practiceType);
    practiceSection.classList.add('hidden');

    const postAviForm = document.getElementById('avi-form-post');

    if (postAviForm) {
    postAviForm.dataset.feature = practiceType;  // ⭐ 現在一定能抓到
    postAviForm.reset();
    postAviForm.classList.remove('hidden');
    } else {
      console.error("❌ 找不到後測表單元素 avi-form-post");
    }
  }
});

