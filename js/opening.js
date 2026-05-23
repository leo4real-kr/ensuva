// ════════════════════════════════
// opening.js — 오프닝 시퀀스
// ════════════════════════════════

const nicknames = {
  m: ['총각', '파랑 지붕 집 손자'],
  f: ['처자', '파랑 지붕 집 손녀'],
};

// ── 화면 전환 ──
function showOScreen(id) {
  document.querySelectorAll('.o-screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const el = document.getElementById(id);
  el.style.display = 'flex';
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('active')));
}

// ── 타이틀 ──
function handleTitleClick() {
  const ti = document.getElementById('o-title');
  ti.classList.add('fade-out');
  setTimeout(() => {
    ti.style.display = 'none';
    showOScreen('o-gender');
  }, 1500);
}

const ot = document.getElementById('o-title');
ot.addEventListener('click',    handleTitleClick);
ot.addEventListener('touchend', e => { e.preventDefault(); handleTitleClick(); });

// ── 성별 선택 ──
function selectGender(g) {
  player.gender = g;
  const c = document.getElementById('nick1-btns');
  c.innerHTML = '';
  nicknames[g].forEach(n => {
    const btn = document.createElement('button');
    btn.className = 'nick-btn';
    btn.textContent = n;
    btn.onclick = () => selectNick(1, n);
    c.appendChild(btn);
  });
  showOScreen('o-name');
  setTimeout(() => document.getElementById('input-last').focus(), 500);
}

// ── 이름 입력 ──
const inputLast  = document.getElementById('input-last');
const inputFirst = document.getElementById('input-first');

function updatePreview() {
  const l = inputLast.value.trim(), f = inputFirst.value.trim();
  document.getElementById('name-preview').textContent = (l || f) ? `${l}${f}` : '　';
}

inputLast.addEventListener('input',   updatePreview);
inputFirst.addEventListener('input',  updatePreview);
inputLast.addEventListener('keydown',  e => { if (e.key === 'Enter') inputFirst.focus(); });
inputFirst.addEventListener('keydown', e => { if (e.key === 'Enter') confirmName(); });

function confirmName() {
  const f = inputFirst.value.trim();
  if (!f) { inputFirst.focus(); return; }
  player.lastName  = inputLast.value.trim();
  player.firstName = f;
  showOScreen('o-nickname');
}

// ── 호칭 선택 ──
let nick1Done = false, nick2Done = false;

function selectNick(slot, value) {
  if (slot === 1) {
    player.nickname1 = value; nick1Done = true;
    document.querySelectorAll('#nick1-btns .nick-btn').forEach(b =>
      b.classList.toggle('selected', b.textContent === value)
    );
  } else {
    player.nickname2 = value; nick2Done = true;
    document.querySelectorAll('#nick2-btns .nick-btn').forEach(b =>
      b.classList.toggle('selected', b.textContent === value)
    );
  }
  document.getElementById('nick-confirm').disabled = !(nick1Done && nick2Done);
}

function confirmNickname() {
  if (!nick1Done || !nick2Done) return;
  const g = player.gender;
  document.getElementById('cut-01').src = `img/opening_${g}_01.png`;
  document.getElementById('cut-02').src = `img/opening_${g}_02.png`;
  document.getElementById('cut-04').src = `img/opening_${g}_04.png`;
  document.getElementById('cut-05').src = `img/opening_${g}_05.png`;
  document.getElementById('cut-06').src = `img/opening_${g}_06.png`;
  document.querySelectorAll('.o-screen').forEach(s => {
    s.classList.remove('active'); s.style.display = 'none';
  });
  startCutscene();
}

