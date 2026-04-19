document.addEventListener("DOMContentLoaded", () => {

  const app = document.getElementById("app");
  const dailyBtn = document.getElementById("btn-daily");
  const aidBtn = document.getElementById("btn-aid");
  const guideBtn = document.getElementById("btn-guide");
  const logoutBtn = document.getElementById("logoutBtn");

  const modal = document.getElementById("guideModal");
  const closeBtn = document.querySelector(".close-btn");

  /* -------------------------------
     🎯 本日任務
  ---------------------------------*/
  if (dailyBtn) {
    dailyBtn.addEventListener("click", () => {

      const warningMessage =
        "提醒：進入「本日任務」後，須完成完整練習（含影片、前後心情記錄、安頓練習），否則將不視為完整使用，後續使用時間的獎勵可能會受影響。\n\n確定要開始今日任務嗎？";

      if (!confirm(warningMessage)) return;

      app.style.transition = "opacity 0.8s";
      app.style.opacity = "0";

      setTimeout(() => {
        window.location.href = "/experimental/daily_tasks/index.html";
      }, 800);
    });
  }

  /* -------------------------------
     🌿 情緒急救包
  ---------------------------------*/
  if (aidBtn) {
    aidBtn.addEventListener("click", () => {

      app.style.transition = "opacity 0.8s";
      app.style.opacity = "0";

      setTimeout(() => {
        window.location.href = "/experimental/calm_kit/index.html";
      }, 800);
    });
  }

  /* -------------------------------
     📘 使用說明彈窗
  ---------------------------------*/
  if (guideBtn && modal && closeBtn) {

    guideBtn.addEventListener("click", () => {
      modal.style.display = "block";
    });

    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });

    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });
  }

  /* -------------------------------
     🚪 登出（由 server session 控制）
  ---------------------------------*/
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await fetch("/api/logout", { method: "POST" });
      } catch (err) {
        console.error("Logout error:", err);
      }

      window.location.href = "/";
    });
  }

  /* -------------------------------
     ✨ 游標光點效果
  ---------------------------------*/
  const follower = document.getElementById("cursor-follower");

  if (follower) {
    document.addEventListener("mousemove", (e) => {
      follower.style.left = e.clientX - 10 + "px";
      follower.style.top = e.clientY - 10 + "px";
    });

    document.addEventListener("mousedown", () => {
      follower.style.transform = "scale(0.8)";
    });

    document.addEventListener("mouseup", () => {
      follower.style.transform = "scale(1)";
    });
  }

});
