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

    if (mode === "enter") {
        // 進入階段：顯示功能選單
        affectSection.classList.add("hidden");
        mainContainer.classList.remove("hidden");
        mode = "function"; // 進入功能選擇階段
        feedback.textContent = "";
    } 
    else if (mode === "exit") {
        // 離開階段：回首頁
        alert("謝謝你願意花時間照顧自己。\n希望現在的你，比剛剛更安穩一些。");
        window.location.href = "../index.html";
    }
});

// 功能選擇（只能選一次）
document.querySelectorAll(".option-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (chosenFunction) {
            alert("您已經選擇過一個功能，請完成後再回到首頁。");
            return;
        }
        chosenFunction = btn.dataset.target;
        window.location.href = chosenFunction;
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

