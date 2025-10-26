function startSession() {
  const audio = document.getElementById("meditationAudio");
  const finishBtn = document.querySelector(".finish-btn");

  // 播放音檔
  audio.play().catch(err => {
    console.log("Auto-play blocked by browser. User interaction needed.");
  });

  // 20 秒後淡入出現完成按鈕
  setTimeout(() => {
    finishBtn.classList.add("visible");
  }, 20000);
}
