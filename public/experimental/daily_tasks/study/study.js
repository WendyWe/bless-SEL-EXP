
document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("reflection-input");
  const finishBtn = document.getElementById("finish-btn"); // 假設這個 ID 正確
  const charCount = document.getElementById("char-count");

  const MIN_LENGTH = 20;
  // 由於 finishBtn 不在您提供的 HTML 片段中，我們先假設它存在
  if (finishBtn) {
    finishBtn.disabled = true;
  }

  // 此旗標用來處理中文輸入法，但我們將修改它的使用方式
  let isComposing = false; 

  function updateCount() {
    // 移除 .trim()，避免因純空白字元無法達標
    const textLength = textarea.value.length; 
    
    // 即使在組字過程中，我們仍然顯示當前輸入框中的字元數 (可能是未確定的拼音或注音)
    charCount.textContent = `目前字數：${textLength} / ${MIN_LENGTH}`;
    
    // 只有在非組字狀態下，才判斷是否啟用按鈕
    if (!isComposing && finishBtn) {
      finishBtn.disabled = textLength < MIN_LENGTH;
    }
    
    // console.log(`Count: ${textLength}, Composing: ${isComposing}`); // 可用於除錯
  }

  // 1. 組字開始：設定旗標
  textarea.addEventListener("compositionstart", () => {
    isComposing = true;
  });

  // 2. 組字結束：清除旗標，並確保字數和按鈕狀態更新
  textarea.addEventListener("compositionend", () => {
    isComposing = false;
    updateCount(); // 確保組字完成時立即更新按鈕狀態
  });

  // 3. 任何輸入變化：即時更新字數顯示
  // 這個事件在中文輸入法下，組字和確定輸入都會觸發
  textarea.addEventListener("input", updateCount);
  
  // 載入時執行一次，以防輸入框有預設值
  updateCount();
});

document.addEventListener("DOMContentLoaded", async () => {
  const titleEl = document.getElementById("article-title");
  const dateEl = document.getElementById("article-date");
  const contentEl = document.getElementById("article-content");
  const finishBtn = document.getElementById("finish-btn");

  try {
    // ① 取得今日文章資訊
    const metaRes = await fetch("/api/daily-article");
    if (!metaRes.ok) throw new Error("每日文章 API 載入失敗");

    const meta = await metaRes.json();

    // ② 取得文章 HTML 內容
    const articleRes = await fetch(meta.url);
    if (!articleRes.ok) throw new Error("文章內容載入失敗");

    const articleHtml = await articleRes.text();

    // ③ 顯示文章
    titleEl.textContent = "今日文章";
    dateEl.textContent = `Day ${meta.day}`;
    contentEl.innerHTML = articleHtml;

  } catch (err) {
    console.error(err);
    titleEl.textContent = "載入失敗";
    contentEl.innerHTML = "<p>今日文章目前無法顯示。</p>";
  }

  // 完成閱讀
  finishBtn.addEventListener("click", () => {
    window.parent.postMessage(
      { type: "practice-finished", practice: "education" },
      "*"
    );
  });
});

