document.addEventListener("DOMContentLoaded", () => {
    console.log("JavaScript 成功載入");

    const selectionContainer = document.getElementById("selection-container");
    const emotionSelection = document.getElementById("emotion-selection");
    const confirmButton = document.getElementById("confirm-selection");
    const startGameButton = document.createElement("button"); // ✅ 新增「開始遊戲」按鈕
    const gameContainer = document.getElementById("game-container");
    const bubbleContainer = document.getElementById("bubble-container");
    const message = document.getElementById("message");
    const timeDisplay = document.getElementById("time");
    const restartButton = document.getElementById("restart-btn");
    const statsContainer = document.getElementById("stats");
    const finishBtn = document.getElementById("finish-btn"); // ✅ 修正：補上 finishBtn

    function goBack() {
        window.parent.postMessage({ type: 'practice-finished', practice: 'game' }, '*');
    }

    let allEmotions = [
        { text: "焦慮", color: "#ff7675" }, { text: "壓力", color: "#d63031" }, 
        { text: "憤怒", color: "#e17055" }, { text: "疲憊", color: "#0984e3" }, 
        { text: "挫折", color: "#6c5ce7" }, { text: "悲傷", color: "#2d3436" }, 
        { text: "孤單", color: "#636e72" }, { text: "害怕", color: "#fdcb6e" }, 
        { text: "絕望", color: "#a29bfe" }, { text: "羞愧", color: "#e84393" }, 
        { text: "困惑", color: "#fd79a8" }, { text: "失望", color: "#00cec9" },
        { text: "煩躁", color: "#6c5ce7" }, { text: "壓抑", color: "#d63031" },
        { text: "自卑", color: "#0984e3" }, { text: "迷惘", color: "#ff7675" },
        { text: "憂鬱", color: "#b2bec3" }, { text: "懊悔", color: "#fab1a0" },
        { text: "緊張", color: "#fdcb6e" }, { text: "無助", color: "#636e72" }
    ];

    let selectedEmotions = [];
    let emotionCounts = {};
    let gameInterval;

    // ✅ 設定「開始遊戲」按鈕
    startGameButton.innerText = "開始遊戲";
    startGameButton.id = "start-game-btn";
    startGameButton.style.display = "none";
    startGameButton.style.backgroundColor = "#007BFF";
    startGameButton.style.color = "white";
    startGameButton.style.padding = "10px 20px";
    startGameButton.style.fontSize = "18px";
    startGameButton.style.border = "none";
    startGameButton.style.borderRadius = "5px";
    startGameButton.style.cursor = "pointer";
    startGameButton.style.marginTop = "10px";
    selectionContainer.appendChild(startGameButton);

    // 顯示情緒選擇按鈕
    allEmotions.forEach(emotion => {
        const button = document.createElement("button");
        button.classList.add("emotion-btn");
        button.innerText = emotion.text;
        button.style.backgroundColor = emotion.color;
        button.addEventListener("click", () => {
            if (selectedEmotions.includes(emotion)) {
                selectedEmotions = selectedEmotions.filter(e => e !== emotion);
                button.classList.remove("selected");
            } else if (selectedEmotions.length < 5) {
                selectedEmotions.push(emotion);
                button.classList.add("selected");
            }
            confirmButton.disabled = selectedEmotions.length !== 5;
        });
        emotionSelection.appendChild(button);
    });

    // 確認選擇後，顯示「開始遊戲」按鈕
    confirmButton.addEventListener("click", () => {
        console.log("按鈕被點擊，準備顯示開始遊戲按鈕");
        if (selectedEmotions.length !== 5) {
            alert("請選擇 5 個情緒！");
            return;
        }

        confirmButton.style.display = "none"; 
        startGameButton.style.display = "inline-block"; 
    });

    // ✅ 點擊「開始遊戲」才真正開始遊戲
    startGameButton.addEventListener("click", () => {
        console.log("開始遊戲按鈕被點擊");
        selectionContainer.style.display = "none";
        gameContainer.style.display = "block";

        statsContainer.innerHTML = "";
        emotionCounts = {};
        selectedEmotions.forEach(emotion => {
            emotionCounts[emotion.text] = 0;
            const statLine = document.createElement("p");
            statLine.innerHTML = `${emotion.text}: <span id="count-${emotion.text}">0</span>`;
            statsContainer.appendChild(statLine);
        });

        startGame();
    });

    function createBubble() {
        if (selectedEmotions.length === 0) return;

        const emotion = selectedEmotions[Math.floor(Math.random() * selectedEmotions.length)];
        const bubble = document.createElement("div");
        bubble.classList.add("bubble");
        bubble.innerText = emotion.text;
        bubble.style.backgroundColor = emotion.color;

        let size = Math.random() * 50 + 30;
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.position = "absolute";
        bubble.style.top = `${Math.random() * (bubbleContainer.clientHeight - size)}px`;
        bubble.style.left = `${Math.random() * (bubbleContainer.clientWidth - size)}px`;

        bubble.addEventListener("click", () => {
            bubble.remove();
            emotionCounts[emotion.text]++;
            document.getElementById(`count-${emotion.text}`).innerText = emotionCounts[emotion.text];
        });

        bubbleContainer.appendChild(bubble);

        setTimeout(() => {
            if (document.body.contains(bubble)) {
                bubble.remove();
            }
        }, 4000);
    }

    function startGame() {
        console.log("遊戲開始");
        let timeLeft = 30;
        timeDisplay.innerText = timeLeft;
        message.innerText = "點擊泡泡來釋放壓力！";
        bubbleContainer.innerHTML = "";

        Object.keys(emotionCounts).forEach(key => {
            emotionCounts[key] = 0;
            document.getElementById(`count-${key}`).innerText = 0;
        });

        let timer = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                timeDisplay.innerText = timeLeft;
                createBubble();
            } else {
                clearInterval(timer);
                clearInterval(gameInterval);
                message.innerText = "時間到！看看你釋放了多少情緒！";
            }
        }, 1000);

        gameInterval = setInterval(createBubble, 1000);
    }

    restartButton.addEventListener("click", () => {
        location.reload();
    });

    // ⭐ 完成按鈕：通知父頁
    finishBtn.addEventListener("click", () => {
        window.parent.postMessage({ type: 'practice-finished', practice: 'game' }, '*');
    });

    // 返回按鈕
    const backButton = document.getElementById("back-button");
    backButton.addEventListener("click", goBack);
});


