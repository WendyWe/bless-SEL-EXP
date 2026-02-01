const handleLogin = async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('https://bless-sel-exp.onrender.com/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (data.success) {
            localStorage.setItem('userId', data.userId);
            updateUIForLoggedInUser();
        }
    } catch (error) {
        console.error('Login failed:', error);
    }
};

const updateUIForLoggedInUser = () => {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('userInfo').style.display = 'block';
};

const handleLogout = () => {
    localStorage.removeItem('userId');
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('userInfo').style.display = 'none';
};

const follower = document.getElementById('cursor-follower');

document.addEventListener('mousemove', (e) => {
        // 讓光點跟隨座標移動
        follower.style.left = e.clientX - 10 + 'px';
        follower.style.top = e.clientY - 10 + 'px';
    });

    // 當點擊按鈕時，讓光點縮小再放大，產生互動感
    document.addEventListener('mousedown', () => {
        follower.style.transform = 'scale(0.8)';
    });
    document.addEventListener('mouseup', () => {
        follower.style.transform = 'scale(1)';
    });

// Check login state on page load
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const userInfo = document.getElementById('userInfo');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    // 這裡新增：抓取三個功能按鈕
    const dailyBtn = document.getElementById('btn-daily');
    const aidBtn = document.getElementById('btn-aid');

    const guideBtn = document.getElementById('btn-guide');
    const modal = document.getElementById('guideModal');
    const closeBtn = document.querySelector('.close-btn');

    // 按鈕導向子頁面
    dailyBtn.addEventListener('click', () => {
    // --- 新增：警告提醒邏輯 ---
        const warningMessage = "提醒：進入「本日任務」後，須完成完整練習（含影片、心情記錄、安頓練習），否則將不視為完整使用，後續使用時間的獎勵可能會受影響。\n\n確定要開始今日任務嗎？";
        
        if (!confirm(warningMessage)) {
            // 如果使用者按「取消」，就直接 return，不執行後續動作
            return;
        }
        
    // 點擊時讓 app 容器慢慢變透明，再跳轉
    document.getElementById('app').style.opacity = '0';
    document.getElementById('app').style.transition = 'opacity 0.8s';
        setTimeout(() => {
            window.location.href = '/experimental/daily_tasks/index.html';
        }, 800);
    });

    aidBtn.addEventListener('click', () => {
        document.getElementById('app').style.opacity = '0';
        document.getElementById('app').style.transition = 'opacity 0.8s';
        setTimeout(() => {
            window.location.href = '/experimental/calm_kit/index.html';
        }, 800);
    });

    // 🔑 3. 新增：使用說明彈窗邏輯
    if (guideBtn && modal && closeBtn) {
        // 打開彈窗
        guideBtn.addEventListener('click', () => {
            modal.style.display = 'block';
        });

        // 按叉叉關閉
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // 點擊彈窗外面也可以關閉
        window.addEventListener('click', (event) => {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        });
    }


    // Check if user is logged in
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
        showUserInfo();
    }

    loginBtn.addEventListener('click', async () => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('https://bless-sel-exp.onrender.com/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            if (data.success) {
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('sessionId', data.sessionId);
                localStorage.setItem('username', username);
                localStorage.setItem('loginTime', data.loginTime);
                localStorage.setItem('period', data.period);
                
                showUserInfo();
                
                 // 🔑 登入成功後解鎖按鈕
                dailyBtn.disabled = false;
                aidBtn.disabled = false;

            } else {
                alert(data.message || '登入失敗');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('登入系統錯誤');
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        loginForm.style.display = 'block';
        userInfo.style.display = 'none';
    });

    function showUserInfo() {
        const username = localStorage.getItem('username');
        const loginTime = localStorage.getItem('loginTime');
        const period = localStorage.getItem('period');

        // 修改標題為更具邀請感的文字
        const infoTitle = userInfo.querySelector('h2');
        if (infoTitle) {
            infoTitle.textContent = "今天，想如何照顧你的心靈？";
        }

        document.getElementById('usernameDisplay').textContent = username;
        document.getElementById('loginTimeInfo').textContent = 
            `登入時間: ${loginTime} `;

        loginForm.style.display = 'none';
        userInfo.style.display = 'block';
    }
});

