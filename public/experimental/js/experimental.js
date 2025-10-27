const handleLogin = async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/login', {
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

// Check login state on page load
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const userInfo = document.getElementById('userInfo');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    // 這裡新增：抓取三個功能按鈕
    const dailyBtn = document.getElementById('btn-daily');
    const aidBtn = document.getElementById('btn-aid');

    // 按鈕導向子頁面
    dailyBtn.addEventListener('click', () => window.location.href = '/experimental/daily_tasks/index.html');  
    aidBtn.addEventListener('click', () => window.location.href = '/experimental/calm_kit/index.html');


    // Check if user is logged in
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
        showUserInfo();
    }

    loginBtn.addEventListener('click', async () => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/login', {
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

        document.getElementById('usernameDisplay').textContent = username;
        document.getElementById('loginTimeInfo').textContent = 
            `登入時間: ${loginTime} (${period})`;

        loginForm.style.display = 'none';
        userInfo.style.display = 'block';
    }
});

