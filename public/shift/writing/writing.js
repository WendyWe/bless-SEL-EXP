// === 全域變數 ===
let writingSection, endSection, aviSection;
let practiceType = null; 
const currentUserId = localStorage.getItem('userId');

document.addEventListener('DOMContentLoaded', async () => {
  // --- 1. 元素選取 ---
  aviSection = document.getElementById('avi-section');
  const aviForm = document.getElementById('avi-form');
  writingSection = document.getElementById('writing-section'); 
  endSection = document.getElementById('end-section');
  const finishWritingBtn = document.getElementById('finish-writing'); // 書寫區的完成按鈕

  if (aviSection) aviSection.classList.remove('hidden');
  
  // --- 2. 複製 AVI（生成後測表單） ---
  const postAviForm = aviForm.cloneNode(true);
  postAviForm.id = 'avi-form-post';
  postAviForm.classList.add('hidden');
  postAviForm.dataset.type = 'post';
  aviSection.parentNode.insertBefore(postAviForm, aviSection.nextSibling);

  aviForm.dataset.type = 'pre';
  aviForm.classList.add('avi-form');
  postAviForm.classList.add('avi-form');

  // --- 3. 前測與後測提交邏輯 ---
  function handleAviSubmit(form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formType = form.dataset.type;
      const formData = new FormData(form);
      const result = Object.fromEntries(formData.entries());

      if (formType === 'pre') {
        // --- 前測提交階段 ---
        // 抓取 Trial 與 Task 資訊
        const progRes = await fetch(`/api/progress?userId=${currentUserId}`);
        const progData = await progRes.json();
        const taskRes = await fetch(`/api/getTask?subject=${currentUserId}&trial=${progData.trial}`);
        const taskData = await taskRes.json();

        practiceType = taskData.task || 'writing'; 

        // 儲存 AVI 前測數據
        await fetch('/api/avi/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phase: 'pre', featureType: practiceType, responses: result })
        });

        // 切換介面：隱藏前測，顯示心理位移書寫區
        form.classList.add('hidden');
        writingSection.classList.remove('hidden');
      } 
      else {
        // --- 後測提交階段 ---
        form.classList.add('hidden');

        // 儲存 AVI 後測數據
        await fetch('/api/avi/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phase: 'post', featureType: practiceType, responses: result })
        });

        try {
          // 紀錄完成狀態與更新進度
          await fetch("/api/daily/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUserId, isFinished: true, featureType: practiceType })
          });

          const currentProgRes = await fetch("/api/progress");
          const currentProgData = await currentProgRes.json();
          await fetch("/api/progress/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newTrial: Number(currentProgData.trial) + 1 })
          });
        } catch (err) {
          console.error("更新狀態失敗:", err);
        }

        // 顯示結束畫面
        endSection.classList.remove('hidden');
      }
    });
  }

  handleAviSubmit(aviForm);
  handleAviSubmit(postAviForm);

  // --- 4. 心理位移書寫完成後的跳轉邏輯 ---
  if (finishWritingBtn) {
    finishWritingBtn.addEventListener('click', () => {
      // 隱藏書寫區塊
      writingSection.classList.add('hidden');
      
      // 顯示 AVI 後測表單
      const postForm = document.getElementById('avi-form-post');
      if (postForm) {
        postForm.reset();
        postForm.classList.remove('hidden');
        window.scrollTo(0, 0); // 回到頂部方便填寫
      }
    });
  }
});