import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAIhZbOGZwHuz3WWj8HoKOjLNNoQ0gtrgk",
  authDomain: "dangnani-english.firebaseapp.com",
  projectId: "dangnani-english",
  storageBucket: "dangnani-english.firebasestorage.app",
  messagingSenderId: "1087141171386",
  appId: "1:1087141171386:web:fd153108633821300db283"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const STAR_PREFIX = 'vocabStar_';
const RELOAD_FLAG = 'fbSyncJustReloaded';

function allStarKeys() {
  var keys = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.indexOf(STAR_PREFIX) === 0) keys.push(k);
  }
  return keys;
}
function readLocal(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; } }
function writeLocal(key, arr) { localStorage.setItem(key, JSON.stringify(arr)); }

function mergeArrays(a, b) {
  var map = {};
  var order = [];
  a.concat(b).forEach(function (w) {
    if (!w || !w.word) return;
    var k = w.word.toLowerCase();
    if (!(k in map)) order.push(k);
    map[k] = w;
  });
  return order.map(function (k) { return map[k]; });
}

var STATS_KEY = 'studyStats';
var STATS_FIELDS = ['xp', 'solved', 'correct', 'vocabSolved', 'vocabCorrect'];

function readStats() {
  try { return JSON.parse(localStorage.getItem(STATS_KEY) || '{}') || {}; } catch (e) { return {}; }
}

function pullAndMerge(uid) {
  return getDoc(doc(db, 'users', uid)).then(function (snap) {
    var cloud = snap.exists() ? snap.data() : {};
    var changed = false;
    Object.keys(cloud).forEach(function (key) {
      if (key.indexOf(STAR_PREFIX) !== 0) return;
      var local = readLocal(key);
      var merged = mergeArrays(local, cloud[key] || []);
      if (merged.length !== local.length) changed = true;
      writeLocal(key, merged);
    });
    if (cloud[STATS_KEY]) {
      var localStats = readStats();
      var mergedStats = {};
      STATS_FIELDS.forEach(function (f) {
        mergedStats[f] = Math.max(Number(localStats[f]) || 0, Number(cloud[STATS_KEY][f]) || 0);
      });
      localStorage.setItem(STATS_KEY, JSON.stringify(mergedStats));
      if (window.studyStats && window.studyStats.refresh) window.studyStats.refresh();
    }
    return changed;
  });
}

function pushAll(uid) {
  var data = {};
  allStarKeys().forEach(function (key) { data[key] = readLocal(key); });
  var stats = readStats();
  if (Object.keys(stats).length) data[STATS_KEY] = stats;
  if (Object.keys(data).length === 0) return Promise.resolve();
  return setDoc(doc(db, 'users', uid), data, { merge: true });
}

function pushKey(uid, key) {
  var data = {};
  data[key] = readLocal(key);
  return setDoc(doc(db, 'users', uid), data, { merge: true });
}

var currentUser = null;

function ensureStyles() {
  if (document.getElementById('fb-sync-style')) return;
  var style = document.createElement('style');
  style.id = 'fb-sync-style';
  style.textContent =
    '#fb-auth-widget { position: fixed; top: 10px; right: 10px; z-index: 9999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }' +
    '.fb-btn { display: flex; align-items: center; gap: 6px; background: #fff; border: none; border-radius: 99px; padding: 7px 14px; font-size: 12.5px; font-weight: 600; color: #534AB7; box-shadow: 0 1px 6px rgba(0,0,0,0.18); cursor: pointer; -webkit-tap-highlight-color: transparent; white-space: nowrap; }' +
    '.fb-btn.signed-in { padding: 5px 14px 5px 5px; }' +
    '.fb-avatar { width: 22px; height: 22px; border-radius: 50%; }' +
    '.fb-toast { position: fixed; top: 54px; right: 10px; z-index: 9999; max-width: 240px; background: #1a1a1a; color: #fff; font-size: 12px; line-height: 1.5; padding: 9px 14px; border-radius: 10px; opacity: 0; transition: opacity 0.3s ease; pointer-events: none; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }' +
    '.fb-toast.show { opacity: 0.94; }';
  document.head.appendChild(style);
}

function showToast(msg) {
  ensureStyles();
  var t = document.getElementById('fb-sync-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'fb-sync-toast';
    t.className = 'fb-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  requestAnimationFrame(function () { t.classList.add('show'); });
  clearTimeout(t._hideTimer);
  t._hideTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
}

function renderWidget() {
  ensureStyles();
  var el = document.getElementById('fb-auth-widget');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fb-auth-widget';
    document.body.appendChild(el);
  }
  if (currentUser) {
    var name = currentUser.displayName ? currentUser.displayName.split(' ')[0] : '내 계정';
    el.innerHTML =
      '<button class="fb-btn signed-in" id="fb-logout-btn">' +
        '<img class="fb-avatar" src="' + (currentUser.photoURL || '') + '" alt="" onerror="this.style.display=\'none\'">' +
        '<span>' + name + ' · 로그아웃</span>' +
      '</button>';
    document.getElementById('fb-logout-btn').onclick = function () { signOut(auth); };
  } else {
    el.innerHTML = '<button class="fb-btn" id="fb-login-btn">로그인</button>';
    document.getElementById('fb-login-btn').onclick = function () {
      signInWithPopup(auth, provider).catch(function (e) {
        alert('로그인에 실패했어요: ' + e.message);
      });
    };
  }
}

onAuthStateChanged(auth, function (user) {
  currentUser = user;
  renderWidget();
  if (user) {
    pullAndMerge(user.uid).then(function (changed) {
      pushAll(user.uid).catch(function (e) { console.error('push failed', e); });
      if (changed && !sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, '1');
        showToast('다른 기기에서 저장한 단어를 불러왔어요. 새로고침할게요...');
        setTimeout(function () { location.reload(); }, 900);
      }
    }).catch(function (e) { console.error('Firebase sync error', e); });
  } else {
    sessionStorage.removeItem(RELOAD_FLAG);
  }
});

window.starSync = {
  notifyStarChange: function (key) {
    if (currentUser) {
      pushKey(currentUser.uid, key).catch(function (e) { console.error('star push failed', e); });
    }
  }
};
