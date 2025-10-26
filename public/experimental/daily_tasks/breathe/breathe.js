const controlButton = document.getElementById('control');
const resultDiv = document.getElementById('result');
const balloon = document.getElementById('balloon');

let stage = 0;
let startTime = 0;
let timings = [];
let balloonInterval;
let balloonScale = 1; // Track the balloon's current size

function handleButtonClick() {
    const currentTime = Date.now();

    if (stage === 0) {
        // Start timing for I and balloon animation
        startTime = currentTime;
        startBalloonAnimation();
        controlButton.textContent = "Stop屏氣 (S)";
        stage = 1;
    } else if (stage === 1) {
        // Stop timing for I, maintain balloon size, and start timing for S
        stopBalloonAnimation(false); // Maintain the current balloon size
        timings[0] = (currentTime - startTime) / 1000;
        startTime = currentTime;
        controlButton.textContent = "Exhale吐氣 (E)";
        stage = 2;
    } else if (stage === 2) {
        // Stop timing for S, start timing for E and prepare to shrink balloon
        timings[1] = (currentTime - startTime) / 1000;
        startTime = currentTime;
        controlButton.textContent = "Show Results";
        startBalloonShrinking(); // Shrink balloon during exhale
        stage = 3;
    } else if (stage === 3) {
        // Stop timing for E, show results
        timings[2] = (currentTime - startTime) / 1000;
        showResults();
        resetTimer();
    }
}

function startBalloonAnimation() {
    balloonInterval = setInterval(() => {
        balloonScale += 0.05; // Gradually increase balloon size
        balloon.style.transform = `scale(${balloonScale})`;
    }, 100);
}

function startBalloonShrinking() {
    clearInterval(balloonInterval); // Stop any ongoing growing animation
    balloonInterval = setInterval(() => {
        if (balloonScale > 1) {
            balloonScale -= 0.05; // Gradually decrease balloon size
            balloon.style.transform = `scale(${balloonScale})`;
        } else {
            balloonScale = 1; // Ensure it resets exactly to the original size
            balloon.style.transform = `scale(1)`;
            clearInterval(balloonInterval);
        }
    }, 100);
}

function stopBalloonAnimation(resetSize) {
    clearInterval(balloonInterval);
    if (resetSize) {
        balloonScale = 1; // Reset balloon size if specified
        balloon.style.transform = `scale(${balloonScale})`;
    }
}

function showResults() {
    const [inhaleTime, holdTime, exhaleTime] = timings;
    resultDiv.innerHTML = `吸氣時間: ${inhaleTime.toFixed(2)} 秒<br>
                           屏氣時間: ${holdTime.toFixed(2)} 秒<br>
                           吐氣時間: ${exhaleTime.toFixed(2)} 秒`;

    if (exhaleTime > 6 && exhaleTime > inhaleTime) {
    // 獎勵條件
     resultDiv.innerHTML += `<br><span class="reward">當您吐氣時間超過6秒且大於吸氣時間，<br>將有助於減緩心率和壓力！</span>`;
    } else if (exhaleTime < 6) {
     // 提醒條件
    resultDiv.innerHTML += `<br><span class="reminder">請慢下呼吸，試著吸氣 4 秒、 屏氣 2 秒、<br>吐氣 6 秒以上。</span>`;
    }
                    }

function resetTimer() {
    stage = 0;
    startTime = 0;
    timings = [];
    balloonScale = 1; // Reset balloon size for the next cycle
    controlButton.textContent = "Inhale吸氣 (I)";
    stopBalloonAnimation(true); // Reset balloon size
}

controlButton.addEventListener('click', handleButtonClick);

// Optional: Add interactivity if needed
document.querySelector('.dropdown-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = document.querySelector('.dropdown-menu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  });
  
  document.body.addEventListener('click', () => {
    document.querySelector('.dropdown-menu').style.display = 'none';
  });