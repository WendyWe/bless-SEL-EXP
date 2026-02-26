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

  // --- 4. 心理位移書寫完成後的跳轉與儲存邏輯 ---
  if (finishWritingBtn) {
    finishWritingBtn.addEventListener('click', async () => {
      // 1. 定義欄位與對應的中文名稱，方便提示使用者
      const fields = [
        { id: 'self', name: '我的位格' },
        { id: 'you', name: '你的位格' },
        { id: 'he', name: '他的位格' },
        { id: 'back', name: '回到我的位格' },
        { id: 'reflect', name: '所思所想' }
      ];

      const writingData = {
        featureType: practiceType || 'writing'
      };

      // 2. 進行必填與字數檢查 (至少 20 字)
      for (const field of fields) {
        const element = document.getElementById(field.id);
        const content = element.value.trim();

        if (content.length === 0) {
          alert(`請填寫「${field.name}」部分。`);
          element.focus(); // 自動跳轉到漏填的框
          return;
        }

        if (content.length < 20) {
          alert(`「${field.name}」內容過短（目前 ${content.length} 字），請至少輸入 20 個字。`);
          element.focus();
          return;
        }

        // 檢查通過，存入要發送的資料物件
        writingData[field.id] = content;
      }

      // 3. 送到後端儲存
      try {
        // 這裡可以加一個讀取中的提示（選配）
        finishWritingBtn.disabled = true;
        finishWritingBtn.innerText = "儲存中...";

        const response = await fetch('/api/writing/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(writingData)
        });
        
        if (!response.ok) throw new Error('儲存失敗');
        console.log('書寫內容已成功儲存');

        // 4. 成功後切換介面
        writingSection.classList.add('hidden');
        const postForm = document.getElementById('avi-form-post');
        if (postForm) {
          postForm.reset();
          postForm.classList.remove('hidden');
          window.scrollTo(0, 0); 
        }
      } catch (err) {
        console.error('儲存書寫內容時發生錯誤:', err);
        alert('連線失敗，請再試一次');
      } finally {
        // 恢復按鈕狀態
        finishWritingBtn.disabled = false;
        finishWritingBtn.innerText = "完成並繼續";
      }
    });
  }

  // --- 5. 即時字數統計監聽 ---
  const textAreas = ['self', 'you', 'he', 'back', 'reflect'];

  textAreas.forEach(id => {
    const area = document.getElementById(id);
    const hint = document.getElementById(`${id}-hint`);

    if (area && hint) {
      area.addEventListener('input', () => {
        const count = area.value.trim().length;
        hint.innerText = `目前字數：${count} / 20`;
        
        // 視覺反饋：達到 20 字變綠色，沒達到是紅色或灰色
        if (count >= 20) {
          hint.style.color = "#2ecc71"; // 綠色
          hint.style.fontWeight = "bold";
        } else {
          hint.style.color = "#e74c3c"; // 紅色
          hint.style.fontWeight = "normal";
        }
      });
    }
  });
});