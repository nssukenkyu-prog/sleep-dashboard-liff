// ===========================
// 設定
// ===========================
const LIFF_ID = '2008504578-mqGQ6Kal';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxb55vKOBBM4-6JS9f9WNKgKUQQvGzADkKgxJFHoO984Y_-UmtkVk35yLOfB4aJbvce/exec'; // ← GASのウェブアプリURLに置き換え

// ===========================
// グローバル変数
// ===========================
let currentUserId = null;
let currentDate = new Date();
let dashboardData = null;
let charts = {};

// ===========================
// 初期化
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  initializeLiff();
  setupEventListeners();
  setupDatePicker();
});

// ===========================
// LIFF初期化
// ===========================
async function initializeLiff() {
  try {
    await liff.init({ liffId: LIFF_ID });
    
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    const profile = await liff.getProfile();
    currentUserId = profile.userId;
    
    await loadDashboard();
    
  } catch (error) {
    console.error('LIFF初期化エラー:', error);
    showError('アプリの初期化に失敗しました');
  }
}

// ===========================
// ダッシュボード読み込み
// ===========================
async function loadDashboard(date = null) {
  showLoading();
  
  try {
    const targetDate = date || formatDate(currentDate);
    const url = `${GAS_URL}?action=getDashboardDataV2&userId=${currentUserId}&date=${targetDate}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'データ取得に失敗しました');
    }
    
    dashboardData = data;
    renderDashboard(data);
    hideLoading();
    
  } catch (error) {
    console.error('データ取得エラー:', error);
    showError('データの読み込みに失敗しました: ' + error.message);
    hideLoading();
  }
}

// ===========================
// ダッシュボード描画
// ===========================
function renderDashboard(data) {
  document.getElementById('dashboard').classList.remove('hidden');
  
  // スコア表示
  renderScore(data.today);
  
  // ストリーク表示
  renderStreak(data.streak || 0);
  
  // ★ 修正：AIフィードバックの取得
  fetchAIFeedback(currentUserId);
  
  // 統計表示
  renderStats(data.today);
  
  // グラフ描画
  renderCharts(data);
  
  // インサイト表示
  renderInsights(data);
}

// ★ 新規追加：AIフィードバック取得関数
async function fetchAIFeedback(userId) {
  try {
    const targetDate = formatDate(currentDate);
    
    // GASから最新のフィードバックを取得（既存のLINEメッセージから）
    // ※今回は簡易版として、デフォルトメッセージを表示
    const feedbackText = `今日の睡眠データを分析中です。\n\n詳細なフィードバックは朝のLINEメッセージをご確認ください。`;
    
    document.getElementById('aiFeedback').textContent = feedbackText;
    
  } catch (error) {
    console.error('AIフィードバック取得エラー:', error);
    document.getElementById('aiFeedback').textContent = 
      '今日のフィードバックは準備中です。';
  }
}


// ===========================
// スコア計算 & 表示
// ===========================
function renderScore(todayData) {
  const score = calculateSleepScore(todayData);
  const scoreElement = document.getElementById('sleepScore');
  const badgeElement = document.getElementById('scoreBadge');
  
  scoreElement.textContent = score;
  
  if (score >= 80) {
    badgeElement.textContent = '優秀';
    badgeElement.className = 'badge success';
  } else if (score >= 60) {
    badgeElement.textContent = '良好';
    badgeElement.className = 'badge warning';
  } else {
    badgeElement.textContent = '改善推奨';
    badgeElement.className = 'badge danger';
  }
  
  // アニメーション
  animateValue(scoreElement, 0, score, 1000);
}

function calculateSleepScore(data) {
  // ★ 修正：データのバリデーション
  if (!data || !data.totalSleep || data.totalSleep === 0) {
    return 0;
  }
  
  let score = 0;
  
  // 総睡眠時間（40点満点）
  const sleepHours = data.totalSleep / 60;
  if (sleepHours >= 7 && sleepHours <= 9) {
    score += 40;
  } else if (sleepHours >= 6 && sleepHours < 7) {
    score += 30;
  } else if (sleepHours >= 5 && sleepHours < 6) {
    score += 20;
  } else {
    score += 10;
  }
  
  // 深い睡眠（30点満点）
  const deepPercentage = (data.deepSleep / data.totalSleep) * 100;
  if (deepPercentage >= 20) {
    score += 30;
  } else if (deepPercentage >= 15) {
    score += 20;
  } else if (deepPercentage >= 10) {
    score += 10;
  }
  
  // HRV（20点満点）
  if (data.hrv) {
    if (data.hrv >= 60) {
      score += 20;
    } else if (data.hrv >= 40) {
      score += 15;
    } else if (data.hrv >= 20) {
      score += 10;
    }
  }
  
  // 睡眠効率（10点満点）
  if (data.efficiency >= 85) {
    score += 10;
  } else if (data.efficiency >= 75) {
    score += 7;
  } else if (data.efficiency >= 65) {
    score += 5;
  }
  
  return Math.round(score);
}


// ===========================
// ストリーク表示
// ===========================
function renderStreak(streak) {
  const streakElement = document.getElementById('streak').querySelector('span');
  animateValue(streakElement, 0, streak, 1000);
}

// ===========================
// AIフィードバック表示
// ===========================
function renderAIFeedback(feedback) {
  document.getElementById('aiFeedback').textContent = feedback;
}

// ===========================
// 統計表示
// ===========================
function renderStats(data) {
  // ★ 修正：null/undefined チェックを追加
  const totalSleepMinutes = data.totalSleep || 0;
  const deepSleepMinutes = data.deepSleep || 0;
  const hrvValue = data.hrv || 0;
  const efficiencyValue = data.efficiency || 0;
  
  // 総睡眠時間（分 → 時間）
  document.getElementById('totalSleep').textContent = 
    totalSleepMinutes > 0 ? `${(totalSleepMinutes / 60).toFixed(1)}時間` : '--';
  
  // 深い睡眠（分）
  document.getElementById('deepSleep').textContent = 
    deepSleepMinutes > 0 ? `${deepSleepMinutes}分` : '--';
  
  // HRV（ms）
  document.getElementById('hrvValue').textContent = 
    hrvValue > 0 ? `${hrvValue} ms` : '--';
  
  // 睡眠効率（%）
  document.getElementById('efficiency').textContent = 
    efficiencyValue > 0 ? `${efficiencyValue}%` : '--';
}


// ===========================
// グラフ描画
// ===========================
function renderCharts(data) {
  // 既存のグラフを破棄
  Object.values(charts).forEach(chart => chart.destroy());
  charts = {};
  
  // 1. 睡眠ステージ積み上げグラフ
  renderSleepStagesChart(data.history);
  
  // 2. HRV + 心拍数グラフ
  renderHRVChart(data.history);
  
  // 3. レーダーチャート
  renderRadarChart(data.today);
  
  // 4. 目標達成率円グラフ
  renderGoalChart(data.today, data.goalMinutes || 450);
}

// 睡眠ステージ積み上げグラフ
function renderSleepStagesChart(history) {
  const ctx = document.getElementById('sleepStagesChart').getContext('2d');
  
  const labels = history.map(d => formatDateShort(d.date));
  const deepData = history.map(d => d.deepSleep || 0);
  const lightData = history.map(d => d.lightSleep || 0);
  const remData = history.map(d => d.remSleep || 0);
  const awakeData = history.map(d => d.awakeDuration || 0);
  
  charts.sleepStages = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: '深い睡眠',
          data: deepData,
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1
        },
        {
          label: 'REM睡眠',
          data: remData,
          backgroundColor: 'rgba(102, 126, 234, 0.8)',
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 1
        },
        {
          label: '浅い睡眠',
          data: lightData,
          backgroundColor: 'rgba(245, 158, 11, 0.8)',
          borderColor: 'rgba(245, 158, 11, 1)',
          borderWidth: 1
        },
        {
          label: '覚醒',
          data: awakeData,
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { 
          stacked: true,
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          ticks: { color: '#cbd5e1' }
        },
        y: { 
          stacked: true,
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          ticks: { color: '#cbd5e1' }
        }
      },
      plugins: {
        legend: { 
          labels: { color: '#ffffff' }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.parsed.y}分`;
            }
          }
        }
      }
    }
  });
}

