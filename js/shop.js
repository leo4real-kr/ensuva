// ════════════════════════════════
// shop.js — 상점 (최순이 할머니)
// ════════════════════════════════

// ── 미끼 데이터 ──
const baits = [
  {
    id: 'worm', name: '지렁이', emoji: '🪱', price: 200,
    desc: '붕어, 피라미에 잘 먹힌다',
    bonus: { common: 1.3 },
  },
  {
    id: 'dough', name: '떡밥', emoji: '🟤', price: 500,
    desc: '붕어가 특히 좋아한다',
    bonus: { 붕어: 2.0 },
  },
  {
    id: 'corn', name: '옥수수', emoji: '🌽', price: 400,
    desc: '가물치를 노릴 때 쓴다',
    bonus: { 가물치: 2.5 },
  },
  {
    id: 'lure', name: '루어', emoji: '🎣', price: 800,
    desc: '쏘가리, 메기에 효과적',
    bonus: { 쏘가리: 2.0, 메기: 2.0 },
  },
];

// ── 업그레이드 데이터 ──
const upgrades = [
  {
    id: 'line', name: '낚싯줄 강화', emoji: '🧵', price: 2000,
    desc: '미스 허용 +1',
    maxLevel: 2,
    apply: () => { gameState.lineLevel = (gameState.lineLevel || 0) + 1; },
  },
  {
    id: 'reel', name: '릴 업그레이드', emoji: '⚙️', price: 3000,
    desc: '게이지 감소 속도 ↓',
    maxLevel: 2,
    apply: () => { gameState.reelLevel = (gameState.reelLevel || 0) + 1; },
  },
];

// ── 인벤토리 ──
// gameState에 추가될 필드:
// bait: { id, name, emoji, count } | null
// fish: [{ name, emoji, weight, price, count }]
// lineLevel: 0~2
// reelLevel: 0~2

function initShopState() {
  if (!gameState.bait) gameState.bait = null;
  if (!gameState.fish) gameState.fish = [];
  if (!gameState.lineLevel) gameState.lineLevel = 0;
  if (!gameState.reelLevel) gameState.reelLevel = 0;
}

// ── 상점 표시 ──
let shopTab = 'buy';

function showShop() {
  initShopState();
  document.getElementById('vpanel-shop').classList.add('active');
  renderShop();
}

function renderShop() {
  const el = document.getElementById('vpanel-shop');
  el.innerHTML = `
    <div class="shop-container">
      <div class="shop-header">
        <div class="shop-npc">🧓 최순이 할머니</div>
        <div class="shop-greeting">${getShopGreeting()}</div>
        <div class="shop-money">₩${gameState.money.toLocaleString()}</div>
      </div>

      <div class="shop-tabs">
        <button class="shop-tab-btn ${shopTab==='buy'?'active':''}"
          onclick="setShopTab('buy')">구매</button>
        <button class="shop-tab-btn ${shopTab==='sell'?'active':''}"
          onclick="setShopTab('sell')">판매</button>
        <button class="shop-tab-btn ${shopTab==='upgrade'?'active':''}"
          onclick="setShopTab('upgrade')">업그레이드</button>
      </div>

      <div class="shop-content" id="shop-content">
        ${shopTab === 'buy'     ? renderBuyTab()     : ''}
        ${shopTab === 'sell'    ? renderSellTab()    : ''}
        ${shopTab === 'upgrade' ? renderUpgradeTab() : ''}
      </div>
    </div>
  `;
}

function setShopTab(tab) {
  shopTab = tab;
  renderShop();
}

function getShopGreeting() {
  const h = gameState.hour;
  if (h < 10) return '"일찍 왔네. 뭐 필요해?"';
  if (h < 14) return '"어서 와. 오늘은 뭐 잡을 거야?"';
  if (h < 18) return '"왔어? 오늘 잡은 거 있어?"';
  return '"이 시간에 왔네. 뭐 필요해?"';
}

