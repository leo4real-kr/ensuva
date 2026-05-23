// ════════════════════════════════
// sound.js — 사운드 관리
// ════════════════════════════════

// ── Web Audio API (강소리 끊김 없는 루프) ──
let audioCtx = null;
let riverBuffer = null;
let riverSource = null;
let riverGain   = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

async function loadRiverBuffer() {
  try {
    const ctx = getAudioCtx();
    const res = await fetch('snd/river.mp3');
    const arr = await res.arrayBuffer();
    riverBuffer = await ctx.decodeAudioData(arr);
  } catch(e) {
    console.warn('river buffer load failed', e);
  }
}

function playRiverLoop() {
  if (!riverBuffer || gameState.muted) return;
  const ctx = getAudioCtx();
  if (riverSource) { try { riverSource.stop(); } catch(e){} }
  riverGain = ctx.createGain();
  riverGain.gain.value = 0.4;
  riverGain.connect(ctx.destination);
  riverSource = ctx.createBufferSource();
  riverSource.buffer = riverBuffer;
  riverSource.loop   = true;     // Web Audio 루프 — 샘플 단위 정밀도
  riverSource.connect(riverGain);
  riverSource.start(0);
}

function stopRiverLoop() {
  if (riverSource) { try { riverSource.stop(); } catch(e){} riverSource = null; }
}

// ── 일반 Audio (BGM, 새소리) ──
const sounds = {
  birds: new Audio('snd/birds.mp3'),
  bgm:   new Audio('snd/bgm_river.mp3'),
};

sounds.bgm.loop    = true;
sounds.birds.volume = 0.3;
sounds.bgm.volume   = 0.25;

async function startSounds() {
  if (gameState.muted) return;
  await loadRiverBuffer();
  playRiverLoop();
  sounds.bgm.play().catch(() => {});
  scheduleBirds();
}

let birdsScheduled = false;
function scheduleBirds() {
  if (birdsScheduled) return;
  birdsScheduled = true;
  _nextBirds();
}

function _nextBirds() {
  setTimeout(() => {
    if (!gameState.muted) {
      sounds.birds.currentTime = 0;
      sounds.birds.play().catch(() => {});
    }
    sounds.birds.onended = _nextBirds;
  }, (20 + Math.random() * 60) * 1000);
}

function toggleSound() {
  gameState.muted = !gameState.muted;
  document.getElementById('sound-btn').textContent = gameState.muted ? '🔇' : '🔊';
  if (gameState.muted) {
    stopRiverLoop();
    sounds.birds.pause();
    sounds.bgm.pause();
  } else {
    playRiverLoop();
    sounds.bgm.play().catch(() => {});
  }
}

function switchBGM(src) {
  if (sounds.bgm.src.endsWith(src)) return;
  sounds.bgm.pause();
  sounds.bgm.src = src;
  if (!gameState.muted) sounds.bgm.play().catch(() => {});
}

function setRiverSound(on) {
  if (on) {
    if (riverBuffer) {
      if (!riverSource) playRiverLoop();
    } else {
      // 버퍼 아직 로드 안 됐으면 로드 후 재생
      loadRiverBuffer().then(() => {
        if (!gameState.muted) playRiverLoop();
      });
    }
  } else {
    stopRiverLoop();
  }
}

// 사운드는 startGame() 에서만 명시적으로 시작
// (오프닝 중 무음 유지)