// HRV + 心拍数デュアル軸グラフ
function renderHRVChart(history) {
  const ctx = document.getElementById('hrvChart').getContext('2d');
  
  const labels = history.map(d => formatDateShort(d.date));
  const hrvData = history.map(d => d.hrv || null);
  const hrData = history.map(d => d.restingHeartRate || null);
  
  charts.hrv = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'HRV (ms)',
          data: hrvData,
          borderColor: 'rgba(16, 185, 129, 1)',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          yAxisID: 'y',
          tension: 0.4,
          fill: true
        },
        {
          label: '安静時心拍数 (bpm)',
          data: hrData,
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          yAxisID: 'y1',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          ticks: { color: '#cbd5e1' }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          ticks: { color: '#cbd5e1' },
          title: {
            display: true,
            text: 'HRV (ms)',
            color: '#cbd5e1'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#cbd5e1' },
          title: {
            display: true,
            text: '心拍数 (bpm)',
            color: '#cbd5e1'
          }
        }
      },
      plugins: {
        legend: { 
          labels: { color: '#ffffff' }
        }
      }
    }
  });
}

// レーダーチャート（睡眠効率分析）
function renderRadarChart(todayData) {
  const ctx = document.getElementById('radarChart').getContext('2d');
  
  const sleepQuality = calculateSleepQuality(todayData);
  
  charts.radar = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['総睡眠', '深い睡眠', 'REM睡眠', 'HRV', '睡眠効率'],
      datasets: [{
        label: '今日の睡眠',
        data: [
          sleepQuality.totalSleep,
          sleepQuality.deepSleep,
          sleepQuality.remSleep,
          sleepQuality.hrv,
          sleepQuality.efficiency
        ],
        borderColor: 'rgba(102, 126, 234, 1)',
        backgroundColor: 'rgba(102, 126, 234, 0.2)',
        pointBackgroundColor: 'rgba(102, 126, 234, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(102, 126, 234, 1)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 20,
            color: '#cbd5e1'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          pointLabels: {
            color: '#ffffff',
            font: {
              size: 12
            }
          }
        }
      },
      plugins: {
        legend: {
          labels: { color: '#ffffff' }
        }
      }
    }
  });
}

