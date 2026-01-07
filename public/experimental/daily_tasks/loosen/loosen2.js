/* ================== DOM ================== */
const rulesEl = document.getElementById("rules");
const stimEl = document.getElementById("stim");
const arrowEl = document.getElementById("arrow");
const wordEl = document.getElementById("word");
const fixEl = document.getElementById("fix");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const exitBtn = document.getElementById("exitBtn");
const dirControls = document.getElementById("dirControls");
const colorControls = document.getElementById("colorControls");

/* ================== 常數 ================== */
const COLORS = [
  { name: "紅", hex: "#ff5c7a" },
  { name: "藍", hex: "#5c7aff" },
  { name: "黃", hex: "#f2c94c" },
  { name: "綠", hex: "#35d07f" }
];

const DIRECTIONS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
const DIR_LABEL = { ArrowUp: "上", ArrowDown: "下", ArrowLeft: "左", ArrowRight: "右" };
const DIR_SYMBOL = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→" };

const STREAK_TO_UNLOCK = 10;
const LEVEL2_TOTAL_TRIALS = 3;

/* ================== 狀態 ================== */
let level = 1;
let ruleMap = {};
let currentCorrect = null;
let awaitingResponse = false;
let correctStreak = 0;
let totalErrors = 0;
let level2Trials = 0;

/* 資料紀錄 */
let trialIndex = 0;
let trialLog = [];
let trialStartTime = null;

/* ================== 規則生成 ================== */
function generateRules() {
  rulesEl.innerHTML = "";
  rulesEl.classList.remove("hidden");

  if (level === 1) {
    let colorsToUse = [...COLORS];
    let dirsToUse = [...DIRECTIONS];

    if (totalErrors >= 8) {
      colorsToUse = COLORS.slice(0, 2);
      dirsToUse = DIRECTIONS.slice(0, 2);
      statusEl.textContent = "🛡️ 簡單模式：2 色 × 2 方向";
    } else if (totalErrors >= 3) {
      colorsToUse = COLORS.slice(0, 3);
      dirsToUse = DIRECTIONS.slice(0, 3);
      statusEl.textContent = "🛡️ 中等模式：3 色 × 3 方向";
    }

    const shuffled = [...dirsToUse].sort(() => Math.random() - 0.5);
    ruleMap = {};

    document.querySelectorAll("#dirControls button").forEach(btn => {
      btn.classList.toggle("hidden", !dirsToUse.includes(btn.dataset.key));
    });

    colorsToUse.forEach((c, i) => {
      ruleMap[c.name] = shuffled[i];
      const div = document.createElement("div");
      div.className = "rule";
      div.textContent = `${c.name} → ${DIR_LABEL[shuffled[i]]}`;
      rulesEl.appendChild(div);
    });

    dirControls.classList.remove("hidden");
    colorControls.classList.add("hidden");
  } else {
    const div = document.createElement("div");
    div.className = "rule";
    div.style.gridColumn = "span 2";
    div.innerHTML = "🎯 <strong>Level 2</strong><br>請按【文字的顏色】";
    rulesEl.appendChild(div);

    dirControls.classList.add("hidden");
    colorControls.classList.remove("hidden");
  }
}

/* ================== 倒數 ================== */
function startCountdown() {
  generateRules();
  let count = 5;

  const timer = setInterval(() => {
    statusEl.textContent = `請記住規則... ${count}s`;
    count--;
    if (count < 0) {
      clearInterval(timer);
      rulesEl.classList.add("hidden");
      statusEl.textContent = "開始！";
      startTrial();
    }
  }, 1000);
}

/* ================== 試次流程 ================== */
function startTrial() {
  awaitingResponse = false;
  stimEl.classList.add("hidden");
  fixEl.classList.remove("hidden");
  setTimeout(showStimulus, 500);
}

function showStimulus() {
  fixEl.classList.add("hidden");
  stimEl.style.backgroundColor = "transparent";
  arrowEl.textContent = "";
  wordEl.textContent = "";

  if (level === 1) {
    const activeColors = Object.keys(ruleMap);
    const colorName = activeColors[Math.floor(Math.random() * activeColors.length)];
    const c = COLORS.find(x => x.name === colorName);
    currentCorrect = ruleMap[c.name];
    stimEl.style.backgroundColor = c.hex;
  } else {
    const word = COLORS[Math.floor(Math.random() * COLORS.length)];
    const ink = COLORS[Math.floor(Math.random() * COLORS.length)];
    const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    currentCorrect = ink.name;

    arrowEl.textContent = DIR_SYMBOL[dir];
    wordEl.textContent = word.name;
    wordEl.style.color = ink.hex;
  }

  stimEl.classList.remove("hidden");
  awaitingResponse = true;
  trialStartTime = performance.now();
}

/* ================== 回應處理 ================== */
function handleResponse(resp) {
  if (!awaitingResponse) return;
  awaitingResponse = false;

  const rt = performance.now() - trialStartTime;
  const correct = resp === currentCorrect;

  trialIndex++;
  trialLog.push({
    trial: trialIndex,
    level,
    correct,
    rt
  });

  if (level === 1) {
    if (correct) {
      correctStreak++;
      statusEl.textContent = `✔ 正確｜連續 ${correctStreak}/${STREAK_TO_UNLOCK}`;
    } else {
      correctStreak = 0;
      totalErrors++;
      statusEl.textContent = `✘ 錯誤｜累計錯 ${totalErrors} 次`;

      if (totalErrors === 3 || totalErrors === 8) {
        statusEl.textContent = "⚠️ 難度已調整，請重新記憶規則";
        setTimeout(startCountdown, 1200);
        return;
      }
    }

    if (correctStreak >= STREAK_TO_UNLOCK) {
      statusEl.textContent = "🔥 Level 1 通過！";
      level = 2;
      setTimeout(startCountdown, 1500);
      return;
    }
  } else {
    level2Trials++;
    statusEl.textContent = `Level 2：${level2Trials}/${LEVEL2_TOTAL_TRIALS}`;

    if (level2Trials >= LEVEL2_TOTAL_TRIALS) {
    statusEl.textContent = "✅ 訓練完成，感謝參與！";

    stimEl.classList.add("hidden");
    fixEl.classList.add("hidden");
    rulesEl.classList.add("hidden");
    dirControls.classList.add("hidden");
    colorControls.classList.add("hidden");

    exitBtn.classList.remove("hidden");

    console.log("Training data:", trialLog);
    return;
}

  }

  setTimeout(startTrial, 600);
}

/* ================== 事件 ================== */
document.addEventListener("keydown", e => {
  if (level === 1 && DIRECTIONS.includes(e.key)) handleResponse(e.key);
});

document.querySelectorAll("#dirControls button").forEach(btn => {
  btn.onclick = () => handleResponse(btn.dataset.key);
});
document.querySelectorAll("#colorControls button").forEach(btn => {
  btn.onclick = () => handleResponse(btn.dataset.key);
});

startBtn.onclick = () => {
  level = 1;
  correctStreak = 0;
  totalErrors = 0;
  level2Trials = 0;
  trialIndex = 0;
  trialLog = [];
  startCountdown();
};