// ── 구매 탭 ──
function renderBuyTab() {
  const currentBait = gameState.bait;
  return `
    <div class="shop-section-label">미끼</div>
    <div class="shop-bait-note">미끼 없이도 낚시 가능 · 1회 사용 후 소모</div>
    ${baits.map(b => `
      <div class="shop-item ${currentBait?.id === b.id ? 'equipped' : ''}">
        <span class="shop-item-emoji">${b.emoji}</span>
        <div class="shop-item-info">
          <div class="shop-item-name">${b.name}
            ${currentBait?.id === b.id
              ? `<span class="equipped-badge">×${currentBait.count}</span>` : ''}
          </div>
          <div class="shop-item-desc">${b.desc}</div>
          <div class="shop-item-effect">${getBaitEffect(b)}</div>
        </div>
        <div class="shop-item-right">
          <div class="shop-item-price">₩${b.price.toLocaleString()}</div>
          <button class="shop-buy-btn" onclick="buyBait('${b.id}')">
            ${currentBait?.id === b.id ? '+추가' : '구매'}
          </button>
        </div>
      </div>
    `).join('')}
  `;
}

function getBaitEffect(b) {
  const parts = [];
  if (b.bonus.common)  parts.push(`일반 어종 확률 ×${b.bonus.common}`);
  if (b.bonus['붕어'])  parts.push(`붕어 확률 ×${b.bonus['붕어']}`);
  if (b.bonus['가물치']) parts.push(`가물치 확률 ×${b.bonus['가물치']}`);
  if (b.bonus['쏘가리']) parts.push(`쏘가리 확률 ×${b.bonus['쏘가리']}`);
  if (b.bonus['메기'])  parts.push(`메기 확률 ×${b.bonus['메기']}`);
  return parts.join(' · ');
}

function buyBait(id) {
  const bait = baits.find(b => b.id === id);
  if (!bait) return;
  if (gameState.money < bait.price) {
    showBuyFeedback('돈이 부족하다');
    return;
  }
  gameState.money -= bait.price;
  if (gameState.bait?.id === id) {
    gameState.bait.count++;
  } else {
    gameState.bait = { ...bait, count: 1 };
  }
  updateHUD();
  saveGame();
  showBuyFeedback(`${bait.emoji} ${bait.name} 구매!`);
  renderShop();
}

// ── 판매 탭 ──
function renderSellTab() {
  const fish = gameState.fish || [];
  if (fish.length === 0) {
    return `<div class="shop-empty">"잡은 게 없네."<br>물고기를 보관하면 여기서 팔 수 있다.</div>`;
  }

  const totalPrice = fish.reduce((sum, f) => sum + calcFishPrice(f) * f.count, 0);

  return `
    <div class="shop-section-label">보관된 물고기</div>
    ${fish.map((f, i) => `
      <div class="shop-item">
        <span class="shop-item-emoji">${f.emoji}</span>
        <div class="shop-item-info">
          <div class="shop-item-name">${f.name} ×${f.count}</div>
          <div class="shop-item-desc">최대 ${f.maxWeight}g</div>
        </div>
        <div class="shop-item-right">
          <div class="shop-item-price">₩${(calcFishPrice(f) * f.count).toLocaleString()}</div>
          <button class="shop-buy-btn" onclick="sellFishItem(${i})">판매</button>
        </div>
      </div>
    `).join('')}
    <button class="shop-sell-all-btn" onclick="sellAllFish()">
      전체 판매 ₩${totalPrice.toLocaleString()}
    </button>
  `;
}

function calcFishPrice(f) {
  const fish = fishDB.find(d => d.name === f.name);
  return Math.floor((fish?.price || 500) * (f.maxWeight / 300));
}

function sellFishItem(idx) {
  const f = gameState.fish[idx];
  if (!f) return;
  const price = calcFishPrice(f) * f.count;
  gameState.money += price;
  gameState.fish.splice(idx, 1);
  updateHUD();
  saveGame();
  showBuyFeedback(`₩${price.toLocaleString()} 받았다`);
  renderShop();
}

function sellAllFish() {
  const total = gameState.fish.reduce((sum, f) => sum + calcFishPrice(f) * f.count, 0);
  gameState.money += total;
  gameState.fish = [];
  updateHUD();
  saveGame();
  showBuyFeedback(`₩${total.toLocaleString()} 받았다`);
  renderShop();
}