// ── 컷씬 ──
const cuts = [
  { img: 'cut-01', lines: [
    '인사팀과의 면담은\n거의 대부분 즐거운 결말을 내지 않는 걸\n알고 있었다.',
    '그 때 그 대화를 시작하기 전까지도,\n알 수 없는 쌔함이 내 몸을 감싸고 있었다.'
  ]},
  { img: 'cut-02', lines: [
    '"10년 넘게 과장님이 우리 회사를 위해\n노력해주신 점, 감사드립니다."',
    '"하지만 아시다시피\n경영상황이 좋지 않아서…"'
  ]},
  { img: 'cut-03', lines: [
    '권고사직.',
    '퇴직금은 퇴직연금으로 들어가고,\n내 손에 쥐어지는 건\n얼마의 위로금과 안내장 뿐이었다.'
  ]},
  { img: 'cut-04', lines: [
    '11년.',
    '주말이고 야간이고 새벽까지 일했었지만,\n고작 내 손에 쥐어진 건 그것 뿐이었다.'
  ]},
  { img: 'cut-05', lines: [
    '"우리 사랑하는 [FIRST:아야], 할미다.\n요새 많이 바쁘제?"',
    '할머니의 목소리를 듣자마자\n마음이 무너질 듯한 기분이었다.\n그리고 뭔가 후련한 기분도 들었다.'
  ]},
  { img: 'cut-06', lines: [
    '"아뇨 할머니,\n저 오래간만에 할머니 댁 가도 될까요?"',
    '"휴가…라기보다는,\n여름방학이거든요."'
  ]},
];

let curCut = 0, lineIdx = 0, isTyping = false, typingTimer = null;

function startCutscene() {
  const cs = document.getElementById('o-cutscene');
  cs.classList.add('active');
  curCut = 0; lineIdx = 0;

  // 오프닝 BGM 시작
  if (!gameState.muted) {
    sounds.bgm.src = 'snd/bgm_opening.mp3';
    sounds.bgm.volume = 0.3;
    sounds.bgm.play().catch(() => {});
  }

  showCut(0);
}

function showCut(idx) {
  if (idx >= cuts.length) { endCutscene(); return; }
  const cut = cuts[idx]; lineIdx = 0;
  const fade = document.getElementById('cut-fade');
  fade.classList.add('on');
  setTimeout(() => {
    document.querySelectorAll('.cut-img').forEach(i => i.classList.remove('visible'));
    document.getElementById(cut.img).classList.add('visible');
    document.getElementById('cut-indicator').textContent = `${String(idx + 1).padStart(2, '0')} / 06`;
    fade.classList.remove('on');
    document.getElementById('cut-text-box').classList.add('visible');
    setTimeout(() => typeLine(cut.lines[0]), 400);
  }, 800);
}

// \n을 <br>로 변환하여 줄바꿈 지원
function typeLine(text) {
  const el = document.getElementById('cut-narrator');
  text = tag(text);
  isTyping = true;
  el.innerHTML = '';
  let i = 0;
  const cursor = '<span class="typing-cursor"></span>';

  // 줄바꿈 처리: \n → <br> 변환 후 타이핑
  const chars = text.split('');
  typingTimer = setInterval(() => {
    if (i < chars.length) {
      const current = chars.slice(0, i + 1).join('')
        .replace(/\n/g, '<br>');
      el.innerHTML = current + cursor;
      i++;
    } else {
      el.innerHTML = text.replace(/\n/g, '<br>');
      clearInterval(typingTimer);
      isTyping = false;
    }
  }, 45);
}

function handleCutClick() {
  if (isTyping) {
    clearInterval(typingTimer); isTyping = false;
    document.getElementById('cut-narrator').innerHTML =
      tag(cuts[curCut].lines[lineIdx]).replace(/\n/g, '<br>');
    return;
  }
  const cut = cuts[curCut];
  if (lineIdx < cut.lines.length - 1) { lineIdx++; typeLine(cut.lines[lineIdx]); return; }
  curCut++; showCut(curCut);
}

const cs = document.getElementById('o-cutscene');
cs.addEventListener('click',    handleCutClick);
cs.addEventListener('touchend', e => { e.preventDefault(); handleCutClick(); });
document.addEventListener('keydown', e => {
  if ((e.key === ' ' || e.key === 'Enter') && cs.classList.contains('active')) {
    e.preventDefault(); handleCutClick();
  }
});

function endCutscene() {
  const fade = document.getElementById('cut-fade');
  fade.style.transition = 'opacity 1.5s ease';
  fade.classList.add('on');

  // BGM 페이드 아웃
  const fadeOut = setInterval(() => {
    if (sounds.bgm.volume > 0.02) {
      sounds.bgm.volume = Math.max(0, sounds.bgm.volume - 0.02);
    } else {
      sounds.bgm.pause();
      sounds.bgm.volume = 0.25;
      clearInterval(fadeOut);
    }
  }, 80);

  setTimeout(() => {
    cs.classList.remove('active');
    saveGame();
    startGame();
  }, 1500);
}
