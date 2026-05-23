// ════════════════════════════════
// game.js — 메인 게임 루프 (마을 허브 구조)
// ════════════════════════════════

// ── 씬 정의 ──
const Scene = {
  VILLAGE:       'village',      // 마을 (기본 허브)
  RIVER_SELECT:  'river_select', // 강 - 행동 선택
  RIVER_VIEW:    'river_view',   // 강 - 구경 중
  RIVER_FISHING: 'river_fishing',// 강 - 낚시 중
};

let currentScene = Scene.VILLAGE;

// ── HUD ──
function updateHUD() {
  const h = gameState.hour;
  const m = String(gameState.minute).padStart(2, '0');
  const period = h < 12 ? '오전' : '오후';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  document.getElementById('hud-time').textContent = `${period} ${h12}:${m}`;
  document.getElementById('hud-date').textContent = `백수 ${gameState.day}일째`;
  document.getElementById('hud-money').textContent = gameState.money.toLocaleString();
  updateTimeOverlay();
}

function updateTimeOverlay() {
  const h = gameState.hour;
  let ov = '';
  if      (h >= 5  && h < 8)  ov = 'rgba(255,200,100,0.1)';
  else if (h >= 8  && h < 17) ov = 'rgba(0,0,0,0)';
  else if (h >= 17 && h < 19) ov = 'rgba(200,100,30,0.2)';
  else if (h >= 19 && h < 21) ov = 'rgba(100,50,20,0.35)';
  else                         ov = 'rgba(10,5,20,0.5)';
  document.getElementById('time-overlay').style.background = ov;
}

// ── 시간 소모 ──
function passTime(minutes) {
  gameState.minute += minutes;
  while (gameState.minute >= 60) {
    gameState.minute -= 60;
    gameState.hour++;
  }
  if (gameState.hour >= 24) {
    gameState.hour = 8; // 다음날 기상
    gameState.day++;
  }
  updateHUD();
  updateBgByTime();
  saveGame();
}

// ── 시간 자동 흐름 (강구경) ──
let timeInterval = null;

function startTimeFlow() {
  if (timeInterval) return;
  timeInterval = setInterval(() => {
    passTime(30); // 10초 실시간 = 30분
  }, 10000);
}

function stopTimeFlow() {
  clearInterval(timeInterval);
  timeInterval = null;
}

// ── 배경 이미지 ──
// 시간대별 배경 인덱스 (08~10, 11~13, 14~17, 18~19, 20~)
function getBgIndexByHour(hour) {
  if (hour < 11) return 1;
  if (hour < 14) return 2;
  if (hour < 18) return 3;
  if (hour < 20) return 4;
  return 5;
}

const bgSets = {
  village: ['bg-village-1', 'bg-village-2', 'bg-village-3', 'bg-village-4', 'bg-village-5'],
  river:   ['bg-river-1',   'bg-river-2',   'bg-river-3',   'bg-river-4',   'bg-river-5'],
};

let bgTimer = null;
let currentBgSet = 'village';
let currentBgIdx = 1;

function updateBgByTime() {
  const newIdx = getBgIndexByHour(gameState.hour);
  if (newIdx === currentBgIdx) return;
  const imgs = bgSets[currentBgSet];
  const curEl  = document.getElementById(`${currentBgSet === 'village' ? 'bg-village' : 'bg-river'}-${currentBgIdx}`);
  const nextEl = document.getElementById(`${currentBgSet === 'village' ? 'bg-village' : 'bg-river'}-${newIdx}`);
  if (nextEl) nextEl.classList.add('visible');
  setTimeout(() => { if (curEl) curEl.classList.remove('visible'); }, 2000);
  currentBgIdx = newIdx;
}

function startBgLoop(set) {
  stopBgLoop();
  currentBgSet = set;
  currentBgIdx = getBgIndexByHour(gameState.hour);

  // 현재 시간에 맞는 이미지만 보이기
  document.querySelectorAll('.scene-img').forEach(i => i.classList.remove('visible'));
  const el = document.getElementById(`${set === 'village' ? 'bg-village' : 'bg-river'}-${currentBgIdx}`);
  if (el) el.classList.add('visible');
}

function stopBgLoop() {
  clearInterval(bgTimer);
  bgTimer = null;
}

