// ════════════════════════════════
// player.js — 플레이어 데이터 & 게임 상태
// ════════════════════════════════

const player = {
  gender: 'm',
  lastName: '',
  firstName: '',
  nickname1: '',
  nickname2: '',
  get fullName() { return this.lastName + this.firstName; }
};

const gameState = {
  day: 1,
  hour: 8,
  minute: 0,
  money: 0,
  muted: false,
  bgIndex: 0,
  hp: 100,      // 체력 (0~100)
  maxHp: 100,
  sleptToday: false,  // 하루 1회 수면 제한
};

// ── 조사 자동 판별 ──
function josa(name, type) {
  if (!name) return name;
  const code = name.charCodeAt(name.length - 1);
  const hasBatchim = (code - 0xAC00) % 28 > 0;
  const map = {
    '아야':   hasBatchim ? '아' : '야',
    '은는':   hasBatchim ? '은' : '는',
    '이가':   hasBatchim ? '이' : '가',
    '을를':   hasBatchim ? '을' : '를',
    '과와':   hasBatchim ? '과' : '와',
    '으로로': hasBatchim ? '으로' : '로',
    '이':     hasBatchim ? '이' : '',    // 호격 '이' (건우야 vs 민준이야)
  };
  return name + (map[type] ?? '');
}

// 태그 치환 (조사 포함)
function tag(t) {
  return t
    .replace(/\[NAME\]/g,  player.fullName)
    .replace(/\[FIRST\]/g, player.firstName)
    .replace(/\[LAST\]/g,  player.lastName)
    .replace(/\[NICK1\]/g, player.nickname1)
    .replace(/\[NICK2\]/g, player.nickname2)
    // 조사 태그: [FIRST:아야] → 건우야 / 민준아
    .replace(/\[FIRST:([가-힣a-z]+)\]/g, (_, type) => josa(player.firstName, type))
    .replace(/\[NAME:([가-힣a-z]+)\]/g,  (_, type) => josa(player.fullName,  type))
    .replace(/\[NICK1:([가-힣a-z]+)\]/g, (_, type) => josa(player.nickname1, type))
    .replace(/\[NICK2:([가-힣a-z]+)\]/g, (_, type) => josa(player.nickname2, type));
}

// localStorage 저장/불러오기
function saveGame() {
  localStorage.setItem('msv_player', JSON.stringify({
    gender: player.gender,
    lastName: player.lastName,
    firstName: player.firstName,
    nickname1: player.nickname1,
    nickname2: player.nickname2,
  }));
  localStorage.setItem('msv_state', JSON.stringify({
    day: gameState.day,
    hour: gameState.hour,
    minute: gameState.minute,
    money: gameState.money,
    hp: gameState.hp,
    sleptToday: gameState.sleptToday,
  }));
}

function loadGame() {
  const p = localStorage.getItem('msv_player');
  const s = localStorage.getItem('msv_state');
  if (p) Object.assign(player, JSON.parse(p));
  if (s) Object.assign(gameState, JSON.parse(s));
  return !!(p && s);
}
