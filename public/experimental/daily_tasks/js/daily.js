// === 全域變數 ===
let practiceSection, endSection, aviSection;
let practiceType = null;  // ⭐ 全域宣告，後面都能存取
let practicePages = {};   // ⭐ 也全域宣告
let afterPractice = false;

// ✅ 取得登入使用者 ID
const currentUserId = localStorage.getItem('userId');
if (!currentUserId) console.warn('⚠️ 未找到使用者登入資訊，請重新登入');

// === 每日任務限制：一天只能一次 ===
async function checkDailyUsageOnce() {
  const userId = localStorage.getItem("userId");
  if (!userId) return true; // 找不到 user，直接放行避免整個卡死

  try {
    // ✅ 和後端 server.js 一致：POST + JSON body
    const res = await fetch("/api/daily/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    });

    const data = await res.json();

    // 後端回傳格式：{ success: true, blocked: true/false }
    if (!data.success) {
      console.warn("checkDailyUsage API 回傳失敗：", data.message);
      return true; // 不故意擋使用者，避免因為 bug 導致完全不能用
    }

    if (data.blocked) {
      alert("你今天已經完成每日任務，請明天再來！");
      window.location.href = "/experimental/home.html";
      return false; // ❗ 告訴呼叫方「不要再繼續初始化 daily flow」
    }

    // ✅ 第一次使用：順便寫入 daily_usage（標記今天已使用）
    await fetch("/api/daily/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    }).catch(err => console.error("❌ daily/start 記錄失敗（不致命）：", err));

    return true;

  } catch (err) {
    console.error("❌ 前端 checkDailyUsageOnce Error:", err);
    // 安全設計：後端壞掉時，不要整個平台掛掉，先允許使用
    return true;
  }
}

// ⭐ 不再在這裡直接呼叫 checkDailyUsageOnce()
// checkDailyUsageOnce();

// ✅ 進入頁面後，先等「一天一次」檢查跑完，再初始化 daily flow
document.addEventListener('DOMContentLoaded', async () => {
  const allowed = await checkDailyUsageOnce();
  if (!allowed) {
    // 今天已使用，已經 redirect，不再做任何初始化
    return;
  }

  // === 區塊元素 ===
  const videoSection = document.getElementById('video-section');
  aviSection = document.getElementById('avi-section');
  const aviForm = document.getElementById('avi-form');
  practiceSection = document.getElementById('practice-section');
  endSection = document.getElementById('end-section');

  // === 練習頁面隨機化 ===
  practiceType = Math.floor(Math.random() * 3);   // ⭐ 賦值給全域變數
  practicePages = {
    0: "./breathe/breathe.html",
    1: "./loosen/loosen.html",
    2: "./study/study.html"
  };
  console.log("🎲 practiceType =", practiceType);

  // === 影片載入 ===
  const video = document.getElementById('daily-video');
  fetch("/api/daily-video")
    .then(res => res.json())
    .then(data => video.src = data.url)
    .catch(err => console.error("載入每日影片失敗:", err.message));

  // === 複製 AVI（生成後測表單） ===
  const postAviForm = aviForm.cloneNode(true);
  postAviForm.id = 'avi-form-post';
  postAviForm.classList.add('hidden');
  postAviForm.dataset.type = 'post';
  aviSection.parentNode.insertBefore(postAviForm, aviSection.nextSibling);

  aviForm.dataset.type = 'pre';
  aviForm.classList.add('avi-form');
  postAviForm.classList.add('avi-form');

  // === 完成觀看 → 顯示 AVI 前測 ===
  document.getElementById('finish-video').addEventListener('click', () => {
    if (video.duration && video.currentTime < video.duration - 2) {
      alert("請先完整觀看影片再繼續。");
      return;
    }
    videoSection.classList.add('hidden');
    aviSection.classList.remove('hidden');
  });

  // === 前測與後測共同提交邏輯 ===
  function handleAviSubmit(form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      form.classList.add('hidden');

      const formType = form.dataset.type;
      const featureType = form.dataset.feature ?? practiceType;  // ⭐ 確保有值
      const formData = new FormData(form);
      const result = Object.fromEntries(formData.entries());

      fetch('/api/avi/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          phase: formType,
          featureType: featureType,
          responses: result
        })
      }).catch(err => console.error('送出 AVI 失敗:', err));

      if (formType === 'pre') {
        // === 前測後進入練習 ===
        const frame = document.getElementById('practiceFrame');
        frame.src = practicePages[practiceType];
        practiceSection.classList.remove('hidden');
      } else {
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
    postAviForm.dataset.feature = practiceType;  // ⭐ 現在一定能抓到
    postAviForm.reset();
    postAviForm.classList.remove('hidden');
  }
});

