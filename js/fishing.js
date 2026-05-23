// ════════════════════════════════
// fishing.js — 낚시 미니게임 v4
// ════════════════════════════════

const FishingState = {
  IDLE:       'idle',
  CASTING:    'casting',
  FLYING:     'flying',   // 찌 날아가는 중
  WAITING:    'waiting',  // 찌 대기
  BITE:       'bite',     // 입질 (찌 흔들림)
  STRIKE:     'strike',   // 찌 잠김 → 타이밍 윈도우
  REELING:    'reeling',  // 릴링
  RESULT:     'result',
};

let fishingPhase = FishingState.IDLE;
let canvas, ctx;
let animFrame = null;

// ── 찌 ──
const bobber = {
  x: 0, y: 0,
  targetX: 0, targetY: 0,
  floatY: 0, floatDir: 1,
  sinkAmount: 0,
  ripples: [],
};

// ── 캐스팅 ──
const casting = { power: 0, charging: false };

// ── 릴링 (게이지 방식) ──
const reeling = {
  gauge: 0,
  decayRate: 0.0003,  // 매우 느린 감소 — 탭할 시간 충분히 확보
  tapBoost: 0.22,
  missCount: 0,
  maxMiss: 0,
};

// ── 리듬 원 (Dredge 스타일) ──
const rhythm = {
  angle: 0,
  speed: 0,
  zones: [],          // 판정 구간
  active: false,
};

// ── 물고기 DB ──
const fishDB = [
  { name:'피라미', rarity:'common', emoji:'🐠', weight:[20,100],   price:300,
    pattern:{ zones:1, size:0.55, speed:0.018, maxMiss:3 } },
  { name:'붕어',   rarity:'common', emoji:'🐟', weight:[100,400],  price:500,
    pattern:{ zones:2, size:0.42, speed:0.024, maxMiss:3 } },
  { name:'쏘가리', rarity:'rare',   emoji:'🐡', weight:[200,800],  price:1200,
    pattern:{ zones:2, size:0.28, speed:0.036, maxMiss:2 } },
  { name:'메기',   rarity:'rare',   emoji:'🐟', weight:[300,1500], price:1500,
    pattern:{ zones:3, size:0.32, speed:0.030, maxMiss:2 } },
  { name:'가물치', rarity:'epic',   emoji:'🐍', weight:[500,3000], price:5000,
    pattern:{ zones:4, size:0.22, speed:0.044, maxMiss:1 } },
];

let currentFish = null;
let fishWeight  = 0;
const fishingLog = {};

