const controlButton = document.getElementById('control');
const balloon = document.getElementById('balloon');
const balloonText = document.getElementById('balloon-text');
const finishBtn = document.getElementById('finish-btn');
const audio = document.getElementById('meditation-audio');
const audioStatus = document.getElementById('audio-status');
const openInfoBtn = document.getElementById('open-info');
const closeInfoBtn = document.getElementById('close-info');
const infoModal = document.getElementById('info-modal');

let isPracticing = false;
let animationFrame;
let startTime;

// 4-2-6 呼吸參數
const INHALE_MS = 4000;
const HOLD_MS = 2000;
const EXHALE_MS = 6000;
const TOTAL_CYCLE_MS = INHALE_MS + HOLD_MS + EXHALE_MS;

// 呼吸動畫邏輯
function updateBreathe() {
    if (!isPracticing) return;
    const elapsed = (Date.now() - startTime) % TOTAL_CYCLE_MS;
    let scale = 1;
    let status = "";

    if (elapsed < INHALE_MS) {
        status = "吸氣...";
        scale = 1 + (elapsed / INHALE_MS) * 1.5;
    } else if (elapsed < INHALE_MS + HOLD_MS) {
        status = "憋氣";
        scale = 2.5;
    } else {
        status = "吐氣...";
        const exhaleElapsed = elapsed - (INHALE_MS + HOLD_MS);
        scale = 2.5 - (exhaleElapsed / EXHALE_MS) * 1.5;
    }

    balloon.style.transform = `scale(${scale})`;
    balloonText.textContent = status;
    animationFrame = requestAnimationFrame(updateBreathe);
}

// 錄音結束後的解鎖機制
audio.onended = function() {
    finishBtn.disabled = false;
    audioStatus.textContent = "✅ 冥想已完成，您可以點擊完成練習了。";
    audioStatus.style.color = "#70c98b";
    // 錄音結束後可以自動停止呼吸動畫，或讓使用者手動點擊停止
};

function togglePractice() {
    if (!isPracticing) {
        // 開始練習
        isPracticing = true;
        startTime = Date.now();
        controlButton.textContent = "暫停練習";
        audio.play(); // 播放錄音
        updateBreathe();
        audioStatus.textContent = "🎵 冥想導引播放中...";
    } else {
        // 暫停練習
        isPracticing = false;
        cancelAnimationFrame(animationFrame);
        controlButton.textContent = "繼續練習";
        audio.pause(); // 暫停錄音
        balloonText.textContent = "已暫停";
    }
}

// 開啟視窗
openInfoBtn.onclick = function() {
    infoModal.style.display = 'flex';
}

// 點擊叉叉關閉
closeInfoBtn.onclick = function() {
    infoModal.style.display = 'none';
}

// 點擊視窗外部也可以關閉 (如同你圖檔所述)
window.onclick = function(event) {
    if (event.target == infoModal) {
        infoModal.style.display = 'none';
    }
}

controlButton.addEventListener('click', togglePractice);