// ✅ 1️⃣ 全域變數與初始化
const userId = localStorage.getItem("userId");
const startTime = Date.now(); // 記錄進入頁面時間，用以計算 duration

if (!userId) {
    console.error("❌ userId not found in localStorage");
}

// 取得當前文章索引 (從 localStorage)
function getCurrentArticleIndex() {
    return parseInt(localStorage.getItem("dailyArticleIndex") || "1", 10);
}

// --- 🎯 DOM 元素抓取 ---
const titleEl = document.getElementById("article-title");
const contentEl = document.getElementById("article-content");
const textarea = document.getElementById("reflection-input"); // 統一變數名稱，修正 ReferenceError
const finishBtn = document.getElementById("finish-btn");
const charCount = document.getElementById("char-count");

/* -------------------------------
   📖 1. 每日文章載入邏輯
---------------------------------*/
async function loadArticle() {
    try {
        const articleIndex = getCurrentArticleIndex();
        
        // ① 取得今日文章資訊 (串接 server.js 的 /api/daily-article)
        const metaRes = await fetch(
           `/api/daily-article?source=study&index=${articleindex}`
        );
        if (!metaRes.ok) throw new Error("每日文章 API 載入失敗");

        const meta = await metaRes.json();

        // ② 根據回傳的 URL 取得文章 HTML 內容
        const articleRes = await fetch(meta.url);
        if (!articleRes.ok) throw new Error("文章內容載入失敗");

        const articleHtml = await articleRes.text();

        // ③ 顯示文章內容與標題
        titleEl.textContent = `第 ${meta.articleIndex} 篇文章`;
        contentEl.innerHTML = articleHtml;
        
        // 將文章索引暫存在 dataset 中，供後續儲存心得時讀取
        titleEl.dataset.articleIndex = meta.articleIndex;

    } catch (err) {
        console.error("載入文章發生錯誤:", err);
        titleEl.textContent = "載入失敗";
        contentEl.innerHTML = "<p>今日文章目前無法顯示，請重新整理頁面試試。</p>";
    }
}

/* -------------------------------
   ✍️ 2. 心得輸入監測 (含中文輸入法 IME 優化)
---------------------------------*/
const MIN_LENGTH = 20;
let isComposing = false; // 追蹤是否正在組字 (如注音、拼音輸入中)

function updateCount() {
    if (!textarea) return;
    
    // 取得當前字數
    const textLength = textarea.value.length; 
    charCount.textContent = `目前字數：${textLength} / ${MIN_LENGTH}`;
    
    // 只有在「非組字狀態」下，才根據字數判斷是否啟用按鈕
    if (!isComposing && finishBtn) {
        finishBtn.disabled = textLength < MIN_LENGTH;
    }
}

// --- 新增：禁止貼上功能 ---
textarea.addEventListener("paste", (e) => {
    e.preventDefault(); // 攔截貼上動作
    alert("為了確保學習效果，心得區域請手動輸入，禁止直接貼上內容。");
});

// --- 新增：禁止拖放功能 (防止滑鼠選取文字後直接拖進框內) ---
textarea.addEventListener("drop", (e) => {
    e.preventDefault();
    alert("請手動輸入心得，禁止拖放文字。");
});

// 處理中文輸入法：開始組字
textarea.addEventListener("compositionstart", () => { 
    isComposing = true; 
});

// 處理中文輸入法：結束組字 (完成選字)
textarea.addEventListener("compositionend", () => {
    isComposing = false;
    updateCount(); 
});

// 任何輸入變化都會觸發字數更新
textarea.addEventListener("input", updateCount);

/* -------------------------------
   🚀 3. 完成閱讀：儲存心得至 study_reflections 表
---------------------------------*/
finishBtn.addEventListener('click', async () => {
        const reflectionText = textarea.value.trim();
        // 計算閱讀總時長 (秒)
        const duration = (Date.now() - startTime) / 1000; 

        // 準備傳送至專屬表格的資料
        const payload = {
            articleIndex: titleEl.dataset.articleIndex || getCurrentArticleIndex(),
            articleTitle: titleEl.innerText,
            reflectionText: reflectionText,
            duration: duration
        };

        try {
            // 呼叫 server.js 中對應的新 API
            const res = await fetch('/api/study/save-reflection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                console.log("✅ 心得儲存成功");
            } else {
                console.warn("⚠️ 心得儲存失敗:", data.message);
            }
        } catch (err) {
            console.error("❌ 提交心得時出錯:", err);
        } finally {
            // C. 🎯 無論儲存是否成功，都執行您原本的 postMessage 告知父頁面執行後測
            console.log("📖 通知父頁面顯示後測...");
            window.parent.postMessage(
                { type: "practice-finished", practice: "study" }, 
                "*"
            );
        }
    });

/* -------------------------------
   🏁 4. 頁面初始化
---------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
    loadArticle(); // 載入文章
    updateCount(); // 初始化按鈕狀態 (預設禁用)
});
