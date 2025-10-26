const circle = document.getElementById('breathing-circle');
const instruction = document.getElementById('instruction');
const countdown = document.getElementById('countdown');
const music = document.getElementById('bg-music');
const backButton = document.getElementById('back-button');
const startOverlay = document.getElementById('start-overlay');
const finishBtn = document.querySelector('.finish-btn');

// 🧘 呼吸循環
function startCountdown(duration) {
  let timeLeft = duration;
  countdown.innerText = `${timeLeft} 秒`;
  const timer = setInterval(() => {
    timeLeft--;
    countdown.innerText = `${timeLeft} 秒`;
    if (timeLeft <= 0) clearInterval(timer);
  }, 1000);
}

function breathingCycle() {
  instruction.innerText = "邀請您跟著圓圈的擴大 \n 吸氣…";
  startCountdown(4);
  circle.style.transform = "scale(1.5)";
  circle.style.background = "radial-gradient(circle, #90cdf4, #63b3ed)";
  circle.style.boxShadow = "0 0 40px rgba(99, 179, 237, 0.7)";

  setTimeout(() => {
    instruction.innerText = "秉住呼吸 \n 停留…";
    startCountdown(4);

    setTimeout(() => {
      instruction.innerText = "邀請您跟著圓圈的縮小 \n 吐氣…";
      startCountdown(4);
      circle.style.transform = "scale(1)";
      circle.style.background = "radial-gradient(circle, #bee3f8, #90cdf4)";
      circle.style.boxShadow = "0 0 20px rgba(144, 205, 244, 0.5)";

      setTimeout(() => {
        instruction.innerText = "秉住呼吸 \n 停留…";
        startCountdown(4);
        setTimeout(breathingCycle, 4000);
      }, 4000);
    }, 4000);
  }, 4000);
}

// 🎵 開始呼吸
function startBreathing() {
  music.play().catch(()=>{}); // 防止自動播放錯誤
  startOverlay.style.display = "none";
  breathingCycle();

  // 🕊️ 60秒後淡入「完成練習」按鈕
  setTimeout(() => {
    finishBtn.classList.add("visible");
  }, 20000);
}

// 📍事件綁定
startOverlay.addEventListener('click', startBreathing);