// ── 업그레이드 탭 ──
function renderUpgradeTab() {
  return `
    <div class="shop-section-label">낚시 장비</div>
    ${upgrades.map(u => {
      const level = gameState[`${u.id}Level`] || 0;
      const maxed = level >= u.maxLevel;
      const price = u.price * (level + 1);
      const nextEffect = u.id === 'line'
        ? `미스 허용 ${3 + level}회`
        : `게이지 감소 ${100 - (level+1)*15}%`;
      return `
        <div class="shop-item">
          <span class="shop-item-emoji">${u.emoji}</span>
          <div class="shop-item-info">
            <div class="shop-item-name">${u.name}
              <span class="level-badge">Lv.${level}/${u.maxLevel}</span>
            </div>
            <div class="shop-item-desc">${u.desc}</div>
            <div class="shop-item-effect">${maxed ? '최대 강화 완료' : `→ ${nextEffect}`}</div>
          </div>
          <div class="shop-item-right">
            <div class="shop-item-price">${maxed ? 'MAX' : `₩${price.toLocaleString()}`}</div>
            <button class="shop-buy-btn"
              onclick="buyUpgrade('${u.id}')"
              ${maxed ? 'disabled' : ''}>
              ${maxed ? '완료' : '강화'}
            </button>
          </div>
        </div>
      `;
    }).join('')}
    <div class="shop-upgrade-info">
      <div class="upgrade-stat">🧵 낚싯줄 — 미스 허용 ${2 + (gameState.lineLevel||0)}회</div>
      <div class="upgrade-stat">⚙️ 릴 — 게이지 감소 ${100 - (gameState.reelLevel||0)*15}%</div>
    </div>
  `;
}

function buyUpgrade(id) {
  const upg = upgrades.find(u => u.id === id);
  if (!upg) return;
  const level = gameState[`${id}Level`] || 0;
  if (level >= upg.maxLevel) return;
  const price = upg.price * (level + 1);
  if (gameState.money < price) {
    showBuyFeedback('돈이 부족하다');
    return;
  }
  gameState.money -= price;
  upg.apply();
  updateHUD();
  saveGame();
  showBuyFeedback(`${upg.emoji} ${upg.name} 강화!`);
  renderShop();
}

// ── 구매 피드백 ──
function showBuyFeedback(msg) {
  showHpNotify(msg);
}

// ── 낚시 결과에서 보관 연결 ──
function keepFishToInventory(fish, weight) {
  initShopState();
  const existing = gameState.fish.find(f => f.name === fish.name);
  if (existing) {
    existing.count++;
    existing.maxWeight = Math.max(existing.maxWeight, weight);
  } else {
    gameState.fish.push({
      name:      fish.name,
      emoji:     fish.emoji,
      weight:    weight,
      maxWeight: weight,
      price:     fish.price,
      count:     1,
    });
  }
  saveGame();
}

// ── 미끼 효과 적용 (fishing.js에서 호출) ──
function getWeightedFishDB() {
  const bait = gameState.bait;
  if (!bait) return null; // 미끼 없으면 기본 확률

  const weights = fishDB.map(f => {
    let w = 1.0;
    if (bait.bonus.common && (f.rarity === 'common')) w *= bait.bonus.common;
    if (bait.bonus[f.name]) w *= bait.bonus[f.name];
    return w;
  });
  return weights;
}

// 낚시 1회 후 미끼 1개 소모
function consumeBait() {
  if (!gameState.bait) return;
  gameState.bait.count--;
  if (gameState.bait.count <= 0) {
    gameState.bait = null;
    showBuyFeedback('미끼가 떨어졌다');
  }
  saveGame();
}

// ════════════════════════════════
// 친밀도 / 선악 시스템 (TODO)
// ════════════════════════════════
//
// gameState.affinity  : 0~100 (최순이 할머니 친밀도)
// gameState.karma     : -100~100 (선악 판정)
//
// 친밀도 획득:
//   - 물고기 방생 ★ → +2
//   - 할머니 대화 → +1
//   - 상점 구매 → +1
//   - 매일 상점 방문 → +1
//
// 카르마 획득:
//   - 방생 → +2
//   - 희귀 어종 방생 → +5
//   - 판매 → 0 (중립)
//
// 효과:
//   - 친밀도 30+  : 구매 5% 할인
//   - 친밀도 60+  : 구매 10% 할인, 판매 10% 할증
//   - 친밀도 100  : 구매 15% 할인, 판매 15% 할증
//   - 카르마 +50+ : 판매 추가 5% 할증
//   - 카르마 -50- : 구매 5% 할증 (불이익)