// ── 씬 전환 ──
function showScene(scene) {
  currentScene = scene;

  // 모든 씬 패널 숨기기
  document.querySelectorAll('.scene-panel').forEach(p => {
    p.style.display = 'none';
  });

  // 낚시 UI 기본 숨김
  const fishingUI     = document.getElementById('fishing-ui');
  const fishingCanvas = document.getElementById('fishing-canvas');
  const fishingResult = document.getElementById('fishing-result');
  if (fishingUI)     fishingUI.style.display     = 'none';
  if (fishingCanvas) fishingCanvas.style.display = 'none';
  if (fishingResult) fishingResult.style.display = 'none';

  stopTimeFlow();
  hideMonologue();

  switch (scene) {

    case Scene.VILLAGE:
      document.getElementById('scene-village').style.display = 'flex';
      document.getElementById('village-tabs').style.display  = 'flex';
      startBgLoop('village');
      switchBGM('snd/bgm_main.mp3');
      setRiverSound(false);
      break;

    case Scene.RIVER_SELECT:
      document.getElementById('scene-river-select').style.display = 'flex';
      document.getElementById('village-tabs').style.display        = 'none';
      startBgLoop('river');
      switchBGM('snd/bgm_river.mp3');
      setRiverSound(true);
      break;

    case Scene.RIVER_VIEW:
      document.getElementById('scene-river-view').style.display = 'flex';
      document.getElementById('village-tabs').style.display      = 'none';
      startBgLoop('river');
      switchBGM('snd/bgm_river.mp3');
      setRiverSound(true);
      startTimeFlow();
      showRandomMonologue();
      break;

    case Scene.RIVER_FISHING:
      document.getElementById('scene-river-fishing').style.display = 'flex';
      document.getElementById('village-tabs').style.display         = 'none';
      if (fishingCanvas) fishingCanvas.style.display = '';
      if (fishingUI)     fishingUI.style.display     = 'flex';
      startBgLoop('river');
      switchBGM('snd/bgm_fishing.mp3');
      setRiverSound(true);
      break;
  }

  updateHUD();
}

// ── 마을 탭 ──
let currentVillageTab = 'shop';

function setVillageTab(tab, e) {
  currentVillageTab = tab;
  document.querySelectorAll('.village-tab').forEach(t => t.classList.remove('active'));
  if (e && e.currentTarget) e.currentTarget.classList.add('active');
  document.querySelectorAll('.village-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`vpanel-${tab}`).classList.add('active');
}

// ── 강으로 이동 ──
function goToRiver() {
  passTime(30); // 이동 30분
  showScene(Scene.RIVER_SELECT);
}

// ── 강 행동 선택 ──
function doRiverView() {
  showScene(Scene.RIVER_VIEW);
}

function doRiverFishing() {
  showScene(Scene.RIVER_FISHING);
  startFishing();
}

function returnToVillage() {
  passTime(30); // 귀환 30분
  showScene(Scene.VILLAGE);
}

// ── 강구경 돌아가기 ──
function stopRiverView() {
  stopTimeFlow();
  showScene(Scene.RIVER_SELECT);
}

// ── 낚시 후 행동 ──
function retryFishing() {
  passTime(30);
  startFishing();
}

function returnFromFishing() {
  showScene(Scene.RIVER_SELECT);
}

// ── 독백 ──
const monologues = [
  '그냥 흐른다.',
  '강은 아무것도 묻지 않는다.',
  '찌를 안 던져도 되는 날도 있다.',
  '서울이 점점 멀어지는 기분이다.',
  '물소리가 이렇게 컸나.',
  '할머니는 여기서 뭘 하셨을까.',
  '아무것도 안 해도 시간은 간다.',
  '바람이 좀 분다.',
  '퇴직금이 얼마 남았더라.',
  '나 여기 잘 있다, 팀장.',
];

let monoTimer = null;

function showRandomMonologue() {
  hideMonologue();
  monoTimer = setTimeout(() => {
    const el = document.getElementById('monologue');
    document.getElementById('monologue-text').textContent =
      monologues[Math.floor(Math.random() * monologues.length)];
    el.classList.add('visible');
    setTimeout(() => {
      el.classList.remove('visible');
      if (currentScene === Scene.RIVER_VIEW) showRandomMonologue();
    }, 5000);
  }, (15 + Math.random() * 20) * 1000);
}

function hideMonologue() {
  clearTimeout(monoTimer);
  const el = document.getElementById('monologue');
  if (el) el.classList.remove('visible');
}

// ── 게임 시작 ──
function startGame() {
  const g = document.getElementById('game');
  g.style.display = 'flex';
  requestAnimationFrame(() => requestAnimationFrame(() => g.classList.add('active')));
  showScene(Scene.VILLAGE);
  startSounds();
  initFishingCanvas();
}
