(function () {
  var KEY = 'studyStats';
  var LEVELS = [
    { xp: 0, title: '영어 새싹', icon: '🌱' },
    { xp: 100, title: '초보 학습자', icon: '✏️' },
    { xp: 200, title: '문장 탐험가', icon: '📖' },
    { xp: 400, title: '단어 사냥꾼', icon: '🔍' },
    { xp: 800, title: '지문 정복자', icon: '🚀' },
    { xp: 1800, title: '모의고사 고수', icon: '🏅' },
    { xp: 3600, title: '영어 마스터', icon: '👑' }
  ];
  var XP_RULES = { quiz: [5, 0], vocab: [3, 0], star: [1, 1] };

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
      return {
        xp: Number(s.xp) || 0,
        solved: Number(s.solved) || 0,
        correct: Number(s.correct) || 0,
        vocabSolved: Number(s.vocabSolved) || 0,
        vocabCorrect: Number(s.vocabCorrect) || 0
      };
    } catch (e) {
      return { xp: 0, solved: 0, correct: 0, vocabSolved: 0, vocabCorrect: 0 };
    }
  }
  function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
  function levelOf(xp) {
    var lv = 0;
    for (var i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].xp) lv = i;
    return lv;
  }
  function countStarred() {
    var n = 0;
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf('vocabStar_') === 0) {
        try { n += (JSON.parse(localStorage.getItem(k) || '[]') || []).length; } catch (e) {}
      }
    }
    return n;
  }
  function countWrong() {
    try { return (JSON.parse(localStorage.getItem('vocabWrongWords') || '[]') || []).length; } catch (e) { return 0; }
  }

  function ensureStyles() {
    if (document.getElementById('study-stats-style')) return;
    var st = document.createElement('style');
    st.id = 'study-stats-style';
    st.textContent =
      '#stats-badge { position: fixed; top: 52px; right: 10px; z-index: 9998; display: flex; align-items: center; gap: 6px; background: #fff; border: none; border-radius: 99px; padding: 6px 13px; font-size: 12.5px; font-weight: 700; color: #534AB7; box-shadow: 0 1px 6px rgba(0,0,0,0.18); cursor: pointer; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; -webkit-tap-highlight-color: transparent; white-space: nowrap; }' +
      '#stats-xp-toast { position: fixed; top: 94px; right: 10px; z-index: 9998; background: #7F77DD; color: #fff; font-size: 12.5px; font-weight: 700; padding: 6px 13px; border-radius: 99px; opacity: 0; transform: translateY(-4px); transition: opacity 0.25s ease, transform 0.25s ease; pointer-events: none; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }' +
      '#stats-xp-toast.show { opacity: 0.96; transform: translateY(0); }' +
      '#stats-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 10000; display: none; }' +
      '#stats-overlay.show { display: block; }' +
      '#stats-panel { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(92vw, 380px); background: #fff; border-radius: 20px; padding: 24px 22px; z-index: 10001; display: none; box-shadow: 0 8px 40px rgba(0,0,0,0.25); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1a1a1a; }' +
      '#stats-panel.show { display: block; }' +
      '#stats-panel .sp-close { position: absolute; top: 14px; right: 16px; font-size: 19px; color: #aaa; background: none; border: none; cursor: pointer; }' +
      '#stats-panel .sp-level { text-align: center; margin-bottom: 4px; font-size: 38px; line-height: 1; }' +
      '#stats-panel .sp-title { text-align: center; font-size: 17px; font-weight: 800; margin-bottom: 2px; }' +
      '#stats-panel .sp-lv { text-align: center; font-size: 12px; color: #888; margin-bottom: 14px; }' +
      '#stats-panel .sp-bar { height: 10px; background: #EEEDFE; border-radius: 99px; overflow: hidden; margin-bottom: 6px; }' +
      '#stats-panel .sp-fill { height: 100%; background: linear-gradient(90deg, #7F77DD, #534AB7); border-radius: 99px; transition: width 0.4s ease; }' +
      '#stats-panel .sp-xp { font-size: 11.5px; color: #888; text-align: center; margin-bottom: 16px; }' +
      '#stats-panel .sp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }' +
      '#stats-panel .sp-cell { background: #F8F7FF; border-radius: 12px; padding: 12px 10px; text-align: center; }' +
      '#stats-panel .sp-num { font-size: 19px; font-weight: 800; color: #534AB7; }' +
      '#stats-panel .sp-label { font-size: 11px; color: #888; margin-top: 3px; }';
    document.head.appendChild(st);
  }

  function badgeText() {
    var s = load();
    var lv = levelOf(s.xp);
    return LEVELS[lv].icon + ' Lv.' + (lv + 1) + ' · ' + s.xp + ' XP';
  }

  function updateBadge() {
    var b = document.getElementById('stats-badge');
    if (b) b.textContent = badgeText();
  }

  function pct(c, t) { return t > 0 ? Math.round(c / t * 100) + '%' : '-'; }

  function openPanel() {
    ensureStyles();
    var s = load();
    var lv = levelOf(s.xp);
    var cur = LEVELS[lv];
    var next = LEVELS[lv + 1] || null;
    var barPct = next ? Math.min(100, Math.round((s.xp - cur.xp) / (next.xp - cur.xp) * 100)) : 100;
    var xpLine = next ? (s.xp + ' XP · 다음 레벨까지 ' + (next.xp - s.xp) + ' XP') : (s.xp + ' XP · 최고 레벨 달성!');

    var ov = document.getElementById('stats-overlay');
    var pn = document.getElementById('stats-panel');
    if (!ov) {
      ov = document.createElement('div'); ov.id = 'stats-overlay';
      ov.onclick = closePanel;
      document.body.appendChild(ov);
    }
    if (!pn) {
      pn = document.createElement('div'); pn.id = 'stats-panel';
      document.body.appendChild(pn);
    }
    pn.innerHTML =
      '<button class="sp-close" id="sp-close-btn">✕</button>' +
      '<div class="sp-level">' + cur.icon + '</div>' +
      '<div class="sp-title">' + cur.title + '</div>' +
      '<div class="sp-lv">Lv.' + (lv + 1) + ' / ' + LEVELS.length + '</div>' +
      '<div class="sp-bar"><div class="sp-fill" style="width:' + barPct + '%"></div></div>' +
      '<div class="sp-xp">' + xpLine + '</div>' +
      '<div class="sp-grid">' +
        '<div class="sp-cell"><div class="sp-num">' + s.solved + '</div><div class="sp-label">푼 문제 수</div></div>' +
        '<div class="sp-cell"><div class="sp-num">' + pct(s.correct, s.solved) + '</div><div class="sp-label">문제 정답률</div></div>' +
        '<div class="sp-cell"><div class="sp-num">' + s.vocabSolved + '</div><div class="sp-label">단어 퀴즈 수</div></div>' +
        '<div class="sp-cell"><div class="sp-num">' + pct(s.vocabCorrect, s.vocabSolved) + '</div><div class="sp-label">단어 정답률</div></div>' +
        '<div class="sp-cell"><div class="sp-num">' + countStarred() + '</div><div class="sp-label">저장한 단어</div></div>' +
        '<div class="sp-cell"><div class="sp-num">' + countWrong() + '</div><div class="sp-label">복습할 오답 단어</div></div>' +
      '</div>';
    document.getElementById('sp-close-btn').onclick = closePanel;
    ov.classList.add('show');
    pn.classList.add('show');
  }

  function closePanel() {
    var ov = document.getElementById('stats-overlay');
    var pn = document.getElementById('stats-panel');
    if (ov) ov.classList.remove('show');
    if (pn) pn.classList.remove('show');
  }

  var toastTimer = null;
  function showXpToast(msg) {
    ensureStyles();
    var t = document.getElementById('stats-xp-toast');
    if (!t) {
      t = document.createElement('div'); t.id = 'stats-xp-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(function () { t.classList.add('show'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1700);
  }

  function initBadge() {
    ensureStyles();
    if (document.getElementById('stats-badge')) { updateBadge(); return; }
    var b = document.createElement('button');
    b.id = 'stats-badge';
    b.textContent = badgeText();
    b.onclick = openPanel;
    document.body.appendChild(b);
  }

  var syncTimer = null;
  function scheduleSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () {
      if (window.starSync && window.starSync.notifyStarChange) window.starSync.notifyStarChange(KEY);
    }, 1500);
  }

  window.studyStats = {
    record: function (type, correct) {
      var rule = XP_RULES[type];
      if (!rule) return;
      var s = load();
      var gain = correct ? rule[0] : rule[1];
      var beforeLv = levelOf(s.xp);
      s.xp += gain;
      if (type === 'quiz') { s.solved++; if (correct) s.correct++; }
      if (type === 'vocab') { s.vocabSolved++; if (correct) s.vocabCorrect++; }
      save(s);
      updateBadge();
      var afterLv = levelOf(s.xp);
      if (afterLv > beforeLv) {
        showXpToast('🎉 레벨 업! ' + LEVELS[afterLv].icon + ' ' + LEVELS[afterLv].title);
      } else {
        showXpToast('+' + gain + ' XP');
      }
      scheduleSync();
    },
    refresh: updateBadge
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBadge);
  } else {
    initBadge();
  }
})();
