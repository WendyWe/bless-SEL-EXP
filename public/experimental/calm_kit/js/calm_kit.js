const gridContainer = document.querySelector('.grid-container');
const feedback = document.getElementById('feedback');
const confirmBtn = document.getElementById('confirm-btn');
const affectSection = document.getElementById("affectgrid-section");
const mainContainer = document.querySelector(".container");

let selectedSquare = null;
let mode = "enter"; // "enter" = 進入時, "exit" = 離開時
let chosenFunction = null; // 使用者選過的功能

// 顏色邏輯
const getColor = (x, y) => {
    if (y > 5 && x > 5) return "rgba(255, 215, 0, 0.8)";
    if (y > 5 && x < 5) return "rgba(255, 69, 58, 0.8)";
    if (y < 5 && x > 5) return "rgba(50, 205, 50, 0.8)";
    if (y < 5 && x < 5) return "rgba(65, 105, 225, 0.8)";
    return "rgba(200,200,200,0.5)";
};

// 建立 Affect Grid
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
            feedback.textContent = `已選擇您${mode === "enter" ? "進入時" : "離開時"}的情緒狀態：X = ${x}, Y = ${y}`;
        });

        gridContainer.appendChild(gridItem);
    }
}

// 點擊送出按鈕
confirmBtn.addEventListener("click", () => {
    if (!selectedSquare) {
        alert("請先點選一個格子！");
        return;
    }

    // 準備要傳送的資料
    const payload = {
        userId: localStorage.getItem("userId"),
        mode: mode, // 這裡是 "enter" 或 "exit"
        x: selectedSquare.x,
        y: selectedSquare.y
    };
    
    // 傳送到 Server (假設 API 路徑為 /api/save-mood)
    fetch('../api/save-mood.php', { // 根據你的後端檔名調整
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            handleFlowAfterSave(); 
        }
    })
    .catch(err => console.error("Error:", err));
});
    
    // 封裝原本的換頁邏輯
    function handleFlowAfterSave() {
    if (mode === "enter") {
        affectSection.classList.add("hidden");
        mainContainer.classList.remove("hidden");
        mode = "function";
        feedback.textContent = "";
        selectedSquare = null; // 清除選擇，準備給後測使用
    } else if (mode === "exit") {
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

