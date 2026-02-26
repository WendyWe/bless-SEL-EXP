/* ================== DOM ================== */
const rulesEl = document.getElementById("rules");
const stimEl = document.getElementById("stim");
const arrowEl = document.getElementById("arrow");
const wordEl = document.getElementById("word");
const fixEl = document.getElementById("fix");
const openInfoBtn = document.getElementById('open-info');
const closeInfoBtn = document.getElementById('close-info');
const infoModal = document.getElementById('info-modal');
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const finishBtn = document.getElementById("finish-btn");
const exitBtn = finishBtn;
const dirControls = document.getElementById("dirControls");
const colorControls = document.getElementById("colorControls");

/* ================== 常數 ================== */
const COLORS = [
  { name: "紅", hex: "#f56565" }, // 更亮一點的紅
  { name: "藍", hex: "#4299e1" }, // 天空藍
  { name: "黃", hex: "#ecc94b" }, // 陽光黃
  { name: "綠", hex: "#48bb78" }  // 草地綠
];

const DIRECTIONS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
const DIR_LABEL = { ArrowUp: "上", ArrowDown: "下", ArrowLeft: "左", ArrowRight: "右" };
const DIR_SYMBOL = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→" };

const STREAK_TO_UNLOCK = 10;
const LEVEL2_TOTAL_TRIALS = 10;

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

/* ================== 規則生成修改 ================== */
function generateRules() {
    rulesEl.innerHTML = "";
    rulesEl.classList.remove("hidden");

    if (level === 1) {
        let colorsToUse = [...COLORS];
        let dirsToUse = [...DIRECTIONS];

        // ... 保持原本的難度調整邏輯 ...
        if (totalErrors >= 8) {
            colorsToUse = COLORS.slice(0, 2);
            dirsToUse = DIRECTIONS.slice(0, 2);
        } else if (totalErrors >= 3) {
            colorsToUse = COLORS.slice(0, 3);
            dirsToUse = DIRECTIONS.slice(0, 3);
        }

        const shuffled = [...dirsToUse].sort(() => Math.random() - 0.5);
        ruleMap = {};

        // 規則生成核心修改點：
        colorsToUse.forEach((c, i) => {
          const direction = shuffled[i]; // 這會是 ArrowUp, ArrowDown 等
          ruleMap[c.name] = direction;
          
          const div = document.createElement("div");
          // 關鍵點：根據方向動態加上 rule-ArrowUp 等類別
          div.className = `rule rule-${direction}`; 
          
          div.innerHTML = `
              <span style="color: ${c.hex}; font-size: 1.6rem; line-height: 1;">●</span>
              <span style="font-size: 1.2rem; font-weight: bold; margin-top: 5px; color: #4a5568;">
                  ${DIR_SYMBOL[direction]}
              </span>
          `;
          rulesEl.appendChild(div);
      });

        dirControls.classList.remove("hidden");
        colorControls.classList.add("hidden");
    } else {
        // Level 2 保持原樣
        const div = document.createElement("div");
        div.className = "rule";
        div.style.gridColumn = "span 2";
        div.innerHTML = "🎯 <strong>Level 2</strong>忽略字義，只回報顏色";
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
    const keyMap = { "紅": "RED", "藍": "BLUE", "黃": "YELLOW", "綠": "GREEN" };
    currentCorrect = keyMap[ink.name];

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
    if (correct) {
      level2Trials++; // 這裡變成了「正確次數」的累計
      statusEl.textContent = `Level 2 正確：${level2Trials}/${LEVEL2_TOTAL_TRIALS}`;
    } else {
      statusEl.textContent = `✘ 錯誤｜目前正確次數：${level2Trials}`;
    }

    if (level2Trials >= LEVEL2_TOTAL_TRIALS) {
    statusEl.textContent = "✅ 訓練完成，感謝參與！";

    finishBtn.disabled = false;                // 解除禁用
    finishBtn.classList.remove("btn-disabled"); // 移除灰色類別

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
    
    // 確保重新開始訓練時，按鈕再次變回不可點擊
    finishBtn.disabled = true; 
    
    startCountdown();
};

finishBtn.addEventListener("click", () => {
  window.parent.postMessage(
    {
      type: "practice-finished",
      practice: "loosen",
      version: "loosen2",
      trials: trialLog.length
    },
    "*"
  );
});

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