// 全域變數，讓 message listener 可以使用
let practiceSection, affectGridSection, endSection;
let afterPractice = false;

document.addEventListener('DOMContentLoaded', () => {
  // 各區塊
  const videoSection = document.getElementById('video-section');
  const moodSection = document.getElementById('mood-section');   // PANAS(前測)
  const panasForm = document.getElementById('panas-table');
  affectGridSection = document.getElementById('affectgrid-section');
  practiceSection = document.getElementById('practice-section');
  endSection = document.getElementById('end-section');

  const practiceType = Math.floor(Math.random() * 3); 
  const practicePages = {
    0: "./breathe/breathe.html", 
    1: "./loosen/loosen.html",
    2: "./study/study.html"
  };

  // 今日影片（從後端 API 抓）
  // 在您的前端 JS 檔案中:
const video = document.getElementById('daily-video');
fetch("/api/daily-video")
.then(res => {
    // 檢查 HTTP 狀態碼
    if (!res.ok) {
        // 如果不是 200 OK，拋出錯誤，讓 catch 處理
        throw new Error(`HTTP 錯誤: ${res.status} ${res.statusText}`);
    }
    return res.json(); // 嘗試解析 JSON
})
.then(data => {
    video.src = data.url; // 後端回傳的 url，例如 /Videos/daily/video1.mp4
})
.catch(err => {
    // 在這裡處理網路錯誤、JSON 解析錯誤或 HTTP 狀態碼錯誤
    console.error("載入每日影片失敗:", err.message);
    // 您可以在這裡設定一個預設影片或錯誤提示給使用者
});

  // -------- PANAS 後測 (clone form) --------
  const postPanasForm = panasForm.cloneNode(true);
  postPanasForm.id = 'panas-table-post';
  postPanasForm.classList.add('hidden');

  // ⭐ 給前測與後測都加上共用 class
  panasForm.classList.add('panas-form');
  postPanasForm.classList.add('panas-form');

  moodSection.parentNode.insertBefore(postPanasForm, moodSection.nextSibling);

  // -------- AffectGrid 狀態 --------
  const gridContainer = document.querySelector('.grid-container');
  const feedback = document.getElementById('feedback');
  const confirmBtn = document.getElementById('confirm-btn');
  let selectedSquare = null;

  // 顏色分配函數
  const getColor = (x, y) => {
    if (y > 5 && x > 5) return "rgba(255, 215, 0, 0.8)";
    if (y > 5 && x < 5) return "rgba(255, 69, 58, 0.8)";
    if (y < 5 && x > 5) return "rgba(50, 205, 50, 0.8)";
    if (y < 5 && x < 5) return "rgba(65, 105, 225, 0.8)";
    return "rgba(200,200,200,0.5)";
  };

  // 生成 9x9 網格
  for (let y = 9; y >= 1; y--) {
    for (let x = 1; x <= 9; x++) {
      const gridItem = document.createElement('div');
      gridItem.classList.add('grid-item');
      gridItem.dataset.x = x;
      gridItem.dataset.y = y;

      if (y === 5) gridItem.textContent = x;
      if (x === 5) gridItem.textContent = y;

      gridItem.addEventListener('click', () => {
        document.querySelectorAll('.grid-item').forEach(item => {
          item.classList.remove('selected');
          item.style.backgroundColor = "#f9f9f9";
        });

        gridItem.classList.add('selected');
        gridItem.style.backgroundColor = getColor(x, y);
        selectedSquare = { x, y };

        feedback.textContent = `已選擇：X = ${x}, Y = ${y}`;
      });

      gridContainer.appendChild(gridItem);
    }
  }

  // ----------- 流程控制 -----------

  // 完成觀看 → PANAS(前測)
  document.getElementById('finish-video').addEventListener('click', () => {
    if (video.duration && video.currentTime < video.duration - 2) {
      alert("請先完整觀看影片再繼續。");
      return;
    }
    videoSection.classList.add('hidden');
    moodSection.classList.remove('hidden');
  });

  // PANAS(前測) → AffectGrid(前測)
  panasForm.addEventListener('submit', (e) => {
    e.preventDefault();
    panasForm.classList.add('hidden');
    affectGridSection.classList.remove('hidden');
  });

  // AffectGrid → 練習 或 PANAS(後測)
  confirmBtn.addEventListener('click', () => {
    if (!selectedSquare) {
      alert("請先選擇一個格子！");
      return;
    }

    affectGridSection.classList.add('hidden');

    if (!afterPractice) {
      const frame = document.getElementById('practiceFrame');
      frame.src = practicePages[practiceType];
      practiceSection.classList.remove('hidden');
    } else {
      postPanasForm.classList.remove('hidden');
    }
  });

  // PANAS(後測) → 結束頁
  postPanasForm.addEventListener('submit', (e) => {
    e.preventDefault();
    postPanasForm.classList.add('hidden');
    endSection.classList.remove('hidden');
  });
});

// ⭐ 子頁完成訊息
window.addEventListener("message", (e) => {
  if (e?.data?.type === "practice-finished") {
    practiceSection.classList.add('hidden');
    affectGridSection.classList.remove('hidden');
    afterPractice = true;
  }
});