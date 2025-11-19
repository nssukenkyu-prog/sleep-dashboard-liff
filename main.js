// LIFF IDを設定
const LIFF_ID = '2008504578-mqGQ6Kal';

// GASのWebアプリURL（ここに実際のURLを設定してください）
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxlnxkvXLUwcYAT23HidUEp8s3vvCmuEe9J-YqZRqHiP2Dz6sl5A50cyCh4sPc2JPEM/exec';

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
        // GASから今日の睡眠データを取得
        const response = await fetch(`${GAS_API_URL}?action=getTodaySleep&userId=${userId}`);
        
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
    
    app.innerHTML = `
        <div class="container">
            <div class="header">
                <h1>🌙 Sleep Dashboard</h1>
                <p style="color: #666;">おはようございます、${userName}さん</p>
            </div>
            
            <div class="user-info">
                <div style="font-weight: bold; margin-bottom: 8px;">今日の睡眠データ</div>
                <div style="color: #666; font-size: 14px;">${data.date || '---'}</div>
            </div>
            
            <div class="card">
                <h2>📊 睡眠統計</h2>
                <div class="stat">
                    <span class="stat-label">総睡眠時間</span>
                    <span class="stat-value">${formatMinutes(data.duration)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">睡眠効率</span>
                    <span class="stat-value">${data.efficiency || '---'}%</span>
                </div>
                <div class="stat">
                    <span class="stat-label">深い睡眠</span>
                    <span class="stat-value">${formatMinutes(data.deepSleep)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">レム睡眠</span>
                    <span class="stat-value">${formatMinutes(data.remSleep)}</span>
                </div>
            </div>
            
            <div class="card">
                <h2>🫀 コンディション</h2>
                <div class="stat">
                    <span class="stat-label">心拍変動（HRV）</span>
                    <span class="stat-value">${data.hrv || 'N/A'}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">安静時心拍数</span>
                    <span class="stat-value">${data.rhr || 'N/A'} bpm</span>
                </div>
            </div>
            
            <button class="button" onclick="requestFeedback()">
                💬 詳細フィードバックを見る
            </button>
            
            <button class="button" onclick="syncData()">
                🔄 データを同期
            </button>
        </div>
    `;
}

// 分を「X時間Y分」に変換
function formatMinutes(minutes) {
    if (!minutes || minutes === 0) return '---';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}時間${m}分`;
}

// フィードバックリクエスト
async function requestFeedback() {
    try {
        const response = await fetch(`${GAS_API_URL}?action=requestFeedback&userId=${userId}`);
        const result = await response.json();
        
        if (result.success) {
            alert('LINEにフィードバックを送信しました！');
        } else {
            alert('フィードバック送信に失敗しました');
        }
    } catch (error) {
        console.error('フィードバックリクエストエラー:', error);
        alert('エラーが発生しました');
    }
}

// データ同期
async function syncData() {
    try {
        alert('データ同期を開始しました...');
        const response = await fetch(`${GAS_API_URL}?action=syncData&userId=${userId}`);
        const result = await response.json();
        
        if (result.success) {
            await loadDashboard(); // 再読み込み
            alert('データ同期が完了しました！');
        } else {
            alert('データ同期に失敗しました');
        }
    } catch (error) {
        console.error('データ同期エラー:', error);
        alert('エラーが発生しました');
    }
}

// エラー表示
function showError(message) {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="container">
            <div style="text-align: center; padding: 40px;">
                <p style="color: #e74c3c; font-size: 18px;">❌ ${message}</p>
            </div>
        </div>
    `;
}

// グローバル関数として登録
window.requestFeedback = requestFeedback;
window.syncData = syncData;

// アプリ起動
initializeLiff();
