const instruction = document.getElementById('instruction');
const countdown = document.getElementById('countdown');
const music = document.getElementById('bg-music');
const startOverlay = document.getElementById('start-overlay');
const finishBtn = document.querySelector('.finish-btn');
const statusHint = document.getElementById('status-hint');

function startCountdown(duration) {
    let timeLeft = duration;
    countdown.innerText = `${timeLeft} 秒`;
    const timer = setInterval(() => {
        timeLeft--;
        if (timeLeft >= 0) countdown.innerText = `${timeLeft} 秒`;
        if (timeLeft <= 0) clearInterval(timer);
    }, 1000);
}

function breathingCycle() {
    instruction.innerText = "吸氣…";
    startCountdown(4);
    setTimeout(() => {
        instruction.innerText = "停留…";
        startCountdown(4);
        setTimeout(() => {
            instruction.innerText = "吐氣…";
            startCountdown(4);
            setTimeout(() => {
                instruction.innerText = "停留…";
                startCountdown(4);
                setTimeout(breathingCycle, 4000);
            }, 4000);
        }, 4000);
    }, 4000);
}

function startBreathing() {
    music.play().catch(() => {});
    
    // 淡出開始遮罩
    startOverlay.style.transition = "opacity 1s ease";
    startOverlay.style.opacity = "0";
    
    setTimeout(() => {
        startOverlay.style.display = "none";
        statusHint.style.display = "block"; // 顯示底部提醒
        breathingCycle();
    }, 1000);

    // 20秒後邏輯：隱藏提醒、出現居中按鈕、停止呼吸文字
    setTimeout(() => {
        statusHint.style.opacity = "0";
        instruction.style.opacity = "0"; // 隱藏呼吸指導，讓畫面乾淨留給按鈕
        countdown.style.opacity = "0";
        
        setTimeout(() => {
            statusHint.style.display = "none";
            finishBtn.classList.add("visible");
        }, 1000);
    }, 20000);
}

startOverlay.addEventListener('click', startBreathing);