// ── 캔버스 초기화 ──
function initFishingCanvas() {
  canvas = document.getElementById('fishing-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  if (!canvas) return;
  canvas.width  = canvas.offsetWidth  || window.innerWidth;
  canvas.height = canvas.offsetHeight || window.innerHeight;
  resetBobber();
}

function resetBobber() {
  if (!canvas) return;
  bobber.x = canvas.width  * 0.15;
  bobber.y = canvas.height * 0.80;
  bobber.sinkAmount = 0;
  bobber.floatY = 0;
  bobber.ripples = [];
}

// ── 낚시 시작 / 리셋 ──
function startFishing() {
  fishingPhase = FishingState.IDLE;
  setTimeout(() => {
    initFishingCanvas();
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame = requestAnimationFrame(fishingLoop);
  }, 100);
  showCastBtn();
  document.getElementById('fishing-result').style.display = 'none';
  document.getElementById('fishing-bottom-btns').style.display = 'none';
  document.getElementById('fishing-ui').style.display = 'flex';
  setFishingMsg('버튼을 길게 눌러 캐스팅');
}

function showCastBtn() {
  document.getElementById('cast-start-btn').style.display = 'flex';
  document.getElementById('reel-controls').style.display  = 'none';
}

function hideCastBtn() {
  document.getElementById('cast-start-btn').style.display = 'none';
}

function setFishingMsg(msg) {
  document.getElementById('fishing-msg').textContent = msg;
}

// ── 캐스팅 ──
function onCastStart() {
  if (fishingPhase !== FishingState.IDLE) return;
  fishingPhase     = FishingState.CASTING;
  casting.power    = 0;
  casting.charging = true;
  setFishingMsg('누르는 중... 길게 누를수록 멀리!');
}

function onCastRelease() {
  if (fishingPhase !== FishingState.CASTING) return;
  casting.charging = false;
  fishingPhase     = FishingState.FLYING;
  hideCastBtn();

  const power = Math.max(0.2, casting.power);
  bobber.targetX = canvas.width  * 0.25 + canvas.width  * 0.50 * power;
  bobber.targetY = canvas.height * (0.45 + (1 - power) * 0.08);
  bobber.x = canvas.width  * 0.60;   // 낚싯대 끝에서 출발
  bobber.y = canvas.height * 0.18;

  setFishingMsg('');
  animateCast(() => {
    addRipple(bobber.targetX, bobber.targetY);
    // 착수 후 1.5초 대기 후 입질 시작
    setTimeout(() => {
      if (fishingPhase === FishingState.FLYING) {
        fishingPhase = FishingState.WAITING;
        setFishingMsg('찌를 바라본다...\n(화면 탭으로 회수)');
        scheduleNextBite();
      }
    }, 1500);
  });
}

function animateCast(onLand) {
  const sx = canvas.width  * 0.18;
  const sy = canvas.height * 0.22;
  const ex = bobber.targetX;
  const ey = bobber.targetY;
  const py = Math.min(sy, ey) - canvas.height * 0.28;
  let t = 0;
  const cast = () => {
    t += 0.035;
    if (t >= 1) { bobber.x = ex; bobber.y = ey; if (onLand) onLand(); return; }
    bobber.x = sx + (ex - sx) * t;
    bobber.y = (1-t)*(1-t)*sy + 2*(1-t)*t*py + t*t*ey;
    requestAnimationFrame(cast);
  };
  requestAnimationFrame(cast);
}

// ── 회수 (WAITING 중 탭) ──
function retrieveLine() {
  fishingPhase = FishingState.IDLE;
  resetBobber();
  setFishingMsg('회수했다.');
  setTimeout(() => {
    showCastBtn();
    setFishingMsg('버튼을 길게 눌러 캐스팅');
  }, 800);
}

// ── 입질 ──
let biteTimer = null;

function scheduleNextBite() {
  if (fishingPhase !== FishingState.WAITING) return;
  const wait = 3000 + Math.random() * 8000;
  biteTimer = setTimeout(() => triggerBite(), wait);
}

function triggerBite() {
  if (fishingPhase !== FishingState.WAITING) return;
  const isFake = Math.random() < 0.35;
  fishingPhase = FishingState.BITE;

  shakeBobber(isFake ? 2 : 3, () => {
    if (isFake) {
      setTimeout(() => {
        if (fishingPhase === FishingState.BITE) {
          fishingPhase = FishingState.WAITING;
          bobber.sinkAmount = 0;
          setFishingMsg('찌를 바라본다...\n(화면 탭으로 회수)');
          scheduleNextBite();
        }
      }, 600);
    } else {
      // 진짜 입질 → STRIKE
      fishingPhase = FishingState.STRIKE;
      bobber.sinkAmount = 1;
      setFishingMsg('⚡ 지금이다! 화면을 탭!');
      // 타이밍 윈도우 1.5초
      setTimeout(() => {
        if (fishingPhase === FishingState.STRIKE) {
          // 타이밍 놓침
          fishingPhase = FishingState.WAITING;
          bobber.sinkAmount = 0;
          setFishingMsg('타이밍을 놓쳤다...\n(탭으로 회수)');
          scheduleNextBite();
        }
      }, 1500);
    }
  });
}

function shakeBobber(count, onDone) {
  let n = 0;
  const shake = () => {
    n++;
    bobber.sinkAmount = (n % 2 === 1) ? 0.5 : 0;
    if (n >= count * 2) { if (onDone) onDone(); return; }
    setTimeout(shake, 180);
  };
  setTimeout(shake, 80);
}

// ── STRIKE 탭 → 릴링 시작 ──
function onStrike() {
  if (fishingPhase !== FishingState.STRIKE) return;
  fishingPhase = FishingState.REELING;

  currentFish = selectFish();
  fishWeight  = Math.floor(
    currentFish.weight[0] +
    Math.random() * (currentFish.weight[1] - currentFish.weight[0])
  );

  const p = currentFish.pattern;
  // 리듬 원 설정
  rhythm.angle  = 0;
  rhythm.speed  = p.speed;
  rhythm.active = true;
  rhythm.zones  = [];
  const step = (Math.PI * 2) / p.zones;
  for (let i = 0; i < p.zones; i++) {
    const center = step * i;
    rhythm.zones.push({ start: center - p.size/2, end: center + p.size/2 });
  }

  // 게이지 설정
  reeling.gauge    = 0.15;
  reeling.missCount = 0;
  reeling.maxMiss  = p.maxMiss;

  // UI: 릴링 컨트롤 표시 (탭 버튼)
  document.getElementById('reel-controls').style.display = 'flex';
  setFishingMsg(`${currentFish.emoji} ${currentFish.name}! 구간에 맞춰 탭!`);
}

// ── 리듬 탭 (릴링 중) ──
function onRhythmTap() {
  if (fishingPhase !== FishingState.REELING) return;

  const angle = ((rhythm.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  let hit = false;
  for (const z of rhythm.zones) {
    let s = ((z.start % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
    let e = ((z.end   % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
    if (s <= e ? (angle >= s && angle <= e) : (angle >= s || angle <= e)) {
      hit = true; break;
    }
  }

  if (hit) {
    // 게이지 확 올라감
    reeling.gauge = Math.min(1, reeling.gauge + reeling.tapBoost);
    showTapFeedback('hit');
    if (reeling.gauge >= 1) {
      // 성공!
      fishingPhase = FishingState.RESULT;
      rhythm.active = false;
      document.getElementById('reel-controls').style.display = 'none';
      setFishingMsg(`${currentFish.emoji} 잡았다!`);
      setTimeout(() => showFishingResult(true, currentFish, fishWeight), 700);
    } else {
      setFishingMsg(`${currentFish.emoji} 좋아! 계속 탭!`);
    }
  } else {
    reeling.missCount++;
    showTapFeedback('miss');
    const left = reeling.maxMiss - reeling.missCount;
    if (reeling.missCount >= reeling.maxMiss) {
      fishingPhase = FishingState.RESULT;
      rhythm.active = false;
      document.getElementById('reel-controls').style.display = 'none';
      setFishingMsg('줄이 끊어졌다...');
      setTimeout(() => showFishingResult(false, null, 0), 1500);
    } else if (left === 1) {
      setFishingMsg('⚠️ 줄이 팽팽하다!');
    } else {
      setFishingMsg('조금 버텨라...');
    }
  }
}

// 탭 피드백 (캔버스 플래시)
let tapFeedback = { type: '', alpha: 0 };
function showTapFeedback(type) {
  tapFeedback.type  = type;
  tapFeedback.alpha = 1;
}

// ── 물고기 선택 ──
function selectFish() {
  const r = Math.random();
  if (r < 0.35) return fishDB[0];
  if (r < 0.65) return fishDB[1];
  if (r < 0.80) return fishDB[2];
  if (r < 0.93) return fishDB[3];
  return fishDB[4];
}

// ── 결과 ──
function showFishingResult(success, fish, weight) {
  const el = document.getElementById('fishing-result');
  el.style.display = 'flex';
  if (success && fish) {
    document.getElementById('result-emoji').textContent  = fish.emoji;
    document.getElementById('result-name').textContent   = fish.name;
    document.getElementById('result-weight').textContent = `${weight}g`;
    document.getElementById('result-action-btns').style.display = 'flex';
    document.getElementById('result-miss').style.display = 'none';
    registerFish(fish, weight);
  } else {
    document.getElementById('result-emoji').textContent  = '🎣';
    document.getElementById('result-name').textContent   = '';
    document.getElementById('result-weight').textContent = '';
    document.getElementById('result-action-btns').style.display = 'none';
    document.getElementById('result-miss').style.display = 'block';
  }
}

function keepFish() { closeFishingResult(`${currentFish?.name}을(를) 보관했다.`); }
function releaseFish() {
  if (currentFish && fishingLog[currentFish.name])
    fishingLog[currentFish.name].released = (fishingLog[currentFish.name].released||0)+1;
  closeFishingResult(`잘 가라, ${currentFish?.name||'녀석'}.`);
}

function closeFishingResult(msg) {
  document.getElementById('fishing-result').style.display = 'none';
  setFishingMsg(msg);
  fishingPhase = FishingState.IDLE;
  rhythm.active = false;
  resetBobber();
  setTimeout(() => {
    showCastBtn();
    setFishingMsg('버튼을 길게 눌러 캐스팅');
    document.getElementById('fishing-bottom-btns').style.display = 'flex';
  }, 1500);
}

function retryFishing() {
  document.getElementById('fishing-result').style.display = 'none';
  document.getElementById('fishing-bottom-btns').style.display = 'none';
  passTime(30);
  fishingPhase = FishingState.IDLE;
  rhythm.active = false;
  resetBobber();
  showCastBtn();
  setFishingMsg('버튼을 길게 눌러 캐스팅');
}

function registerFish(fish, weight) {
  if (!fish) return;
  if (!fishingLog[fish.name]) fishingLog[fish.name] = { count:0, maxWeight:0, released:0 };
  fishingLog[fish.name].count++;
  fishingLog[fish.name].maxWeight = Math.max(fishingLog[fish.name].maxWeight, weight);
}

// ── 렌더 루프 ──
function fishingLoop() {
  if (!canvas || !ctx) { animFrame = requestAnimationFrame(fishingLoop); return; }
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 리듬 원 회전
  if (rhythm.active) {
    rhythm.angle += rhythm.speed;

    // 게이지 서서히 감소
    reeling.gauge = Math.max(0, reeling.gauge - reeling.decayRate);
    if (reeling.gauge <= 0 && fishingPhase === FishingState.REELING) {
      // 게이지 0 → 실패
      fishingPhase = FishingState.RESULT;
      rhythm.active = false;
      document.getElementById('reel-controls').style.display = 'none';
      setFishingMsg('놓쳤다... 줄이 풀렸다.');
      setTimeout(() => showFishingResult(false, null, 0), 1500);
    }
  }

  // 탭 피드백 페이드
  if (tapFeedback.alpha > 0) tapFeedback.alpha -= 0.04;

  // 찌 부유
  if ([FishingState.WAITING, FishingState.REELING].includes(fishingPhase)) {
    bobber.floatY += 0.05 * bobber.floatDir;
    if (Math.abs(bobber.floatY) > 5) bobber.floatDir *= -1;
  }

  // 캐스팅 파워
  if (fishingPhase === FishingState.CASTING && casting.charging) {
    casting.power = Math.min(1, casting.power + 0.012);
    drawCastingPower();
  }

  updateRipples();

  if (![FishingState.IDLE, FishingState.CASTING].includes(fishingPhase)) {
    drawLine();
    drawBobber();
    drawRipples();
  }

  drawRod();

  if (rhythm.active) {
    drawRhythmCircle();
    drawGauge();
  }

  animFrame = requestAnimationFrame(fishingLoop);
}

// ── 리듬 원형 UI (캔버스 상단) ──
function drawRhythmCircle() {
  const cx = canvas.width  * 0.5;
  const cy = canvas.height * 0.30;
  const R  = Math.min(canvas.width, canvas.height) * 0.14;

  // 외곽
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI*2);
  ctx.strokeStyle = 'rgba(240,220,170,0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 판정 구간 (초록)
  for (const z of rhythm.zones) {
    ctx.beginPath();
    ctx.arc(cx, cy, R, z.start - Math.PI/2, z.end - Math.PI/2);
    ctx.strokeStyle = 'rgba(100,220,80,0.75)';
    ctx.lineWidth = 12;
    ctx.stroke();
  }

  // 미스 점
  for (let i = 0; i < reeling.maxMiss; i++) {
    const da = -Math.PI/2 + (i - reeling.maxMiss/2) * 0.28;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(da)*(R+18), cy + Math.sin(da)*(R+18), 6, 0, Math.PI*2);
    ctx.fillStyle = i < reeling.missCount ? '#e05050' : 'rgba(220,80,80,0.25)';
    ctx.fill();
  }

  // 탭 피드백 플래시
  if (tapFeedback.alpha > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, R*1.15, 0, Math.PI*2);
    ctx.fillStyle = tapFeedback.type === 'hit'
      ? `rgba(100,255,80,${tapFeedback.alpha * 0.35})`
      : `rgba(255,80,80,${tapFeedback.alpha * 0.35})`;
    ctx.fill();

    ctx.font = `bold ${Math.round(R*0.38)}px 'Noto Sans KR'`;
    ctx.textAlign = 'center';
    ctx.fillStyle = tapFeedback.type === 'hit'
      ? `rgba(120,255,100,${tapFeedback.alpha})`
      : `rgba(255,100,100,${tapFeedback.alpha})`;
    ctx.fillText(tapFeedback.type === 'hit' ? 'NICE!' : 'MISS', cx, cy + R*0.14);
  }

  // 마커
  const mx = cx + Math.cos(rhythm.angle - Math.PI/2) * R;
  const my = cy + Math.sin(rhythm.angle - Math.PI/2) * R;
  ctx.beginPath();
  ctx.arc(mx, my, 10, 0, Math.PI*2);
  ctx.fillStyle = '#f0e4cc';
  ctx.fill();
  ctx.strokeStyle = '#c8922a';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 물고기 이모지
  ctx.font = `${Math.round(R*0.5)}px serif`;
  ctx.textAlign = 'center';
  ctx.fillText(currentFish?.emoji || '🐟', cx, cy + R*0.18);
}

// ── 게이지 (하단 바) ──
function drawGauge() {
  const gw = canvas.width  * 0.55;
  const gh = 16;
  const gx = (canvas.width - gw) / 2;
  const gy = canvas.height * 0.50;

  // 배경
  ctx.fillStyle = 'rgba(10,8,4,0.65)';
  ctx.beginPath(); ctx.roundRect(gx, gy, gw, gh, 8); ctx.fill();

  // 게이지
  const color = reeling.gauge > 0.6 ? '#60d840'
              : reeling.gauge > 0.3 ? '#e8a030' : '#e05050';
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(gx, gy, gw * reeling.gauge, gh, 8); ctx.fill();

  // 라벨
  ctx.fillStyle = 'rgba(240,228,204,0.6)';
  ctx.font = `${Math.round(canvas.width * 0.022)}px 'Noto Sans KR'`;
  ctx.textAlign = 'center';
  ctx.fillText('릴링 게이지', canvas.width/2, gy - 8);
}

// ── 낚싯대 ──
function drawRod() {
  if (!ctx || !canvas) return;
  const rx   = canvas.width  * 0.45;   // 중앙 약간 왼쪽
  const ry   = canvas.height * 0.92;   // 하단
  const tipX = canvas.width  * 0.60;   // 오른쪽 위로 뻗음
  const tipY = canvas.height * 0.18;

  ctx.beginPath();
  ctx.moveTo(rx, ry);
  ctx.quadraticCurveTo(rx + 40, ry - 80, tipX, tipY);
  ctx.strokeStyle = '#5a3a14';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.stroke();

  // 릴
  ctx.beginPath();
  ctx.arc(rx + 18, ry - 35, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#7a5a30';
  ctx.fill();
  ctx.strokeStyle = '#4a3010';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ── 낚싯줄 ──
function drawLine() {
  if (!ctx||!canvas) return;
  const tx = canvas.width  * 0.60;  // 낚싯대 끝
  const ty = canvas.height * 0.18;
  const active=[FishingState.WAITING,FishingState.BITE,
                FishingState.STRIKE,FishingState.REELING].includes(fishingPhase);
  const bx=active?bobber.targetX:bobber.x;
  const by=(active?bobber.targetY:bobber.y)+bobber.floatY-bobber.sinkAmount*14;
  const t=reeling.missCount/Math.max(reeling.maxMiss,1);
  ctx.beginPath(); ctx.moveTo(tx,ty);
  ctx.quadraticCurveTo((tx+bx)/2,ty+(by-ty)*0.25+15,bx,by);
  ctx.strokeStyle=`rgba(${180+t*60},${160-t*80},100,0.85)`;
  ctx.lineWidth=1.5; ctx.stroke();
}

// ── 찌 ──
function drawBobber() {
  if (!ctx||!canvas) return;
  const active=[FishingState.WAITING,FishingState.BITE,FishingState.STRIKE,FishingState.REELING].includes(fishingPhase);
  const bx=active?bobber.targetX:bobber.x;
  const by=(active?bobber.targetY:bobber.y)+bobber.floatY+bobber.sinkAmount*16;
  ctx.beginPath(); ctx.ellipse(bx,by+2,14,4,0,0,Math.PI*2);
  ctx.fillStyle='rgba(150,200,200,0.2)'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(bx,by+7,5,10,0,0,Math.PI*2);
  ctx.fillStyle='#cc3333'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(bx,by-4,5,8,0,0,Math.PI*2);
  ctx.fillStyle='#f5f5f5'; ctx.fill();
  ctx.beginPath(); ctx.arc(bx,by-11,3,0,Math.PI*2);
  ctx.fillStyle='#e8b84b'; ctx.fill();
  if (fishingPhase===FishingState.STRIKE) {
    const p=0.4+Math.sin(Date.now()*0.012)*0.4;
    ctx.beginPath(); ctx.arc(bx,by,22,0,Math.PI*2);
    ctx.strokeStyle=`rgba(255,220,50,${p})`; ctx.lineWidth=2.5; ctx.stroke();
  }
}

// ── 물결 ──
function addRipple(x,y){bobber.ripples.push({x,y,r:0,alpha:0.5});}
function updateRipples(){
  bobber.ripples=bobber.ripples.filter(r=>r.alpha>0);
  bobber.ripples.forEach(r=>{r.r+=1.0;r.alpha-=0.01;});
}
function drawRipples(){
  if(!ctx)return;
  bobber.ripples.forEach(r=>{
    ctx.beginPath();ctx.ellipse(r.x,r.y,r.r,r.r*0.35,0,0,Math.PI*2);
    ctx.strokeStyle=`rgba(180,210,200,${r.alpha})`;ctx.lineWidth=1;ctx.stroke();
  });
}

// ── 캐스팅 파워 ──
function drawCastingPower(){
  if(!ctx||!canvas)return;
  const cx=canvas.width*0.5,cy=canvas.height*0.75,w=canvas.width*0.38,h=14;
  ctx.fillStyle='rgba(10,8,4,0.65)';
  ctx.beginPath();ctx.roundRect(cx-w/2,cy,w,h,7);ctx.fill();
  const c=casting.power>0.8?'#e05050':casting.power>0.5?'#e8a030':'#80c840';
  ctx.fillStyle=c;ctx.beginPath();ctx.roundRect(cx-w/2,cy,w*casting.power,h,7);ctx.fill();
  ctx.fillStyle='rgba(240,228,204,0.85)';
  ctx.font=`${Math.round(canvas.width*0.026)}px 'Noto Sans KR'`;
  ctx.textAlign='center';ctx.fillText('손을 떼면 캐스팅!',cx,cy-12);
}

// ── 키보드 ──
document.addEventListener('keydown', e=>{
  if(e.code==='Space'){
    e.preventDefault();
    if     (fishingPhase===FishingState.IDLE)    onCastStart();
    else if(fishingPhase===FishingState.CASTING) onCastRelease();
    else if(fishingPhase===FishingState.STRIKE)  onStrike();
    else if(fishingPhase===FishingState.REELING) onRhythmTap();
    else if(fishingPhase===FishingState.WAITING) retrieveLine();
  }
});
document.addEventListener('keyup',e=>{
  if(e.code==='Space'&&fishingPhase===FishingState.CASTING) onCastRelease();
});

// ── 화면 탭 ──
document.addEventListener('click',e=>{
  if(e.target.closest('button')||e.target.closest('#fishing-result')) return;
  if(e.target.closest('#fishing-ui')) return;
  if     (fishingPhase===FishingState.STRIKE)  onStrike();
  else if(fishingPhase===FishingState.REELING) onRhythmTap();
  else if(fishingPhase===FishingState.WAITING||fishingPhase===FishingState.BITE) retrieveLine();
});
