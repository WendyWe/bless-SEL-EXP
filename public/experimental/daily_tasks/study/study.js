document.addEventListener("DOMContentLoaded", async () => {
  const titleEl = document.getElementById("article-title");
  const dateEl = document.getElementById("article-date");
  const contentEl = document.getElementById("article-content");
  const finishBtn = document.getElementById("finish-btn");

  try {
    // 從後端抓每日文章
    const res = await fetch("/api/daily-article");
    if (!res.ok) throw new Error("文章載入失敗");

    const data = await res.json();

    // 填入文章
    titleEl.textContent = data.title || "今日文章";
    dateEl.textContent = data.date || "";
    contentEl.innerHTML = data.content || "<p>今日沒有內容</p>";

  } catch (err) {
    console.error(err);
    titleEl.textContent = "載入失敗";
    contentEl.innerHTML = "<p>抱歉，文章目前無法載入。</p>";
  }

  // ⭐ 完成閱讀 → 通知父頁
  finishBtn.addEventListener("click", () => {
    window.parent.postMessage({ type: "practice-finished", practice: "education" }, "*");
  });
});