function calculateSleepQuality(data) {
  const quality = {
    totalSleep: 0,
    deepSleep: 0,
    remSleep: 0,
    hrv: 0,
    efficiency: 0
  };
  
  if (!data) return quality;
  
  // 総睡眠（7-9時間で100点）
  const sleepHours = (data.totalSleep || 0) / 60;
  quality.totalSleep = Math.min(100, (sleepHours / 8) * 100);
  
  // 深い睡眠（20%で100点）
  if (data.totalSleep > 0) {
    const deepPercentage = ((data.deepSleep || 0) / data.totalSleep) * 100;
    quality.deepSleep = Math.min(100, (deepPercentage / 20) * 100);
  }
  
  // REM睡眠（25%で100点）
  if (data.totalSleep > 0) {
    const remPercentage = ((data.remSleep || 0) / data.totalSleep) * 100;
    quality.remSleep = Math.min(100, (remPercentage / 25) * 100);
  }
  
  // HRV（60msで100点）
  if (data.hrv) {
    quality.hrv = Math.min(100, (data.hrv / 60) * 100);
  }
  
  // 睡眠効率（85%で100点）
  if (data.totalSleep > 0) {
    const totalTime = data.totalSleep + (data.awakeDuration || 0);
    const efficiencyPercent = (data.totalSleep / totalTime) * 100;
    quality.efficiency = Math.min(100, (efficiencyPercent / 85) * 100);
  }
  
  return quality;
}

