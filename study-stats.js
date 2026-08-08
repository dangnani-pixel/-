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
  function getStarredWords() {
    var list = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf('vocabStar_') === 0) {
        try {
          (JSON.parse(localStorage.getItem(k) || '[]') || []).forEach(function (w) {
            var copy = {}; for (var p in w) copy[p] = w[p];
            copy._srcKey = k;
            list.push(copy);
          });
        } catch (e) {}
      }
    }
    return list;
  }
  function countStarred() { return getStarredWords().length; }
  var WRONG_KEY = 'vocabWrongWords';
  function getWrongWords() {
    try { return JSON.parse(localStorage.getItem(WRONG_KEY) || '[]') || []; } catch (e) { return []; }
  }
  function countWrong() { return getWrongWords().length; }

  function deleteStarredWordAt(idx) {
    var words = getStarredWords();
    var target = words[idx];
    if (!target) return;
    try {
      var arr = JSON.parse(localStorage.getItem(target._srcKey) || '[]') || [];
      var next = arr.filter(function (w) { return w.word.toLowerCase() !== target.word.toLowerCase(); });
      localStorage.setItem(target._srcKey, JSON.stringify(next));
      if (window.starSync) window.starSync.notifyStarChange(target._srcKey);
      if (window.studyStats) window.studyStats.unrecord('star');
    } catch (e) {}
    openStarredList();
  }

  function deleteWrongWordAt(idx) {
    var words = getWrongWords();
    var target = words[idx];
    if (!target) return;
    var next = words.filter(function (w) { return w.word.toLowerCase() !== target.word.toLowerCase(); });
    localStorage.setItem(WRONG_KEY, JSON.stringify(next));
    if (window.starSync) window.starSync.notifyStarChange(WRONG_KEY);
    openWrongList();
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
      '#stats-panel .sp-label { font-size: 11px; color: #888; margin-top: 3px; }' +
      '#stats-panel .sp-cell.clickable { cursor: pointer; -webkit-tap-highlight-color: transparent; transition: background 0.1s ease; }' +
      '#stats-panel .sp-cell.clickable:active { background: #EEEDFE; }' +
      '#stats-panel .sp-back-btn { position: absolute; top: 14px; left: 16px; font-size: 12.5px; color: #534AB7; background: none; border: none; cursor: pointer; font-weight: 600; -webkit-tap-highlight-color: transparent; }' +
      '#stats-panel .sp-wrong-title { font-size: 15px; font-weight: 800; text-align: center; margin: 18px 0 14px; }' +
      '#stats-panel .sp-export-btn { display: block; margin: -6px auto 10px; background: #F8F7FF; color: #534AB7; border: none; border-radius: 99px; padding: 7px 16px; font-size: 12.5px; font-weight: 700; cursor: pointer; -webkit-tap-highlight-color: transparent; }' +
      '#stats-panel .sp-export-btn:active { background: #EEEDFE; }' +
      '#stats-panel .sp-playall-btn { display: block; margin: 0 auto 14px; background: #534AB7; color: #fff; border: none; border-radius: 99px; padding: 9px 20px; font-size: 13px; font-weight: 700; cursor: pointer; -webkit-tap-highlight-color: transparent; font-family: inherit; }' +
      '#stats-panel .sp-playall-btn:active { opacity: 0.85; }' +
      '#stats-panel .sp-playall-btn.active { background: #e0524d; }' +
      '#stats-panel .sp-wrong-list { max-height: 340px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }' +
      '#stats-panel .sp-wrong-item { background: #F8F7FF; border-radius: 12px; padding: 10px 14px; text-align: left; display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; transition: background 0.2s ease, box-shadow 0.2s ease; }' +
      '#stats-panel .sp-wrong-item.sp-playing { background: #EEEDFE; box-shadow: 0 0 0 2px #7F77DD inset; }' +
      '#stats-panel .sp-wrong-word { font-size: 14.5px; font-weight: 700; color: #1a1a1a; }' +
      '#stats-panel .sp-wrong-pron { font-size: 11.5px; color: #aaa; margin-left: 6px; font-weight: 400; }' +
      '#stats-panel .sp-wrong-meaning { font-size: 12.5px; color: #534AB7; margin-top: 2px; }' +
      '#stats-panel .sp-item-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 2px; }' +
      '#stats-panel .sp-item-play { background: none; border: none; color: #7F77DD; font-size: 16px; cursor: pointer; padding: 2px 5px; line-height: 1; -webkit-tap-highlight-color: transparent; }' +
      '#stats-panel .sp-item-play.playing { animation: sp-pulse 0.9s ease-in-out infinite; }' +
      '@keyframes sp-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }' +
      '#stats-panel .sp-item-del { flex: 0 0 auto; background: none; border: none; color: #ccc; font-size: 15px; cursor: pointer; padding: 2px 4px; line-height: 1; -webkit-tap-highlight-color: transparent; }' +
      '#stats-panel .sp-item-del:active { color: #e0524d; }' +
      '#stats-panel .sp-empty { text-align: center; font-size: 13px; color: #aaa; padding: 30px 10px; }';
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

  function ensureShell() {
    ensureStyles();
    var ov = document.getElementById('stats-overlay');
    var pn = document.getElementById('stats-panel');
    if (!ov) {
      ov = document.createElement('div'); ov.id = 'stats-overlay';
      ov.onclick = function () { stopSpeak(); closePanel(); };
      document.body.appendChild(ov);
    }
    if (!pn) {
      pn = document.createElement('div'); pn.id = 'stats-panel';
      document.body.appendChild(pn);
    }
    return pn;
  }

  function openPanel() {
    var pn = ensureShell();
    var s = load();
    var lv = levelOf(s.xp);
    var cur = LEVELS[lv];
    var next = LEVELS[lv + 1] || null;
    var barPct = next ? Math.min(100, Math.round((s.xp - cur.xp) / (next.xp - cur.xp) * 100)) : 100;
    var xpLine = next ? (s.xp + ' XP · 다음 레벨까지 ' + (next.xp - s.xp) + ' XP') : (s.xp + ' XP · 최고 레벨 달성!');

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
        '<div class="sp-cell clickable" id="sp-starred-cell"><div class="sp-num">' + countStarred() + '</div><div class="sp-label">저장한 단어 ›</div></div>' +
        '<div class="sp-cell clickable" id="sp-wrong-cell"><div class="sp-num">' + countWrong() + '</div><div class="sp-label">복습할 오답 단어 ›</div></div>' +
      '</div>';
    document.getElementById('sp-close-btn').onclick = closePanel;
    document.getElementById('sp-starred-cell').onclick = openStarredList;
    document.getElementById('sp-wrong-cell').onclick = openWrongList;
    document.getElementById('stats-overlay').classList.add('show');
    pn.classList.add('show');
  }

  var speakTimer = null;
  var playAllActive = false;
  function stopSpeak() {
    if (speakTimer) { clearTimeout(speakTimer); speakTimer = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    playAllActive = false;
    var playing = document.querySelectorAll('#stats-panel .sp-item-play.playing');
    for (var i = 0; i < playing.length; i++) playing[i].classList.remove('playing');
    var playingItems = document.querySelectorAll('#stats-panel .sp-wrong-item.sp-playing');
    for (var j = 0; j < playingItems.length; j++) playingItems[j].classList.remove('sp-playing');
    var allBtn = document.getElementById('sp-playall-btn');
    if (allBtn) { allBtn.textContent = '▶ 전체 듣기'; allBtn.classList.remove('active'); }
  }
  // Speaks one word (English, then 3s later its Korean meaning), then calls onDone.
  function speakOne(w, onDone) {
    if (!('speechSynthesis' in window)) { if (onDone) onDone(); return; }
    var enUtter = new SpeechSynthesisUtterance(w.word);
    enUtter.lang = 'en-US';
    window.speechSynthesis.speak(enUtter);
    speakTimer = setTimeout(function () {
      speakTimer = null;
      if (w.meaning) {
        var koUtter = new SpeechSynthesisUtterance(w.meaning);
        koUtter.lang = 'ko-KR';
        koUtter.onend = function () { if (onDone) onDone(); };
        window.speechSynthesis.speak(koUtter);
      } else if (onDone) {
        onDone();
      }
    }, 3000);
  }
  function speakWord(w, btn) {
    if (!('speechSynthesis' in window)) { alert('이 브라우저는 단어 읽어주기 기능을 지원하지 않아요.'); return; }
    stopSpeak();
    if (btn) btn.classList.add('playing');
    speakOne(w, function () { if (btn) btn.classList.remove('playing'); });
  }
  // Plays through the whole list in order so you can listen and memorize hands-free.
  // Clicking the button again while playing stops it.
  function playAllWords(words, btn, items) {
    if (!('speechSynthesis' in window)) { alert('이 브라우저는 단어 읽어주기 기능을 지원하지 않아요.'); return; }
    if (playAllActive) { stopSpeak(); return; }
    if (!words.length) return;
    stopSpeak();
    playAllActive = true;
    btn.textContent = '⏸ 정지';
    btn.classList.add('active');
    var idx = 0;
    function next() {
      if (!playAllActive || idx >= words.length) { stopSpeak(); return; }
      var prevItem = items[idx - 1];
      if (prevItem) prevItem.classList.remove('sp-playing');
      var item = items[idx];
      if (item) {
        item.classList.add('sp-playing');
        if (item.scrollIntoView) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      speakOne(words[idx], function () {
        idx++;
        if (playAllActive) speakTimer = setTimeout(next, 500);
      });
    }
    next();
  }

  function wordListHtml(words) {
    return words.map(function (w, i) {
      return '<div class="sp-wrong-item"><div><div class="sp-wrong-word">' + w.word +
        (w.pron ? '<span class="sp-wrong-pron">' + w.pron + '</span>' : '') + '</div>' +
        (w.meaning ? '<div class="sp-wrong-meaning">' + w.meaning + '</div>' : '') + '</div>' +
        '<div class="sp-item-actions">' +
        '<button class="sp-item-play" data-idx="' + i + '" title="단어 읽어주기">🔊</button>' +
        '<button class="sp-item-del" data-idx="' + i + '" title="삭제">✕</button>' +
        '</div></div>';
    }).join('');
  }

  function wordsToText(title, words) {
    var plainTitle = title.replace(/^\S+\s*/, '');
    var dateStr = new Date().toISOString().slice(0, 10);
    var lines = ['[' + plainTitle + '] (총 ' + words.length + '개, ' + dateStr + ' 내보냄)', ''];
    words.forEach(function (w, i) {
      lines.push((i + 1) + '. ' + w.word + (w.pron ? ' ' + w.pron : '') + ' - ' + (w.meaning || '뜻 정보 없음'));
      if (w.en) lines.push('   예문: ' + w.en);
      if (w.ko) lines.push('   해석: ' + w.ko);
      lines.push('');
    });
    return lines.join('\n');
  }

  function exportWords(title, words, filename) {
    if (!words.length) return;
    var text = wordsToText(title, words);
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename + '_' + new Date().toISOString().slice(0, 10) + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function openWordList(title, words, emptyMsg, onDelete, exportFilename) {
    stopSpeak();
    var pn = ensureShell();
    var listHtml = words.length ? wordListHtml(words) : ('<div class="sp-empty">' + emptyMsg + '</div>');
    var exportBtnHtml = (exportFilename && words.length) ? '<button class="sp-export-btn" id="sp-export-btn">⬇ 텍스트 파일로 내보내기</button>' : '';
    var playAllBtnHtml = words.length
      ? '<button class="sp-playall-btn" id="sp-playall-btn">▶ 전체 듣기</button>' : '';
    pn.innerHTML =
      '<button class="sp-close" id="sp-close-btn">✕</button>' +
      '<button class="sp-back-btn" id="sp-back-btn">← 뒤로</button>' +
      '<div class="sp-wrong-title">' + title + ' (' + words.length + '개)</div>' +
      exportBtnHtml +
      playAllBtnHtml +
      '<div class="sp-wrong-list">' + listHtml + '</div>';
    document.getElementById('sp-close-btn').onclick = function () { stopSpeak(); closePanel(); };
    document.getElementById('sp-back-btn').onclick = function () { stopSpeak(); openPanel(); };
    var exportBtn = document.getElementById('sp-export-btn');
    if (exportBtn) exportBtn.onclick = function () { exportWords(title, words, exportFilename); };
    var delBtns = pn.querySelectorAll('.sp-item-del');
    for (var i = 0; i < delBtns.length; i++) {
      delBtns[i].onclick = (function (idx) {
        return function (e) { e.stopPropagation(); stopSpeak(); onDelete(idx); };
      })(Number(delBtns[i].getAttribute('data-idx')));
    }
    var playBtns = pn.querySelectorAll('.sp-item-play');
    for (var i = 0; i < playBtns.length; i++) {
      playBtns[i].onclick = (function (idx, btn) {
        return function (e) { e.stopPropagation(); speakWord(words[idx], btn); };
      })(Number(playBtns[i].getAttribute('data-idx')), playBtns[i]);
    }
    var playAllBtn = document.getElementById('sp-playall-btn');
    if (playAllBtn) {
      var items = pn.querySelectorAll('.sp-wrong-item');
      playAllBtn.onclick = function () { playAllWords(words, playAllBtn, items); };
    }
  }

  function openWrongList() {
    openWordList('📝 복습할 오답 단어', getWrongWords(), '아직 복습할 오답 단어가 없어요.<br>단어장 퀴즈에서 틀린 단어가 여기 모여요.', deleteWrongWordAt, '복습할_오답_단어');
  }

  function openStarredList() {
    openWordList('⭐ 저장한 단어', getStarredWords(), '아직 저장한 단어가 없어요.<br>지문에서 단어를 클릭하고 별표를 눌러보세요.', deleteStarredWordAt, '저장한_단어');
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
    unrecord: function (type) {
      var rule = XP_RULES[type];
      if (!rule) return;
      var s = load();
      var loss = rule[0];
      s.xp = Math.max(0, s.xp - loss);
      save(s);
      updateBadge();
      showXpToast('-' + loss + ' XP');
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
