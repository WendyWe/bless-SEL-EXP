const vSlider = document.getElementById('valence-slider');
const aSlider = document.getElementById('arousal-slider');
const vText = document.getElementById('valence-text');
const aText = document.getElementById('arousal-text');
const feedback = document.getElementById('feedback');
const confirmBtn = document.getElementById('confirm-btn');
const affectSection = document.getElementById("affectgrid-section");
const mainContainer = document.querySelector(".container");

let selectedSquare = { x: 50, y: 50 }; // 預設中間值
let mode = "enter"; 
let chosenFunction = null;
let startTime = null;
let currentKitType = null;


// --- 滑桿即時更新邏輯 ---
function handleSliderInput() {
    const v = parseInt(vSlider.value);
    const a = parseInt(aSlider.value);

    // 更新愉悅度文字
    if (v < 35) vText.textContent = "不愉快";
    else if (v > 65) vText.textContent = "愉快";
    else vText.textContent = "普通";

    // 更新能量感文字
    if (a < 35) aText.textContent = "疲累 / 平靜";
    else if (a > 65) aText.textContent = "亢奮 / 激動";
    else aText.textContent = "中等";

    // 更新要存入的數值 (1-100)
    selectedSquare = { x: v, y: a };
    feedback.textContent = `已調整好${mode === "enter" ? "進入前" : "練習後"}的狀態`;
}

vSlider.addEventListener('input', handleSliderInput);
aSlider.addEventListener('input', handleSliderInput);

// --- 送出按鈕與後端對接 ---
confirmBtn.addEventListener("click", () => {
    let duration = 0;
    if (mode === "exit" && startTime) {
        duration = (Date.now() - startTime) / 1000;
    }

    const payload = {
        userId: localStorage.getItem("userId"),
        mode: mode, 
        x: selectedSquare.x, // 直接傳送 1-100
        y: selectedSquare.y, // 直接傳送 1-100
        kitType: currentKitType,
        duration: duration
    };
    
    fetch('/api/calm-kit/save-mood', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            handleFlowAfterSave(); 
        } else {
            console.error("儲存失敗:", data.message);
            handleFlowAfterSave(); // 即使失敗也讓使用者繼續流程
        }
    })
    .catch(error => {
        console.error("網路請求出錯:", error);
        handleFlowAfterSave(); 
    });
});

function handleFlowAfterSave() {
    if (mode === "enter") {
        affectSection.classList.add("hidden");
        mainContainer.classList.remove("hidden");
        mode = "function";
        feedback.textContent = "";
        // 重置滑桿位置給離開時評量
        vSlider.value = 50; aSlider.value = 50;
        handleSliderInput();
    } else if (mode === "exit") {
        sessionStorage.removeItem('kitStartTime');
        sessionStorage.removeItem('kitType');
        alert("謝謝你願意花時間照顧自己。\n希望現在的你，比剛剛更安穩一些。");
        window.location.href = "../index.html";
    }
}

// 功能選擇（只能選一次）
document.querySelectorAll(".option-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        e.preventDefault();
       
        if (chosenFunction) {
            alert("您已經選擇過一個功能，請完成後再回到首頁。");
            return;
        }

        // 2. 取得按鈕標題來決定顯示的時間
        const title = btn.querySelector('.option-title').innerText;
        let timeMsg = "3~5"; // 預設值
        
        if (title.includes("冷靜")) timeMsg = "3";
        if (title.includes("痛苦")) timeMsg = "5";
        if (title.includes("腦袋很亂")) timeMsg = "10";

        // 3. 彈出確認視窗
        const confirmMessage = `接下來約莫會花費你 ${timeMsg} 分鐘的時間練習。\n為了能穩定的接住情緒，建議給自己一段不被打擾的時間，直到練習結束。\n\n你準備好開始了嗎`;

        if (confirm(confirmMessage)) {
            // --- 💡 新增：跳轉前存入時間與功能名稱 ---
            sessionStorage.setItem('kitStartTime', Date.now());
            sessionStorage.setItem('kitType', title);
            chosenFunction = btn.dataset.target;
            // 執行跳轉
            window.location.href = chosenFunction;
        } else {
            // 使用者按取消，什麼都不做，留在原頁面
            console.log("使用者尚未準備好開始練習");
        }
    });
});

// 從功能頁面回來 → 必須再評一次情緒
window.addEventListener("load", () => {
    // 用 URL 判斷使用者從功能頁面回來
    const url = new URL(window.location.href);
    if (url.searchParams.get("from") === "functionDone") {
        // --- 💡 新增：從暫存中抓回練習時的資訊 ---
        startTime = sessionStorage.getItem('kitStartTime');
        currentKitType = sessionStorage.getItem('kitType');
        
        mode = "exit"; // 切換為離開時情緒
        affectSection.classList.remove("hidden");
        mainContainer.classList.add("hidden");
        feedback.textContent = "請選擇您離開時的情緒狀態";
        chosenFunction = null; // 重置
    }
});
// === 回到首頁按鈕 ===

// 處理「回到首頁」的通用邏輯
function goHome(e) {
  e.preventDefault();

  const targetUrl = "../index.html";
  console.log("🔁 導向:", targetUrl);

  window.location.href = targetUrl;
}

// 1️⃣ 第一顆按鈕（affect grid 階段）
const backHomeAG = document.getElementById("back-home-ag");
if (backHomeAG) {
  console.log("✅ 綁定 back-home-ag");
  backHomeAG.addEventListener("click", goHome);
} else {
  console.warn("⚠️ 找不到 #back-home-ag");
}

// 2️⃣ 第二顆按鈕（功能選單階段）
const backHome = document.getElementById("back-home");
if (backHome) {
  console.log("✅ 綁定 back-home");
  backHome.addEventListener("click", goHome);
} else {
  console.warn("⚠️ 找不到 #back-home");
}

