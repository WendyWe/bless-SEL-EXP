const steps = [
    "請找個安靜的空間，讓我們準備開始",
    "感覺腳底踩地的觸感",
    "找出你看到的 5 樣東西",
    "感受 4 種不同的觸感",
    "注意 3 種你聽到的聲音",
    "留意 2 種你聞到的氣味",
    "感覺嘴裡的味道或想吃的東西",
    "回到整個身體，感覺你在這裡",
    "做幾個深呼吸，慢慢回到現在"
];

const timings = [
    8000, 
    8000,  
    10000,  
    10000,
    10000,
    10000,
    10000,
    15000, 
    15000, 
];

let currentStep = 0;

function showNextStep() {
    if (currentStep < steps.length) {
        document.getElementById("stepText").innerText = steps[currentStep];
        const delay = timings[currentStep]; // 根據對應秒數設定 delay
        currentStep++;
        setTimeout(showNextStep, delay);
    } else {
        document.getElementById("endOptions").style.display = "block";
    }
}

function startGrounding() {
    const audio = document.getElementById("groundingAudio");
    audio.play().catch(() => {
        console.log("語音播放被阻擋");
    });

    showNextStep();
}

// 取得返回按鈕元素
const backBtn = document.getElementById("backBtn");

// 【修正返回邏輯】: 點擊按鈕時強制導航回 calm.html 觸發 Affect Grid
if (backBtn) {
    backBtn.onclick = function () {
        // 因為 grounding.html 和 calm.html 在同一個 /calm_down_kit/ 目錄下
        window.location.href = "calm.html"; 
    };
}
// 注意：原來的 HTML 是 <button onclick="window.location.href='index.html'">回首頁</button>
// 這裡沒有改動，但如果 '回首頁' 也要回到 calm.html，請記得修改 endOptions 裡的按鈕。