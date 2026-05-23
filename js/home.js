// ════════════════════════════════
// home.js — 집 화면
// ════════════════════════════════

// ── 집 메뉴 표시 ──
function showHome() {
  document.getElementById('vpanel-home').classList.add('active');
  renderHomeMenu();
}

function renderHomeMenu() {
  const el = document.getElementById('vpanel-home');
  el.innerHTML = `
    <div class="home-container">
      <div class="home-time-info">
        <div class="home-day">백수 ${gameState.day}일째</div>
        <div class="home-clock" id="home-clock">${getTimeString()}</div>
        <div class="home-money">₩${gameState.money.toLocaleString()}</div>
      </div>

      <div class="home-menu">
        <button class="home-btn" onclick="doSleep()">
          <span class="home-btn-icon">💤</span>
          <div class="home-btn-info">
            <div class="home-btn-label">수면</div>
            <div class="home-btn-desc">내일로 넘어간다</div>
          </div>
        </button>

        <button class="home-btn" onclick="doJournal()">
          <span class="home-btn-icon">📖</span>
          <div class="home-btn-info">
            <div class="home-btn-label">도감</div>
            <div class="home-btn-desc">잡은 물고기 기록</div>
          </div>
        </button>

        <button class="home-btn" onclick="doRest()">
          <span class="home-btn-icon">🪑</span>
          <div class="home-btn-info">
            <div class="home-btn-label">그냥 있기</div>
            <div class="home-btn-desc">2시간 흐른다</div>
          </div>
        </button>
      </div>

      <div class="home-monologue" id="home-monologue"></div>
    </div>
  `;
  showHomeMonologue();
}

function getTimeString() {
  const h = gameState.hour;
  const m = String(gameState.minute).padStart(2, '0');
  const period = h < 12 ? '오전' : '오후';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${h12}:${m}`;
}

// ── 수면 ──
function doSleep() {
  const el = document.getElementById('home-monologue');
  if (el) el.textContent = '눈을 감는다.';

  setTimeout(() => {
    // 다음날 08:00으로
    gameState.day++;
    gameState.hour   = 8;
    gameState.minute = 0;
    saveGame();
    updateHUD();
    updateBgByTime();

    // 수면 독백
    const monologue = sleepMonologues[Math.floor(Math.random() * sleepMonologues.length)];
    showSleepResult(monologue);
  }, 1000);
}

const sleepMonologues = [
  '아침이 왔다.',
  '새 소리에 눈이 떠졌다.',
  '또 하루다.',
  '어젯밤 꿈을 꿨는데 기억이 안 난다.',
  '생각보다 일찍 일어났다.',
  '오늘은 뭘 잡을까.',
  '몸이 좀 가볍다.',
];

function showSleepResult(monologue) {
  const el = document.getElementById('vpanel-home');
  el.innerHTML = `
    <div class="home-container">
      <div class="sleep-result">
        <div class="sleep-day">백수 ${gameState.day}일째</div>
        <div class="sleep-time">오전 8:00</div>
        <div class="sleep-monologue">${monologue}</div>
        <button class="home-confirm-btn" onclick="renderHomeMenu()">일어나기</button>
      </div>
    </div>
  `;
}

// ── 그냥 있기 ──
function doRest() {
  passTime(120); // 2시간
  renderHomeMenu();
  const el = document.getElementById('home-monologue');
  if (el) el.textContent = '시간이 흘렀다.';
}

// ── 도감 ──
function doJournal() {
  const el = document.getElementById('vpanel-home');
  const fishList = Object.keys(fishingLog);

  const rows = fishList.length > 0
    ? fishList.map(name => {
        const log = fishingLog[name];
        const fish = fishDB.find(f => f.name === name);
        return `
          <div class="journal-row">
            <span class="journal-emoji">${fish?.emoji || '🐟'}</span>
            <div class="journal-info">
              <div class="journal-name">${name}</div>
              <div class="journal-detail">
                ${log.count}마리 · 최대 ${log.maxWeight}g
                ${log.released > 0 ? ` · 방생 ${log.released}회 ★` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('')
    : '<div class="journal-empty">아직 아무것도 잡지 못했다.</div>';

  el.innerHTML = `
    <div class="home-container">
      <div class="journal-header">
        <div class="home-btn-label" style="font-size:clamp(16px,3.5vw,22px); color:var(--amber-light);">
          도감
        </div>
        <div class="home-btn-desc">총 ${fishList.length}종 발견</div>
      </div>
      <div class="journal-list">${rows}</div>
      <button class="home-confirm-btn" onclick="renderHomeMenu()">닫기</button>
    </div>
  `;
}

// ── 집 독백 ──
const homeMonologues = [
  '조용하다.',
  '오늘 하루도 끝났다.',
  '할머니 집이 이렇게 아늑했나.',
  '서울에서는 이런 조용함이 없었다.',
  '내일은 일찍 나가봐야겠다.',
  '퇴직금이 얼마나 남았더라.',
  '핸드폰 알림이 없으니까 좋다.',
  '아무것도 안 해도 하루가 간다.',
];

function showHomeMonologue() {
  const el = document.getElementById('home-monologue');
  if (!el) return;
  // 저녁/밤에만 독백 표시
  if (gameState.hour >= 18) {
    el.textContent = homeMonologues[Math.floor(Math.random() * homeMonologues.length)];
  }
}