// 目標達成率円グラフ
function renderGoalChart(todayData, goalMinutes) {
  const ctx = document.getElementById('goalChart').getContext('2d');
  
  const actual = todayData.totalSleep || 0;
  const remaining = Math.max(0, goalMinutes - actual);
  
  charts.goal = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['達成', '未達成'],
      datasets: [{
        data: [actual, remaining],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(255, 255, 255, 0.1)'
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(255, 255, 255, 0.2)'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#ffffff' }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.parsed;
              const percentage = ((value / goalMinutes) * 100).toFixed(1);
              return `${context.label}: ${value}分 (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// ===========================
// インサイト生成
// ===========================
function renderInsights(data) {
  const insightsContainer = document.getElementById('insights');
  const insights = generateInsights(data);
  
  insightsContainer.innerHTML = insights.map(insight => `
    <div class="insight-item">
      <div class="insight-icon">${insight.icon}</div>
      <div class="insight-text">${insight.text}</div>
    </div>
  `).join('');
}

function generateInsights(data) {
  const insights = [];
  const today = data.today;
  const history = data.history;
  
  // 睡眠時間トレンド
  if (history.length >= 3) {
    const recent3 = history.slice(-3);
    const avg = recent3.reduce((sum, d) => sum + (d.totalSleep || 0), 0) / 3;
    const prevAvg = history.slice(-6, -3).reduce((sum, d) => sum + (d.totalSleep || 0), 0) / 3;
    
    if (avg > prevAvg) {
      insights.push({
        icon: '📈',
        text: `直近3日間の平均睡眠時間が改善しています（+${((avg - prevAvg) / 60).toFixed(1)}時間）`
      });
    }
  }
  
  // HRVトレンド
  if (today.hrv && today.hrv >= 60) {
    insights.push({
      icon: '💚',
      text: 'HRVが良好な範囲です。回復状態が優れています'
    });
  }
  
  // 深い睡眠
  if (today.deepSleep && today.totalSleep) {
    const deepPercentage = (today.deepSleep / today.totalSleep) * 100;
    if (deepPercentage >= 20) {
      insights.push({
        icon: '🌟',
        text: `深い睡眠の割合が理想的です（${deepPercentage.toFixed(1)}%）`
      });
    }
  }
  
  // 目標達成
  const goalMinutes = data.goalMinutes || 450;
  if (today.totalSleep >= goalMinutes) {
    insights.push({
      icon: '🎯',
      text: '今日の睡眠目標を達成しました！'
    });
  }
  
  // 連続達成
  if (data.streak >= 7) {
    insights.push({
      icon: '🔥',
      text: `${data.streak}日連続で目標達成中！素晴らしいです`
    });
  }
  
  // デフォルトメッセージ
  if (insights.length === 0) {
    insights.push({
      icon: '💤',
      text: '継続的な記録で、より詳細なインサイトが得られます'
    });
  }
  
  return insights;
}

// ===========================
// 日付ピッカー設定
// ===========================
function setupDatePicker() {
  flatpickr('#datePicker', {
    locale: 'ja',
    dateFormat: 'Y-m-d',
    defaultDate: currentDate,
    maxDate: 'today',
    onChange: function(selectedDates) {
      if (selectedDates.length > 0) {
        currentDate = selectedDates[0];
        loadDashboard(formatDate(currentDate));
      }
    }
  });
}

// ===========================
// イベントリスナー
// ===========================
function setupEventListeners() {
  // リフレッシュボタン
  document.getElementById('refreshBtn').addEventListener('click', () => {
    loadDashboard();
  });
  
  // テーマ切り替え
  document.getElementById('themeToggle').addEventListener('click', () => {
    // TODO: ダークモード実装
    alert('テーマ切り替え機能は近日公開予定です');
  });
  
  // エクスポート
  document.getElementById('exportBtn').addEventListener('click', () => {
    exportData();
  });
  
  // 比較モード
  document.getElementById('compareBtn').addEventListener('click', () => {
    alert('日付比較機能は近日公開予定です');
  });
  
  // 設定
  document.getElementById('settingsBtn').addEventListener('click', () => {
    alert('設定画面は近日公開予定です');
  });
}

// ===========================
// データエクスポート
// ===========================
function exportData() {
  if (!dashboardData) {
    alert('エクスポートするデータがありません');
    return;
  }
  
  const csvContent = convertToCSV(dashboardData.history);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `sleep_data_${formatDate(new Date())}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function convertToCSV(data) {
  const headers = ['日付', '総睡眠時間(分)', '深い睡眠(分)', '浅い睡眠(分)', 'REM睡眠(分)', '覚醒時間(分)', 'HRV', '安静時心拍数'];
  const rows = data.map(d => [
    d.date,
    d.totalSleep || '',
    d.deepSleep || '',
    d.lightSleep || '',
    d.remSleep || '',
    d.awakeDuration || '',
    d.hrv || '',
    d.restingHeartRate || ''
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

// ===========================
// ユーティリティ関数
// ===========================
function showLoading() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('error').classList.add('hidden');
}

function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
}

function showError(message) {
  const errorElement = document.getElementById('error');
  errorElement.textContent = message;
  errorElement.classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateShort(dateString) {
  const date = new Date(dateString);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function animateValue(element, start, end, duration) {
  const range = end - start;
  const increment = range / (duration / 16);
  let current = start;
  
  const timer = setInterval(() => {
    current += increment;
    if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
      current = end;
      clearInterval(timer);
    }
    element.textContent = Math.round(current);
  }, 16);
}
