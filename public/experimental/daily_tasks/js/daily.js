// 全域變數
let practiceSection, endSection, aviSection, afterPractice = false;

document.addEventListener('DOMContentLoaded', () => {
  // 區塊元素
  const videoSection = document.getElementById('video-section');
  aviSection = document.getElementById('avi-section');
  const aviForm = document.getElementById('avi-form');
  practiceSection = document.getElementById('practice-section');
  endSection = document.getElementById('end-section');

  // 練習頁面隨機化
  const practiceType = Math.floor(Math.random() * 3);
  const practicePages = {
    0: "./breathe/breathe.html",
    1: "./loosen/loosen.html",
    2: "./study/study.html"
  };

  // 影片載入
  const video = document.getElementById('daily-video');
  fetch("/api/daily-video")
    .then(res => {
      if (!res.ok) throw new Error(`HTTP 錯誤: ${res.status} ${res.statusText}`);
      return res.json();
    })
    .then(data => {
      video.src = data.url;
    })
    .catch(err => {
      console.error("載入每日影片失敗:", err.message);
    });

  // ⭐ 複製 AVI（生成後測表單）
  const postAviForm = aviForm.cloneNode(true);
  postAviForm.id = 'avi-form-post';
  postAviForm.classList.add('hidden');
  postAviForm.dataset.type = 'post'; // 標記後測
  aviSection.parentNode.insertBefore(postAviForm, aviSection.nextSibling);

  aviForm.dataset.type = 'pre'; // 標記前測
  aviForm.classList.add('avi-form');
  postAviForm.classList.add('avi-form');

  // 完成觀看 → 顯示 AVI 前測
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
      const formData = new FormData(form);
      const result = Object.fromEntries(formData.entries());

      // 可在此送往後端 API 儲存
      fetch(`/api/save-avi?type=${formType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      }).catch(err => console.error('送出 AVI 失敗:', err));

      if (formType === 'pre') {
        // === 前測後進入練習 ===
        const frame = document.getElementById('practiceFrame');
        frame.src = practicePages[practiceType];
        practiceSection.classList.remove('hidden');
      } else {
        // === 後測後顯示結束頁 ===
        endSection.classList.remove('hidden');
      }
    });
  }

  handleAviSubmit(aviForm);
  handleAviSubmit(postAviForm);
});

// ⭐ 練習完成後顯示後測
window.addEventListener("message", (e) => {
  if (e?.data?.type === "practice-finished") {
    practiceSection.classList.add('hidden');

    const postAviForm = document.getElementById('avi-form-post');
    postAviForm.reset(); // 清除上次填答
    postAviForm.classList.remove('hidden');
  }
});
