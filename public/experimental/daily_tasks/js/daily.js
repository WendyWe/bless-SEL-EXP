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
      window.location.href = "/experimental/index.html";
      return false; // ❗ 告訴呼叫方「不要再繼續初始化 daily flow」
    }

    // 
    await fetch("/api/daily/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUserId, isFinished: false })
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
    return;
  }

  // === 區塊元素 ===
  const videoSection = document.getElementById('video-section');
  aviSection = document.getElementById('avi-section');
  const aviForm = document.getElementById('avi-form');
  practiceSection = document.getElementById('practice-section');
  endSection = document.getElementById('end-section');

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
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const formType = form.dataset.type;
      const formData = new FormData(form);
      const result = Object.fromEntries(formData.entries());

      let finalFeatureType = form.dataset.feature ?? practiceType;

     if (formType === 'pre') {

        // 1. 取得今日 trial（你可從 localStorage 或後端給的變數拿）
        const subject = currentUserId;  // TEST001
        // 取得 server 端紀錄的 trial
        const progRes = await fetch(`/api/progress?userId=${currentUserId}`);
        const progData = await progRes.json();
        const trial = progData.trial;
        console.log("現在是第 " + trial + " 次練習");

        // 2. 向後端查詢 task
        const taskRes = await fetch(`/api/getTask?subject=${subject}&trial=${trial}`);
        const taskData = await taskRes.json();

        if (!taskData.task) {
          alert("今日練習不存在，請連絡管理員");
          return;
        }

        practiceType = taskData.task; 
        finalFeatureType = practiceType;
        
        await fetch('/api/avi/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId,
            phase: formType,
            featureType: finalFeatureType, 
            responses: result
          })
        }).catch(err => console.error('送出 AVI 前測失敗:', err));

        // 3. 組合 task HTML 路徑
        const TASK_PAGE_MAP = {
          loosen: "loosen2.html",
          breathe: "breathe.html",
          study: "study.html"
        };
        const task = taskData.task;
        const page = TASK_PAGE_MAP[task];
        const frame = document.getElementById("practiceFrame");

        form.classList.add('hidden');
        if (frame) {
          frame.src = `/experimental/daily_tasks/${task}/${page}`;
          practiceSection.classList.remove("hidden");
        }
      } 
      else {
          form.classList.add('hidden');
          // 🎯 後測提交區

          await fetch('/api/avi/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUserId,
              phase: formType,
              featureType: finalFeatureType, 
              responses: result
            })
          }).catch(err => console.error('送出 AVI 後測失敗:', err));

          try {
            await fetch("/api/daily/status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: currentUserId, isFinished: true })
            });
            
            // trial +1 回存
            const currentProgRes = await fetch(`/api/progress?userId=${currentUserId}`);
            const currentProgData = await currentProgRes.json();
            const nextTrial = Number(currentProgData.trial) + 1;

            await fetch("/api/progress/update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: currentUserId,
                newTrial: nextTrial
              })
            });
            
            console.log("✅ 任務完成！進度已預備為明天的第 ${nextTrial} 次");
          } catch (err) {
            console.error("更新完成狀態失敗:", err);
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
    postAviForm.dataset.feature = practiceType;  // ⭐ 現在一定能抓到
    postAviForm.reset();
    postAviForm.classList.remove('hidden');
  }
});

