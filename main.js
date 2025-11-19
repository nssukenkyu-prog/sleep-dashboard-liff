// LIFF IDを設定
const LIFF_ID = '2008504578-mqGQ6Kal';

// GASのWebアプリURL
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbw-J5vQlODJmB315O3HKII9KWXRGfP4N6VTlDKwTAd04SOO9W6Nwe5kYx7bi4MRUTv6/exec';

// アプリの状態
let userId = null;
let userName = null;

// LIFF初期化
async function initializeLiff() {
    try {
        await liff.init({ liffId: LIFF_ID });
        
        if (!liff.isLoggedIn()) {
            liff.login();
            return;
        }
        
        // ユーザー情報取得
        const profile = await liff.getProfile();
        userId = profile.userId;
        userName = profile.displayName;
        
        console.log('User ID:', userId);
        console.log('User Name:', userName);
        
        // ダッシュボード表示
        await loadDashboard();
        
    } catch (error) {
        console.error('LIFF初期化エラー:', error);
        showError('アプリの初期化に失敗しました');
    }
}

// ダッシュボードデータ取得
async function loadDashboard() {
    try {
        // 今日のデータ + 過去7日間のデータを取得
        const response = await fetch(`${GAS_API_URL}?action=getDashboardData&userId=${userId}`);
        
        if (!response.ok) {
            throw new Error('データ取得失敗');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            showError(data.message || 'データがありません');
            return;
        }
        
        renderDashboard(data);
        
    } catch (error) {
        console.error('データ取得エラー:', error);
        showError('データの取得に失敗しました');
    }
}

// ダッシュボードUI描画
function renderDashboard(data) {
    const app = document.getElementById('app');
    
    const today = data.today;
    const weekData = data.weekData;
    
    app.innerHTML = `
        <div class="container">
            <div class="header">
                <h1>🌙 Sleep Dashboard</h1>
                <p style="color: #666;">こんにちは、${userName}さん</p>
            </div>
            
            <!-- 今日のサマリー -->
            <div class="user-info">
                <div style="font-weight: bold; margin-bottom: 8px; font-size: 16px;">📅 今日のデータ</div>
                <div style="color: #666; font-size: 14px;">${today.date || '---'}</div>
            </div>
            
            <!-- 今日の睡眠統計 -->
            <div class="card">
                <h2>📊 今日の睡眠</h2>
                <div class="stat">
                    <span class="stat-label">総睡眠時間</span>
                    <span class="stat-value">${formatMinutes(today.duration)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">睡眠効率</span>
                    <span class="stat-value">${today.efficiency || '---'}%</span>
                </div>
                <div class="stat">
                    <span class="stat-label">深い睡眠</span>
                    <span class="stat-value">${formatMinutes(today.deepSleep)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">レム睡眠</span>
                    <span class="stat-value">${formatMinutes(today.remSleep)}</span>
                </div>
            </div>
            
            <!-- コンディション -->
            <div class="card">
                <h2>🫀 コンディション</h2>
                <div class="stat">
                    <span class="stat-label">心拍変動（HRV）</span>
                    <span class="stat-value">${today.hrv || 'N/A'}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">安静時心拍数</span>
                    <span class="stat-value">${today.rhr || 'N/A'} bpm</span>
                </div>
            </div>
            
            <!-- 7日間の推移グラフ -->
            <div class="card">
                <h2>📈 7日間の睡眠推移</h2>
                <div class="chart-container">
                    <canvas id="sleepTrendChart"></canvas>
                </div>
            </div>
            
            <!-- HRV推移グラフ -->
            <div class="card">
                <h2>💓 心拍変動（HRV）推移</h2>
                <div class="chart-container">
                    <canvas id="hrvTrendChart"></canvas>
                </div>
            </div>
            
            <!-- 目標設定 -->
            <div class="card">
                <h2>🎯 睡眠目標</h2>
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 48px; font-weight: bold; color: #667eea;">${today.goalAchievement || 0}%</div>
                    <div style="color: #666; margin-top: 8px;">目標達成率</div>
                    <div style="margin-top: 16px; padding: 12px; background: #f7f9fc; border-radius: 8px;">
                        目標: ${formatMinutes(today.goalMinutes || 450)} / 実績: ${formatMinutes(today.duration)}
                    </div>
                </div>
                <button class="button" onclick="setGoal()">
                    ⚙️ 目標を変更
                </button>
            </div>
            
            <!-- アクションボタン -->
            <button class="button" onclick="refreshData()">
                🔄 最新データを更新
            </button>
        </div>
    `;
    
    // グラフを描画
    renderSleepTrendChart(weekData);
    renderHrvTrendChart(weekData);
}

// 睡眠推移グラフ
function renderSleepTrendChart(weekData) {
    const ctx = document.getElementById('sleepTrendChart');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: weekData.dates,
            datasets: [
                {
                    label: '総睡眠時間（分）',
                    data: weekData.durations,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: '深い睡眠（分）',
                    data: weekData.deepSleep,
                    borderColor: '#0046b3',
                    backgroundColor: 'rgba(0, 70, 179, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// HRV推移グラフ
function renderHrvTrendChart(weekData) {
    const ctx = document.getElementById('hrvTrendChart');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: weekData.dates,
            datasets: [{
                label: 'HRV',
                data: weekData.hrvValues,
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// 分を「X時間Y分」に変換
function formatMinutes(minutes) {
    if (!minutes || minutes === 0) return '---';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}時間${m}分`;
}

// 目標設定
async function setGoal() {
    const goalHours = prompt('睡眠時間の目標を設定してください（時間）', '7.5');
    if (!goalHours) return;
    
    const goalMinutes = parseFloat(goalHours) * 60;
    
    try {
        const response = await fetch(`${GAS_API_URL}?action=setGoal&userId=${userId}&goalMinutes=${goalMinutes}`);
        const result = await response.json();
        
        if (result.success) {
            alert('目標を設定しました！');
            await loadDashboard(); // 再読み込み
        } else {
            alert('目標設定に失敗しました');
        }
    } catch (error) {
        console.error('目標設定エラー:', error);
        alert('エラーが発生しました');
    }
}

// データ更新
async function refreshData() {
    alert('データを更新しています...');
    await loadDashboard();
    alert('更新完了！');
}

// エラー表示
function showError(message) {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="container">
            <div style="text-align: center; padding: 40px;">
                <p style="color: #e74c3c; font-size: 18px;">❌ ${message}</p>
                <button class="button" onclick="location.reload()" style="margin-top: 20px;">
                    🔄 再読み込み
                </button>
            </div>
        </div>
    `;
}

// グローバル関数として登録
window.setGoal = setGoal;
window.refreshData = refreshData;

// アプリ起動
initializeLiff();
