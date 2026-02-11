const music = document.getElementById('bg-music');
const startOverlay = document.getElementById('start-overlay');
const finishBtn = document.querySelector('.finish-btn');
const statusHint = document.getElementById('status-hint');

function startBreathing() {
    // 1. 播放音樂
    music.play().catch(err => console.log("音樂播放受阻:", err));
    
    // 2. 淡出並移除開始遮罩
    startOverlay.style.transition = "opacity 1s ease";
    startOverlay.style.opacity = "0";
    
    setTimeout(() => {
        startOverlay.style.display = "none";
        // 確保提示文字是顯示的
        statusHint.style.display = "block";
        // 稍微延遲一下觸發 opacity，確保 transition 動畫能跑出來
        setTimeout(() => {
            statusHint.style.opacity = "1";
        }, 50); 
    }, 1000);

    // 改用監聽器：當音樂播放結束時，自動觸發按鈕出現
    music.onended = function() {
        statusHint.style.opacity = "0"; 
        setTimeout(() => {
            statusHint.style.display = "none";
            finishBtn.classList.add("visible");
        }, 1000);
    }; 
}

startOverlay.addEventListener('click', startBreathing);