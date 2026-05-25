// ════════════════════════════════
// home.js — 집 화면 (할머니 포함)
// ════════════════════════════════

function showHome() {
  document.getElementById('vpanel-home').classList.add('active');
  renderHomeMenu();
}

function getTimeString() {
  const h = gameState.hour;
  const m = String(gameState.minute).padStart(2, '0');
  const period = h < 12 ? '오전' : '오후';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${h12}:${m}`;
}

// ── 메인 메뉴 ──
function renderHomeMenu() {
  const el = document.getElementById('vpanel-home');
  const canSleep = !gameState.sleptToday;
  const snack = getAvailableSnack();

  el.innerHTML = `
    <div class="home-container">
      <div class="home-time-info">
        <div class="home-day">백수 ${gameState.day}일째</div>
        <div class="home-clock">${getTimeString()}</div>
        <div class="home-money">₩${gameState.money.toLocaleString()}</div>
      </div>

      <div class="home-menu">
        <button class="home-btn" onclick="doSleep()" ${canSleep ? '' : 'disabled style="opacity:0.35"'}>
          <span class="home-btn-icon">💤</span>
          <div class="home-btn-info">
            <div class="home-btn-label">수면</div>
            <div class="home-btn-desc">${canSleep ? '내일로 넘어간다' : '오늘은 이미 잤다'}</div>
          </div>
        </button>

        ${snack ? `
        <button class="home-btn" onclick="eatSnack()">
          <span class="home-btn-icon">${snack.emoji}</span>
          <div class="home-btn-info">
            <div class="home-btn-label">할머니 ${snack.name}</div>
            <div class="home-btn-desc">체력 +${snack.hp} 회복</div>
          </div>
        </button>` : ''}

        <button class="home-btn" onclick="doHangout()">
          <span class="home-btn-icon">🪑</span>
          <div class="home-btn-info">
            <div class="home-btn-label">그냥 있기</div>
            <div class="home-btn-desc">할머니와 시간을 보낸다</div>
          </div>
        </button>

        <button class="home-btn" onclick="doJournal()">
          <span class="home-btn-icon">📖</span>
          <div class="home-btn-info">
            <div class="home-btn-label">도감</div>
            <div class="home-btn-desc">잡은 물고기 기록</div>
          </div>
        </button>
      </div>

      <div class="home-monologue" id="home-monologue"></div>
    </div>
  `;
  showHomeMonologue();
}

// ── 수면 (하루 1회 제한) ──
function doSleep() {
  if (gameState.sleptToday) return;
  const el = document.getElementById('home-monologue');
  if (el) el.textContent = '눈을 감는다.';

  setTimeout(() => {
    gameState.day++;
    gameState.hour      = 8;
    gameState.minute    = 0;
    gameState.sleptToday = false;
    gameState.hp        = gameState.maxHp; // 완전 회복
    saveGame();
    updateHUD();
    updateBgByTime();

    const mono = sleepMonologues[Math.floor(Math.random() * sleepMonologues.length)];
    showSleepResult(mono);
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
  '할머니가 이미 일어나 계셨다.',
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

// ── 할머니 간식 ──
const snacks = [
  { name: '식혜',  emoji: '🥤', hp: 10, hours: [14,15,16,17] },
  { name: '수박',  emoji: '🍉', hp: 15, hours: [11,12,13,14,15,16,17] },
  { name: '고구마',emoji: '🍠', hp: 10, hours: [18,19,20,21] },
  { name: '약과',  emoji: '🍪', hp: 20, hours: null }, // 랜덤
];

let snackEatenToday = false;

function getAvailableSnack() {
  if (snackEatenToday) return null;
  const h = gameState.hour;

  // 약과는 30% 확률로 등장
  if (Math.random() < 0.3) return snacks[3];

  // 시간대별 간식
  const available = snacks.slice(0, 3).filter(s => s.hours.includes(h));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

function eatSnack() {
  const snack = getAvailableSnack();
  if (!snack) return;
  snackEatenToday = true;
  gainHp(snack.hp, snack.name);
  passTime(15);

  const msgs = [
    `할머니가 ${snack.name}을 내오셨다.`,
    `"많이 먹어." 할머니가 한 마디 하셨다.`,
    `달달하다. 오랜만에 먹어보는 맛이다.`,
  ];
  const el = document.getElementById('home-monologue');
  if (el) el.textContent = msgs[Math.floor(Math.random() * msgs.length)];

  setTimeout(() => renderHomeMenu(), 1500);
}

// ── 그냥 있기 (할머니와 시간 보내기) ──
const hangoutEvents = [
  {
    title: '할머니와 TV 시청',
    emoji: '📺',
    desc: '오래된 TV에서 뉴스가 나온다.',
    monologue: '"경기가 안 좋다네." 할머니가 말씀하셨다. 나는 아무 말도 안 했다.',
    time: 60, hp: -2,
  },
  {
    title: '마당 청소 돕기',
    emoji: '🧹',
    desc: '할머니를 도와 마당을 쓴다.',
    monologue: '"고맙다." 짧은 한 마디. 그래도 기분이 좋다.',
    time: 60, hp: -5,
  },
  {
    title: '마루에 앉아있기',
    emoji: '🌿',
    desc: '마루에 나란히 앉아 아무 말도 안 한다.',
    monologue: '말이 없어도 불편하지 않다. 이상하게.',
    time: 60, hp: -1,
  },
  {
    title: '할머니 옛날 얘기',
    emoji: '💬',
    desc: '할머니가 젊었을 때 이야기를 꺼내신다.',
    monologue: '"그때는 여기도 사람이 많았어." 할머니가 창밖을 보셨다.',
    time: 90, hp: 0,
  },
  {
    title: '낮잠',
    emoji: '😴',
    desc: '방석에 누워 잠깐 눈을 감는다.',
    monologue: '15분이 지났다. 할머니가 담요를 덮어주셨나 보다.',
    time: 60, hp: 20,
  },
  {
    title: '스마트폰 보다 끄기',
    emoji: '📱',
    desc: '전 직장 단톡방을 열었다가 닫았다.',
    monologue: '"팀장이 또 야근이네." 나는 폰을 엎어놓았다.',
    time: 30, hp: -1,
  },
];

function doHangout() {
  const event = hangoutEvents[Math.floor(Math.random() * hangoutEvents.length)];
  const el = document.getElementById('vpanel-home');

  el.innerHTML = `
    <div class="home-container">
      <div class="hangout-card">
        <div class="hangout-emoji">${event.emoji}</div>
        <div class="hangout-title">${event.title}</div>
        <div class="hangout-desc">${event.desc}</div>
        <div class="hangout-mono">${event.monologue}</div>
        <div class="hangout-cost">
          ⏱ ${event.time}분
          ${event.hp > 0 ? `<span style="color:#90e870"> ❤️ +${event.hp}</span>`
          : event.hp < 0 ? `<span style="color:#e07070"> ❤️ ${event.hp}</span>` : ''}
        </div>
        <button class="home-confirm-btn" onclick="confirmHangout(${hangoutEvents.indexOf(event)})">
          확인
        </button>
      </div>
    </div>
  `;
}

function confirmHangout(idx) {
  const event = hangoutEvents[idx];
  passTime(event.time);
  if (event.hp > 0) gainHp(event.hp, '');
  else if (event.hp < 0) loseHp(Math.abs(event.hp));
  renderHomeMenu();
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
          </div>`;
      }).join('')
    : '<div class="journal-empty">아직 아무것도 잡지 못했다.</div>';

  el.innerHTML = `
    <div class="home-container">
      <div class="journal-header">
        <div class="home-btn-label" style="font-size:clamp(16px,3.5vw,22px);color:var(--amber-light);">도감</div>
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
  '할머니가 차를 끓여주셨다.',
];

function showHomeMonologue() {
  const el = document.getElementById('home-monologue');
  if (!el) return;
  if (gameState.hour >= 18) {
    el.textContent = homeMonologues[Math.floor(Math.random() * homeMonologues.length)];
  }
}
