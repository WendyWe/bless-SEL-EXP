document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("start-btn");
  const bubbleContainer = document.getElementById("bubble-container");
  const timerSpan = document.getElementById("time");
  const statsDiv = document.getElementById("stats");
  const finishBtn = document.getElementById("finish-btn");
  const gameContainer = document.getElementById("game-container");
  const backButton = document.getElementById("back-button");

  let bubblesPopped = 0;
  let gameTime = 60;
  let gameInterval;
  let spawnInterval;
  let gameRunning = false;

  // === 建立泡泡 ===
  function createBubble() {
    const bubble = document.createElement("div");
    bubble.classList.add("bubble");

    const size = Math.random() * 80 + 20; // 20~100px
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${Math.random() * (bubbleContainer.offsetWidth - size)}px`;
    bubble.style.top = `${Math.random() * (bubbleContainer.offsetHeight - size)}px`;
    bubble.style.backgroundColor = `rgba(100, 200, 255, ${Math.random() * 0.5 + 0.5})`;

    bubble.addEventListener("click", () => {
      bubble.remove();
      bubblesPopped++;
      updateStats();
    });

    bubbleContainer.appendChild(bubble);

    // 泡泡自動消失
    setTimeout(() => {
      if (bubble.parentElement) bubble.remove();
    }, 4000);
  }

  // === 更新統計 ===
  function updateStats() {
    statsDiv.textContent = `已點擊泡泡數：${bubblesPopped}`;
  }

  // === 開始遊戲 ===
  function startGame() {
    if (gameRunning) return;
    gameRunning = true;
    gameContainer.classList.remove("hidden");
    startBtn.classList.add("hidden");

    bubblesPopped = 0;
    gameTime = 60;
    updateStats();
    timerSpan.textContent = gameTime;

    spawnInterval = setInterval(createBubble, 400);
    gameInterval = setInterval(() => {
      gameTime--;
      timerSpan.textContent = gameTime;
      if (gameTime <= 0) endGame();
    }, 1000);
  }

  // === 結束遊戲 ===
  function endGame() {
    clearInterval(spawnInterval);
    clearInterval(gameInterval);
    gameRunning = false;

    // 🧹 立即清除所有泡泡
    bubbleContainer.innerHTML = "";

    // 計算平均速率
    const averageRate = (bubblesPopped / 60).toFixed(2);

    // 顯示統計結果
    statsDiv.innerHTML = `
      <p>🎯 你在 60 秒內共點擊了 <strong>${bubblesPopped}</strong> 個泡泡！</p>
      <p>⏱️ 平均每秒點擊 <strong>${averageRate}</strong> 個泡泡。</p>
      <p>🌿 做得很好，現在可以深呼吸一下，感受片刻的平靜。</p>
    `;

    // 🔔 立即將統計區帶入畫面中央
    statsDiv.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // === 按鈕事件 ===
  startBtn.addEventListener("click", startGame);

  finishBtn.addEventListener("click", () => {
    window.parent.postMessage({ type: "practice-finished", practice: "game" }, "*");
  });

  backButton.addEventListener("click", goBack);
});
