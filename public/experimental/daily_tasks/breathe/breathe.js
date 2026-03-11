const controlButton = document.getElementById('control');
const finishBtn = document.getElementById('finish-btn');
const audio = document.getElementById('meditation-audio');
const audioStatus = document.getElementById('audio-status');
const openInfoBtn = document.getElementById('open-info');
const closeInfoBtn = document.getElementById('close-info');
const infoModal = document.getElementById('info-modal');
const canvas = document.getElementById("waveCanvas");
const ctx = canvas.getContext("2d");

let isPracticing = false;
let animationFrame;
let startTime;

function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function drawWave(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;

    ctx.beginPath();
    ctx.moveTo(0, height / 2);

    const amplitude = height * 0.05; // 波動幅度 5%
    const frequency = 0.01; // 波長
    const speed = 0.0003; // 移動速度

    for (let x = 0; x < width; x++) {
        const y =
            height / 2 +
            Math.sin(x * frequency + time * speed) * amplitude;
        ctx.lineTo(x, y);
    }

    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();

   const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(255,255,255,0.25)");
    gradient.addColorStop(1, "rgba(255,255,255,0.05)");
    ctx.fillStyle = gradient;
        ctx.fill();

    animationFrame = requestAnimationFrame(drawWave);
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
        // 針對 iOS 的優化：確保先 load() 觸發載入
        if (audio.readyState === 0) { 
            audio.load();
        }

        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise.then(_ => {
                // 播放成功
                isPracticing = true;
                controlButton.textContent = "暫停練習";
                drawWave(0);
                audioStatus.textContent = "🎵 冥想導引播放中...";
            }).catch(error => {
                // 播放失敗（通常是權限或格式問題）
                console.error("Playback failed:", error);
                audioStatus.textContent = "❌ 播放失敗，請確認是否關閉靜音模式";
            });
        }
    } else {
        isPracticing = false;
        cancelAnimationFrame(animationFrame);
        controlButton.textContent = "繼續練習";
        audio.pause();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
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