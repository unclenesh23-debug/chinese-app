/* Китайский каждый день — сайт-приложение под iPhone. Всё в одном файле, без библиотек.
   Содержимое — content.json (собирает build.py), прогресс — память телефона + закрытое хранилище GitHub. */
(function(){
"use strict";
const VERSION = "0b2e5058cb";

/* ---------- утилиты ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const DAY = 86400000, MIN = 60000;
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const wait = ms => new Promise(r => setTimeout(r, ms));
// день начинается в 4 утра — поздние занятия засчитываются в тот же день
const dayKey = (t = Date.now()) => { const d = new Date(t - 4 * 3600000); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const dayStart = (t = Date.now()) => { const d = new Date(t - 4 * 3600000); d.setHours(4, 0, 0, 0); return d.getTime(); };
const fmtNum = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u2009");
const hhmm = t => { const d = new Date(t); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; };
const standalone = () => !!(window.navigator.standalone || (window.matchMedia && matchMedia("(display-mode: standalone)").matches));
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
function toast(msg, ms){ const el = $("#toast"); el.textContent = msg; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, ms || 2400); }

/* ---------- значки ---------- */
const I = {
  play:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 9.5v5a1 1 0 0 0 1 1h3.2l4.3 3.6a.6.6 0 0 0 1-.46V5.36a.6.6 0 0 0-1-.46L7.2 8.5H4a1 1 0 0 0-1 1z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.3 5.8a9 9 0 0 1 0 12.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  turtle:'<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M5.5 20.5C5.5 14.7 10.2 10 16 10s10.5 4.7 10.5 10.5z"/><path d="M24.5 17.2h3v3.3h-3z"/><circle cx="28" cy="17" r="2.8"/><rect x="8" y="19.5" width="4.6" height="5.2" rx="2"/><rect x="19.4" y="19.5" width="4.6" height="5.2" rx="2"/><path d="M6 18.8 2.4 21.4l4.2-.2z"/><path d="M11 12.8l2.6 4h4.8l2.6-4M13.6 16.8 12.2 20.4M18.4 16.8l1.4 3.6" fill="none" stroke="var(--card)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  mic:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  check:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  cross:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  close:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  fire:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.6 2.2c.3 2.6-.8 4.3-2.3 5.9C8.6 9.9 7 11.8 7 14.6A5 5 0 0 0 12 20a5 5 0 0 0 5-5.2c0-1.6-.6-2.9-1.4-4-.2 1.3-.9 2.3-2 2.7.6-3.3-.2-7.8-1-11.3z"/></svg>',
  star:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/></svg>',
  chev:'<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  ear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8.5a6 6 0 0 1 12 0c0 3.5-3 4.5-3 7.5a3 3 0 0 1-5.2 2"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-1.5 2-1.5 3.5"/></svg>',
  wave:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h4l4 10h4l4-10h2"/></svg>',
  speak:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  coin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 8l3 4 3-4M12 12v5M9 13h6M9 15.5h6"/></svg>',
  pairs:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 9h3l3 6h2M13 9h3l3 6h3"/></svg>',
  share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>'
};
const stroke = s => s.replace("<svg ", '<svg fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" ');

/* ---------- пиньинь и тоны ---------- */
const V = "aeiouüvāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ";
const SYL = new RegExp("(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?[" + V + "]+(?:ng(?![" + V + "])|n(?![" + V + "])|r(?![" + V + "]))?", "gi");
const TONE = {}; "āēīōūǖ".split("").forEach(c => TONE[c] = 1); "áéíóúǘ".split("").forEach(c => TONE[c] = 2); "ǎěǐǒǔǚ".split("").forEach(c => TONE[c] = 3); "àèìòùǜ".split("").forEach(c => TONE[c] = 4);
const sylTone = s => { for (const c of s.toLowerCase()) if (TONE[c]) return TONE[c]; return 0; };
const baseOf = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ü|v/g, "u");
function py(text, hideable){
  let out = "", last = 0; text = String(text || "");
  text.replace(SYL, (m, i) => { out += esc(text.slice(last, i)) + '<span class="s' + sylTone(m) + '">' + esc(m) + "</span>"; last = i + m.length; return m; });
  return '<span class="py' + (hideable ? " hideable" : "") + '">' + out + esc(text.slice(last)) + "</span>";
}
function sylls(text){ return (String(text || "").match(SYL) || []).map(s => ({b: baseOf(s), t: sylTone(s), s})); }
// контур тона по пятиступенчатой шкале Чжао: 1 — 55, 2 — 35, 3 — 214, 4 — 51
const Y = l => 20 - (l - 1) * 4;
const CONTOUR = {1:[[3,Y(5)],[18,Y(5)]], 2:[[3,Y(3)],[18,Y(5)]], 3:[[3,Y(2)],[10,Y(1)],[18,Y(4)]], 4:[[3,Y(5)],[18,Y(1)]]};
function glyph(t){
  const staff = '<line class="staff" x1="21.5" y1="4" x2="21.5" y2="20" stroke-width="1.2"/>';
  if (!t) return '<svg class="tg" viewBox="0 0 24 24" aria-hidden="true">' + staff + '<circle cx="11" cy="15" r="2.4" fill="currentColor"/></svg>';
  return '<svg class="tg" viewBox="0 0 24 24" aria-hidden="true">' + staff + '<polyline class="c" points="' + CONTOUR[t].map(p => p.join(",")).join(" ") + '"/></svg>';
}
const TONE_NAME = {1:"1-й · ровный", 2:"2-й · вверх", 3:"3-й · низкий", 4:"4-й · вниз", 0:"лёгкий"};
const comboLabel = t => t.map(x => x || "лёгкий").join(" + ");
function hzBig(item){
  const clean = String(item.hz).replace(/[，。？！、\s…·/?!,.]/g, "");
  const chars = Array.from(clean);
  if (chars.length && chars.length <= 4 && clean === item.hz.replace(/[？！?!。]/g, "")) return `<div class="cells n${chars.length}">${chars.map(c => `<div class="cell"><span>${esc(c)}</span></div>`).join("")}</div>`;
  return `<span class="hz ${chars.length > 5 ? "long" : ""}">${esc(item.hz)}</span>`;
}
const isLong = hz => Array.from(String(hz)).length > 3;

/* ---------- содержимое ---------- */
let C = {decks:[], cards:[], tones:[], prices:[], units:[], audio:{}};
const ITEM = new Map(), LESSON = new Map(), UNIT_OF = new Map();
function indexContent(){
  ITEM.clear(); LESSON.clear(); UNIT_OF.clear();
  C.cards.forEach(c => ITEM.set(c.id, c));
  C.tones.forEach(s => s.items.forEach(it => ITEM.set(it.id, Object.assign({set: s.key, deck: "tones"}, it))));
  C.prices.forEach(p => ITEM.set(p.id, Object.assign({ru: fmtNum(p.n) + " юаней", deck: "prices"}, p)));
  C.units.forEach(u => u.lessons.forEach(l => { LESSON.set(l.id, l); UNIT_OF.set(l.id, u); }));
}
function srcOf(item){
  const f = item.sprite ? item.sprite.replace(/^audio\//, "") : item.id + ".mp3";
  return "audio/" + f + "?h=" + ((C.audio || {})[f] || VERSION);
}

/* ---------- звук ---------- */
const player = new Audio(); player.preload = "auto"; player.setAttribute("playsinline", "");
let playToken = 0, actxObj = null;
function actx(){ if (!actxObj) { const AC = window.AudioContext || window.webkitAudioContext; actxObj = AC ? new AC() : null; } return actxObj; }
document.addEventListener("touchend", function unlock(){ const c = actx(); if (c && c.state !== "running") c.resume().catch(() => {}); }, {passive: true});
function clearPlayer(){ player.onended = player.onerror = player.onplaying = player.ontimeupdate = null; }
function stopAudio(){ playToken++; clearPlayer(); try { player.pause(); } catch (e) {} $$(".playing").forEach(b => b.classList.remove("playing")); }
function setSrc(src){ if (player.dataset.src !== src) { player.src = src; player.dataset.src = src; } }
// слова уроков лежат одним файлом на урок: играем кусок от a до b
function playSprite(item, rate, token){
  const a = item.a || 0, b = item.b || 0;
  return new Promise(res => {
    let timer = 0, started = false, closed = false;
    const end = ok => { if (closed) return; closed = true; clearTimeout(timer); if (token === playToken) { clearPlayer(); try { player.pause(); } catch (e) {} } res(ok); };
    clearPlayer();
    player.onerror = () => end(false);
    player.onplaying = () => {
      if (started) return; started = true;
      if (Math.abs(player.currentTime - a) > .25) { try { player.currentTime = a; } catch (e) {} }
      timer = setTimeout(() => end(true), (b - a) / rate * 1000 + 60);
    };
    player.ontimeupdate = () => { if (started && player.currentTime >= b + .05) end(true); };
    try { setSrc(srcOf(item)); } catch (e) { return end(false); }
    player.playbackRate = rate; player.defaultPlaybackRate = rate;
    try { player.currentTime = a; } catch (e) {}
    try { const pr = player.play(); if (pr && pr.catch) pr.catch(() => end(false)); } catch (e) { end(false); }
  });
}
function playFile(src, rate, token){
  return new Promise(res => {
    clearPlayer();
    const end = ok => { if (token === playToken) clearPlayer(); res(ok); };
    player.onended = () => end(true); player.onerror = () => end(false);
    try {
      setSrc(src); player.currentTime = 0; player.playbackRate = rate; player.defaultPlaybackRate = rate;
      const pr = player.play(); if (pr && pr.catch) pr.catch(() => end(false));
    } catch (e) { end(false); }
  });
}
// сказать слово; промис закрывается, когда звук доиграл
function say(item, opts = {}){
  stopAudio(); const token = playToken;
  const rate = opts.slow ? .7 : (S.settings.slowVoice ? .85 : 1);
  if (opts.btn) opts.btn.classList.add("playing");
  const p = item.sprite ? playSprite(item, rate, token) : playFile(srcOf(item), rate, token);
  return p.then(ok => { if (opts.btn) opts.btn.classList.remove("playing"); return token === playToken && ok; });
}
function playBlob(url){ stopAudio(); const token = playToken; return playFile(url, 1, token); }
// звук «верно / неверно» — синтез, без файлов
function sfx(ok){
  if (!S.settings.sfx) return; const c = actx(); if (!c) return;
  try {
    if (c.state !== "running") c.resume();
    const t = c.currentTime + .02;
    (ok ? [[784, 0], [1175, .1]] : [[233, 0], [185, .13]]).forEach(([f, d]) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = ok ? "sine" : "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, t + d); g.gain.exponentialRampToValueAtTime(ok ? .22 : .18, t + d + .015); g.gain.exponentialRampToValueAtTime(.0001, t + d + (ok ? .28 : .32));
      o.connect(g); g.connect(c.destination); o.start(t + d); o.stop(t + d + .4);
    });
  } catch (e) {}
}

/* ---------- хранение ---------- */
const LS = "zh-app-v1";
const DEFAULTS = {goal: 30, pinyin: true, slowVoice: false, sfx: true, speak: true, recog: true};
const S = {v: 1, srs: {}, lessons: {}, days: {}, settings: {}, env: {}, notes: null, ui: {track: "book", open: {}}, speakOffUntil: 0, updated: 0};
try { const raw = localStorage.getItem(LS); if (raw) Object.assign(S, JSON.parse(raw)); } catch (e) {}
S.settings = Object.assign({}, DEFAULTS, S.settings || {});
S.ui = Object.assign({track: "book", open: {}}, S.ui || {});
function save(){ try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {} }
function touch(){ S.updated = Date.now(); save(); Sync.schedule(); }
function today(){ const k = dayKey(); return S.days[k] || (S.days[k] = {xp: 0, sec: 0, lessons: 0, reviews: 0, right: 0, wrong: 0, speak: [0, 0], words: 0}); }
const dayActive = d => !!d && ((d.sec || 0) >= 60 || (d.lessons || 0) > 0 || (d.xp || 0) > 0);
function streak(){
  let n = 0, t = Date.now();
  if (!dayActive(S.days[dayKey(t)])) t -= DAY;
  while (dayActive(S.days[dayKey(t)])) { n++; t -= DAY; }
  return n;
}
const goalSec = () => (S.settings.goal || 30) * 60;
const totalXp = () => Object.values(S.days).reduce((s, d) => s + (d.xp || 0), 0);

/* ---------- интервальное повторение ---------- */
const STEPS = [0, 1, 3, 7, 14, 30, 60, 120, 240]; // дней до следующего показа по уровню
function srsApply(id, ok){
  const now = Date.now(), e = S.srs[id] || (S.srs[id] = {lv: 0, due: 0, n: 0, x: 0, t: 0});
  e.n++; e.t = now;
  if (ok) {
    if (!e.lv || e.due <= now) e.lv = Math.min(e.lv + 1, STEPS.length - 1);
    e.due = dayStart(now) + STEPS[e.lv] * DAY;
  } else { e.x++; e.lv = e.lv > 1 ? 1 : 0; e.due = now + 10 * MIN; }
}
function dueIds(){ const now = Date.now(); return Object.keys(S.srs).filter(id => ITEM.has(id) && S.srs[id].due <= now).sort((a, b) => S.srs[a].due - S.srs[b].due); }
const learnedCount = () => Object.keys(S.srs).filter(id => S.srs[id].lv >= 2).length;
const seenCount = () => Object.keys(S.srs).filter(id => ITEM.has(id)).length;

/* ---------- курс ---------- */
const TRACKS = [{id: "book", name: "Учебник"}, {id: "life", name: "Жизнь"}, {id: "sound", name: "Звуки"}];
const lessonDone = l => ((S.lessons[l.id] || {}).n || 0) > 0;
const unitsOf = track => C.units.filter(u => u.track === track);
function currentLesson(track){
  const f = S.notes && S.notes.focus;
  if (f) { const l = LESSON.get(f) || (C.units.find(u => u.id === f) || {lessons: []}).lessons.find(x => !lessonDone(x)); if (l && UNIT_OF.get(l.id).track === track && !lessonDone(l)) return l; }
  for (const u of unitsOf(track)) for (const l of u.lessons) if (!lessonDone(l)) return l;
  return null;
}

/* ---------- упражнения ---------- */
// общий запас слов для неправильных вариантов: тот же раздел, потом та же ветка курса
function poolFor(id){
  const it = ITEM.get(id); if (!it) return [];
  if (it.deck === "tones" || it.deck === "prices") return [];
  let unit = null; for (const u of C.units) if (u.lessons.some(l => l.items.includes(id))) { unit = u; break; }
  const same = unit ? [...new Set(unit.lessons.flatMap(l => l.items))] : [];
  const track = unit ? unitsOf(unit.track).flatMap(u => u.lessons.flatMap(l => l.items)) : [];
  const out = [], seen = new Set([id]);
  for (const x of shuffle(same).concat(shuffle(track))) { if (seen.has(x)) continue; seen.add(x); const c = ITEM.get(x); if (c && c.ru && c.deck !== "tones" && c.deck !== "prices") out.push(c); }
  return out;
}
const pyKey = c => sylls(c.py).map(s => s.b + s.t).join(" ");
function distractors(item, n, field){
  const out = [], ru = new Set([item.ru]), hz = new Set([item.hz]), pk = new Set([pyKey(item)]);
  for (const c of poolFor(item.id)) {
    if (ru.has(c.ru) || hz.has(c.hz) || pk.has(pyKey(c))) continue; // одинаково звучащие (他 / 她) в варианты не берём
    if (field === "hz" && isLong(item.hz) !== isLong(c.hz) && out.length < n - 1 && Math.random() < .6) continue;
    out.push(c); ru.add(c.ru); hz.add(c.hz); pk.add(pyKey(c));
    if (out.length === n) break;
  }
  return out;
}
function tokensOf(card){
  if (/[\/…]/.test(card.hz)) return null;
  const hz = Array.from(card.hz.replace(/[，。？！、,.?!\s]/g, ""));
  const words = card.py.replace(/[,.?!，。？！]/g, " ").split(/\s+/).filter(Boolean), out = []; let i = 0;
  for (const w of words) { const m = w.match(SYL) || []; const n = m.length + m.filter(x => /r$/i.test(x) && !/^[eēéěè]r$/i.test(x)).length; if (!n) return null; out.push({hz: hz.slice(i, i + n).join(""), py: w}); i += n; }
  return i === hz.length ? out : null;
}
const canSpeak = item => !/[\/…]/.test(item.hz);
const speakOn = () => S.settings.speak && Date.now() > (S.speakOffUntil || 0);
const canType = item => sylls(item.py).length >= 1 && sylls(item.py).length <= 3 && !/[\/…]/.test(item.hz);

function quizFor(id, avoid){
  const it = ITEM.get(id), kinds = ["l2ru", "ru2zh", "l2zh"];
  const toks = tokensOf(it);
  if (toks && toks.length >= 3) kinds.push("build", "build");
  if (canType(it) && it.deck !== "life" && it.deck !== "market") kinds.push("type");
  const k = pick(kinds.filter(x => x !== avoid)) || "l2ru";
  return {type: k, id};
}
function genLesson(l){
  const q = [], ids = l.items, repeat = lessonDone(l);
  if (l.kind === "words" || l.kind === "phrases") {
    const first = {};
    for (let i = 0; i < ids.length; i += 2) {
      const chunk = ids.slice(i, i + 2);
      if (!repeat) chunk.forEach(id => q.push({type: "intro", id}));
      chunk.forEach(id => { const ex = {type: pick(["l2ru", "ru2zh"]), id}; first[id] = ex.type; q.push(ex); });
    }
    if (ids.length >= 3) q.push({type: "match", ids: shuffle(ids).slice(0, 5)});
    let speaks = 0;
    shuffle(ids).forEach(id => {
      if (speakOn() && speaks < 2 && canSpeak(ITEM.get(id)) && Math.random() < .5) { speaks++; q.push({type: "speak", id}); return; }
      q.push(quizFor(id, first[id]));
    });
    if (speakOn() && !speaks) { const id = ids.find(x => canSpeak(ITEM.get(x))); if (id) q.push({type: "speak", id}); }
  } else if (l.kind === "review") {
    const w = ids.slice().sort((a, b) => weak(b) - weak(a));
    const take = shuffle(w.slice(0, 6).concat(shuffle(w.slice(6)).slice(0, 4)));
    take.forEach((id, k) => { q.push(quizFor(id)); if (k === 4 && take.length >= 5) q.push({type: "match", ids: shuffle(ids).slice(0, 5)}); });
    if (speakOn()) { const id = take.find(x => canSpeak(ITEM.get(x))); if (id) q.push({type: "speak", id}); }
  } else if (l.kind === "tones") {
    const sets = []; ids.forEach(id => { const it = ITEM.get(id); let s = sets.find(x => x.key === it.set); if (!s) sets.push(s = {key: it.set, ids: []}); s.ids.push(id); });
    sets.forEach(s => { if (!repeat) q.push({type: "introTones", ids: s.ids}); shuffle(s.ids).slice(0, 3).forEach(id => q.push({type: "tone", id})); });
    shuffle(ids).slice(0, 4).forEach(id => q.push({type: "tone", id}));
    if (speakOn()) shuffle(ids).slice(0, 2).forEach(id => q.push({type: "speak", id}));
  } else if (l.kind === "pairs") {
    for (let i = 0; i < ids.length; i += 2) {
      const chunk = ids.slice(i, i + 2);
      if (!repeat) chunk.forEach(id => q.push({type: "introPair", id}));
      chunk.forEach(id => q.push({type: "pair", id}));
    }
    q.push({type: "match", ids: shuffle(ids).slice(0, 5)});
    if (speakOn()) shuffle(ids).slice(0, 2).forEach(id => q.push({type: "speak", id}));
  } else if (l.kind === "prices") {
    shuffle(ids).slice(0, 10).forEach(id => q.push({type: "price", id}));
  }
  return q;
}
const weak = id => { const e = S.srs[id]; if (!e) return .5; return (e.x + 1) / (e.n + 2) + (e.due <= Date.now() ? .3 : 0); };
function genReview(ids){
  const q = [];
  ids.forEach((id, k) => {
    const it = ITEM.get(id);
    if (it.deck === "tones") q.push({type: "tone", id});
    else if (it.deck === "prices") q.push({type: "price", id});
    else if (it.deck === "pairs") q.push(Math.random() < .5 ? {type: "pair", id} : quizFor(id));
    else q.push(quizFor(id));
    if (k === 5) { const m = ids.filter(x => { const c = ITEM.get(x); return c.ru && c.deck !== "tones" && c.deck !== "prices"; }); if (m.length >= 4) q.push({type: "match", ids: shuffle(m).slice(0, 5)}); }
  });
  if (speakOn()) { const id = ids.find(x => canSpeak(ITEM.get(x)) && ITEM.get(x).deck !== "prices"); if (id) q.push({type: "speak", id}); }
  return q;
}
function genDrill(kind){
  const tones = C.tones.flatMap(s => s.items.map(i => i.id)), pairs = C.cards.filter(c => c.deck === "pairs").map(c => c.id);
  if (kind === "tone") return shuffle(tones).slice(0, 10).map(id => ({type: "tone", id}));
  if (kind === "pair") return shuffle(pairs).slice(0, 10).map(id => ({type: "pair", id}));
  if (kind === "speak") return shuffle(tones).slice(0, 3).concat(shuffle(pairs).slice(0, 4)).map(id => ({type: "speak", id}));
  if (kind === "price") return shuffle(C.prices.map(p => p.id)).slice(0, 10).map(id => ({type: "price", id}));
  return [];
}

/* ---------- экран урока ---------- */
const LS_EL = () => $("#lesson");
let P = null; // идущий урок
function openPlayer(queue, meta){
  if (!queue.length) { toast("Здесь пока нечего делать"); return; }
  stopAudio(); closeSheet();
  P = {queue, i: 0, meta, right: 0, wrong: 0, xp: 0, miss: new Set(), seen: new Set(), speak: [0, 0], active: 0, shownAt: Date.now(), t0: Date.now()};
  LS_EL().hidden = false; document.body.classList.toggle("nopy", !S.settings.pinyin);
  renderEx(true);
}
function tickActive(){ if (!P) return; const now = Date.now(); if (!document.hidden) P.active += Math.min(now - P.shownAt, 90000); P.shownAt = now; }
document.addEventListener("visibilitychange", () => { if (P) { if (document.hidden) tickActive(); else P.shownAt = Date.now(); } if (document.hidden) { save(); Sync.flushSoon(); } else Sync.pull(); });
function closePlayer(){ stopAudio(); Mic.cancel(); P = null; LS_EL().hidden = true; LS_EL().innerHTML = ""; render(); }
function askQuit(){
  if (!P || P.i === 0) return closePlayer();
  openSheet(`<h2>Выйти из урока?</h2><p class="muted" style="margin:8px 0 16px">Пройденное в этом уроке не засчитается.</p>
    <div class="stack"><button class="btn primary block" data-act="stay">Продолжить урок</button><button class="btn ghost block" data-act="quit">Выйти</button></div>`,
    {stay: closeSheet, quit: () => { closeSheet(); closePlayer(); }});
}
function frame(body, foot){
  const n = P.queue.length, pct = Math.round(P.i / n * 100);
  LS_EL().innerHTML = `<div class="ls-top"><button class="ls-close" id="quit" aria-label="Закрыть урок">${I.close}</button>
    <div class="ls-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
    <div class="ls-xp">${P.xp ? "+" + P.xp : ""}</div></div>
    <div class="ls-body" id="exBody">${body}</div>
    <div class="ls-foot" id="exFoot">${foot || ""}</div>`;
  $("#quit").onclick = askQuit;
}
const checkBtn = (dis, label) => `<button class="btn primary" id="check" ${dis ? "disabled" : ""}>${label || "Проверить"}</button>`;
const listenBtns = () => `<div class="listen"><button class="speaker" id="spk" aria-label="Послушать">${I.play}</button><button class="turtle" id="slow" aria-label="Медленно">${I.turtle}</button></div>`;
function bindListen(item){
  const sp = $("#spk"), sl = $("#slow");
  if (sp) sp.onclick = () => say(item, {btn: sp});
  if (sl) sl.onclick = () => say(item, {slow: true, btn: sp});
}
function ansLine(it){ return `<span class="hz">${esc(it.hz)}</span> ${py(it.py)}${it.ru && it.deck !== "prices" ? `<br>${esc(it.ru)}` : ""}`; }

function renderEx(first){
  const ex = P.queue[P.i];
  if (!ex) return finish();
  P.shownAt = Date.now();
  const R = RENDER[ex.type];
  R(ex, first);
}
// ответ на упражнение: засчитать, показать плашку снизу
function answer(ex, ok, opts = {}){
  tickActive();
  const ids = ex.ids || [ex.id];
  if (!ex.retry && !ex.noScore) { if (ok) { P.right++; P.xp += 1; } else P.wrong++; }
  ids.forEach(id => { P.seen.add(id); if (!ok && !ex.retry && ex.type !== "match") P.miss.add(id); });
  if (!ok && !ex.retry && ex.type !== "match") P.queue.push(Object.assign({}, ex, {retry: true}));
  sfx(ok || opts.level === "mid");
  const level = opts.level || (ok ? "ok" : "no");
  const title = level === "ok" ? pick(["Верно!", "Отлично!", "Так держать!", "Правильно!"]) : level === "mid" ? "Почти!" : "Неверно";
  const fb = document.createElement("div");
  fb.className = "fb " + level;
  fb.innerHTML = `<div class="fb-title"><i>${stroke(level === "no" ? I.cross : I.check)}</i>${esc(title)}</div>
    ${opts.html ? `<div class="fb-ans">${opts.html}</div>` : `<div style="height:12px"></div>`}
    <button class="btn" id="next">${level === "no" ? "Понятно" : "Дальше"}</button>`;
  LS_EL().appendChild(fb);
  $("#exFoot").style.visibility = "hidden";
  const nx = $("#next"); nx.focus({preventScroll: true});
  nx.onclick = next;
}
function next(){ stopAudio(); tickActive(); P.i++; renderEx(); autoplay(); }
function autoplay(){
  if (!P) return; const ex = P.queue[P.i]; if (!ex) return;
  const it = ex.id && ITEM.get(ex.id);
  if (["intro", "l2ru", "l2zh", "build", "type", "tone", "pair", "price", "introPair", "speak"].includes(ex.type) && it) say(it, {btn: $("#spk")});
  if (ex.type === "introTones") (async () => { for (const id of ex.ids) { const b = $(`[data-say="${id}"]`); if (!b || !P) return; const ok = await say(ITEM.get(id), {btn: b}); if (!ok) return; await wait(250); } })();
}

const RENDER = {
  intro(ex){
    const it = ITEM.get(ex.id);
    frame(`<div><span class="tag-new">Новое слово</span></div>
      <div class="big">${hzBig(it)}${py(it.py)}<span class="ru">${esc(it.ru)}</span>${it.note ? `<span class="note">${esc(it.note)}</span>` : ""}</div>
      ${listenBtns()}`, `<button class="btn primary" id="check">Дальше</button>`);
    bindListen(it);
    $("#check").onclick = () => { tickActive(); P.seen.add(ex.id); next(); };
  },
  introPair(ex){
    const it = ITEM.get(ex.id);
    frame(`<div><span class="tag-new">Пара тонов</span></div>
      <div class="big">${hzBig(it)}${py(it.py)}<span class="ru">${esc(it.ru)}</span></div>
      <div class="opt s0" style="pointer-events:none"><div class="combo">${it.tones.map(t => `<span class="s${t}" style="color:var(--t${t})">${glyph(t)}</span>`).join("")}</div><span class="lab">${esc(comboLabel(it.tones))}${it.tones[0] === 3 && it.tones[1] === 3 ? " · звучит как 2 + 3" : ""}</span></div>
      ${listenBtns()}`, `<button class="btn primary" id="check">Дальше</button>`);
    bindListen(it);
    $("#check").onclick = () => { tickActive(); P.seen.add(ex.id); next(); };
  },
  introTones(ex){
    const items = ex.ids.map(id => ITEM.get(id));
    frame(`<div class="ask">Четыре тона: ${esc(items[0].set)}<small>Нажимай и слушай, как меняется голос</small></div>
      <div class="introtones">${items.map(it => `<button class="opt s${it.t}" data-say="${it.id}">${glyph(it.t)}<span class="hz">${esc(it.hz)}</span>${py(it.py)}<span class="lab">${esc(it.ru)}</span></button>`).join("")}</div>
      <div class="stack small muted">${items.map(it => `<div>${glyph(it.t).replace('class="tg"', 'class="tg" style="display:inline-block;vertical-align:middle;color:var(--t' + it.t + ')"')} ${esc(TONE_NAME[it.t])}</div>`).join("")}</div>`,
      `<button class="btn primary" id="check">Дальше</button>`);
    $$("[data-say]").forEach(b => b.onclick = () => say(ITEM.get(b.dataset.say), {btn: b}));
    $("#check").onclick = () => { tickActive(); ex.ids.forEach(id => P.seen.add(id)); next(); };
  },
  l2ru(ex){ choice(ex, "l2ru"); },
  l2zh(ex){ choice(ex, "l2zh"); },
  ru2zh(ex){ choice(ex, "ru2zh"); },
  match(ex){ matchEx(ex); },
  build(ex){ buildEx(ex); },
  type(ex){ typeEx(ex); },
  price(ex){ priceEx(ex); },
  tone(ex){ toneEx(ex); },
  pair(ex){ pairEx(ex); },
  speak(ex){ speakEx(ex); }
};

function choice(ex, mode){
  const it = ITEM.get(ex.id);
  if (!ex.opts) ex.opts = shuffle([it].concat(distractors(it, 3, mode === "l2ru" ? "ru" : "hz"))).map(c => c.id);
  const opts = ex.opts.map(id => ITEM.get(id));
  const zhOpts = mode !== "l2ru", long = zhOpts && opts.some(c => isLong(c.hz));
  const ask = mode === "l2ru" ? "Что ты услышал?<small>Выбери перевод</small>" : mode === "l2zh" ? "Что ты услышал?<small>Выбери слово</small>" : "Как сказать по-китайски?";
  const prompt = mode === "ru2zh" ? `<div class="prompt-ru">${esc(it.ru)}</div>` : listenBtns();
  const optHTML = c => zhOpts ? `<button class="opt" data-id="${c.id}"><span class="hz ${isLong(c.hz) && !long ? "long" : ""}">${esc(c.hz)}</span>${py(c.py, true)}</button>` : `<button class="opt" data-id="${c.id}">${esc(c.ru)}</button>`;
  frame(`<div class="ask">${ask}</div>${prompt}<div class="${zhOpts && !long ? "grid2" : "list"}">${opts.map(optHTML).join("")}</div>`, checkBtn(true));
  bindListen(it);
  let sel = null;
  $$(".opt[data-id]").forEach(b => b.onclick = () => {
    if (P.locked) return;
    sel = b.dataset.id; $$(".opt[data-id]").forEach(x => x.setAttribute("aria-pressed", x === b)); $("#check").disabled = false;
    if (zhOpts && mode === "ru2zh") say(ITEM.get(sel), {});
  });
  $("#check").onclick = () => {
    if (!sel) return; const ok = sel === it.id;
    $$(".opt[data-id]").forEach(x => { x.disabled = true; if (x.dataset.id === it.id) x.classList.add("right"); else if (x.dataset.id === sel) x.classList.add("wrong"); });
    say(it, {});
    answer(ex, ok, {html: ansLine(it)});
  };
}

function matchEx(ex){
  const items = ex.ids.map(id => ITEM.get(id)).filter(c => c && c.ru);
  if (!ex.left) { ex.left = shuffle(items.map(c => c.id)); ex.right = shuffle(items.map(c => c.id)); }
  frame(`<div class="ask">Найди пары<small>Нажми слово, потом его перевод</small></div>
    <div class="match"><div class="col">${ex.left.map(id => { const c = ITEM.get(id); return `<button class="opt" data-l="${id}"><span class="hz ${isLong(c.hz) ? "long" : ""}">${esc(c.hz)}</span>${py(c.py, true)}</button>`; }).join("")}</div>
    <div class="col">${ex.right.map(id => `<button class="opt rus" data-r="${id}">${esc(ITEM.get(id).ru)}</button>`).join("")}</div></div>`, "");
  let L = null, R = null, done = 0, bad = false;
  const judge = () => {
    if (!L || !R) return;
    const bl = $(`[data-l="${L}"]`), br = $(`[data-r="${R}"]`);
    if (L === R) {
      sfx(true); [bl, br].forEach(b => { b.classList.add("right"); b.setAttribute("aria-pressed", "false"); setTimeout(() => b.classList.add("gone"), 220); });
      done++; P.seen.add(L);
      if (done === items.length) setTimeout(() => answer(Object.assign({}, ex, {retry: false}), !bad, {html: bad ? "Были ошибки — эти слова ещё повторим." : "Все пары найдены."}), 380);
    } else {
      sfx(false); bad = true; P.miss.add(L); P.miss.add(R);
      [bl, br].forEach(b => { b.classList.add("shake", "wrong"); setTimeout(() => { b.classList.remove("shake", "wrong"); b.setAttribute("aria-pressed", "false"); }, 420); });
    }
    L = R = null;
  };
  $$("[data-l]").forEach(b => b.onclick = () => { $$("[data-l]").forEach(x => x.setAttribute("aria-pressed", x === b)); L = b.dataset.l; say(ITEM.get(L), {}); judge(); });
  $$("[data-r]").forEach(b => b.onclick = () => { $$("[data-r]").forEach(x => x.setAttribute("aria-pressed", x === b)); R = b.dataset.r; judge(); });
}

function buildEx(ex){
  const it = ITEM.get(ex.id), toks = tokensOf(it);
  if (!toks) { ex.type = "l2ru"; return choice(ex, "l2ru"); }
  if (!ex.bank) {
    const extra = []; const have = new Set(toks.map(t => t.hz));
    for (const c of poolFor(it.id)) { const t = tokensOf(c); if (!t) continue; for (const x of t) if (!have.has(x.hz) && extra.length < 2 && Math.random() < .5) { extra.push(x); have.add(x.hz); } if (extra.length >= 2) break; }
    ex.bank = shuffle(toks.concat(extra)); ex.placed = [];
  }
  const draw = () => {
    frame(`<div class="ask">Собери, что услышал<small>${esc(it.ru)}</small></div>${listenBtns()}
      <div class="slots">${ex.placed.map((k, j) => `<button class="tile" data-slot="${j}"><span class="hz">${esc(ex.bank[k].hz)}</span>${py(ex.bank[k].py, true)}</button>`).join("")}</div>
      <div class="bank">${ex.bank.map((t, k) => `<button class="tile ${ex.placed.includes(k) ? "used" : ""}" data-bank="${k}"><span class="hz">${esc(t.hz)}</span>${py(t.py, true)}</button>`).join("")}</div>`,
      checkBtn(ex.placed.length !== toks.length));
    bindListen(it);
    $$("[data-bank]").forEach(b => b.onclick = () => { const k = +b.dataset.bank; if (ex.placed.includes(k) || ex.placed.length >= toks.length) return; ex.placed.push(k); draw(); });
    $$("[data-slot]").forEach(b => b.onclick = () => { ex.placed.splice(+b.dataset.slot, 1); draw(); });
    $("#check").onclick = () => {
      const ok = ex.placed.map(k => ex.bank[k].hz).join("") === toks.map(t => t.hz).join("");
      say(it, {}); answer(ex, ok, {html: ansLine(it)});
    };
  };
  draw();
}

function typeEx(ex){
  const it = ITEM.get(ex.id), tgt = sylls(it.py);
  frame(`<div class="ask">Напиши пиньинь<small>Что ты услышал? Тоны можно не ставить</small></div>${listenBtns()}
    <input class="answer" id="ans" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="например: ni hao или ni3 hao3" enterkeyhint="done">
    <p class="hint">Цифра после слога — тон: ma1 ma2 ma3 ma4</p>`, checkBtn(true));
  bindListen(it);
  const inp = $("#ans"), btn = $("#check");
  inp.oninput = () => { btn.disabled = !inp.value.trim(); };
  inp.onkeydown = e => { if (e.key === "Enter" && inp.value.trim()) { e.preventDefault(); btn.click(); } };
  btn.onclick = () => {
    inp.blur();
    const raw = inp.value.trim().toLowerCase().replace(/u:/g, "ü");
    const letters = baseOf(raw).replace(/[^a-z]/g, "");
    const want = tgt.map(s => s.b).join("");
    const okLetters = letters === want;
    let tones = (raw.match(/[0-5]/g) || []).map(Number).map(t => t === 5 ? 0 : t);
    if (!tones.length) tones = (raw.match(SYL) || []).map(sylTone).filter(Boolean);
    const gaveTones = tones.length > 0;
    const okTones = !gaveTones || (tones.length === tgt.length && tones.every((t, i) => t === tgt[i].t || tgt[i].t === 0 || /[一不]/.test(it.hz)));
    const level = okLetters ? (okTones ? "ok" : "mid") : "no";
    answer(ex, okLetters, {level, html: ansLine(it) + (level === "mid" ? "<br>Буквы верно, тон другой." : "")});
    say(it, {});
  };
  setTimeout(() => { try { inp.focus({preventScroll: true}); } catch (e) {} }, 350);
}

function priceEx(ex){
  const it = ITEM.get(ex.id);
  frame(`<div class="ask">Сколько стоит?<small>Послушай и впиши цифрами</small></div>${listenBtns()}
    <input class="answer" id="ans" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="юаней" enterkeyhint="done">
    ${it.coll ? `<p class="hint">Рыночная речь: «块» и нули в конце часто не говорят</p>` : ""}`, checkBtn(true));
  bindListen(it);
  const inp = $("#ans"), btn = $("#check");
  inp.oninput = () => { btn.disabled = !inp.value.trim(); };
  inp.onkeydown = e => { if (e.key === "Enter" && inp.value.trim()) { e.preventDefault(); btn.click(); } };
  btn.onclick = () => {
    inp.blur(); const n = parseInt(inp.value.replace(/\D/g, ""), 10), ok = n === it.n;
    answer(ex, ok, {html: `<b class="num">${fmtNum(it.n)} ¥</b> — <span class="hz">${esc(it.hz)}</span> ${py(it.py)}${it.coll ? "<br>Так говорят на рынке: без «块» и без нулей в конце." : ""}`});
  };
}

function toneEx(ex){
  const it = ITEM.get(ex.id);
  frame(`<div class="ask">Какой тон?<small>Послушай слог</small></div>${listenBtns()}
    <div class="tones4">${[1, 2, 3, 4].map(t => `<button class="opt s${t}" data-t="${t}">${glyph(t)}<span class="lab">${esc(TONE_NAME[t])}</span></button>`).join("")}</div>`, checkBtn(true));
  bindListen(it);
  let sel = 0;
  $$("[data-t]").forEach(b => b.onclick = () => { sel = +b.dataset.t; $$("[data-t]").forEach(x => x.setAttribute("aria-pressed", x === b)); $("#check").disabled = false; });
  $("#check").onclick = () => {
    const ok = sel === it.t;
    $$("[data-t]").forEach(x => { x.disabled = true; if (+x.dataset.t === it.t) x.classList.add("right"); else if (+x.dataset.t === sel) x.classList.add("wrong"); });
    answer(ex, ok, {html: `<span class="hz">${esc(it.hz)}</span> ${py(it.py)} — ${esc(it.ru)}<br>${esc(TONE_NAME[it.t])} тон`});
  };
}

const COMBOS = []; [1, 2, 3, 4].forEach(a => [1, 2, 3, 4, 0].forEach(b => COMBOS.push([a, b])));
function pairEx(ex){
  const it = ITEM.get(ex.id), key = it.tones.join("");
  if (!ex.opts) {
    const others = shuffle(COMBOS.filter(c => c.join("") !== key && !(key === "33" && c.join("") === "23")));
    const near = others.filter(c => c[0] === it.tones[0] || c[1] === it.tones[1]);
    ex.opts = shuffle([it.tones].concat(near.slice(0, 2), others.filter(c => !near.slice(0, 2).includes(c)).slice(0, 1)));
  }
  frame(`<div class="ask">Какие тоны?<small>Послушай слово из двух слогов</small></div>${listenBtns()}
    <div class="tones4">${ex.opts.map((c, k) => `<button class="opt" data-k="${k}"><div class="combo">${c.map(t => `<span style="color:var(--t${t})">${glyph(t)}</span>`).join("")}</div><span class="lab">${esc(comboLabel(c))}</span></button>`).join("")}</div>`, checkBtn(true));
  bindListen(it);
  let sel = -1;
  $$("[data-k]").forEach(b => b.onclick = () => { sel = +b.dataset.k; $$("[data-k]").forEach(x => x.setAttribute("aria-pressed", x === b)); $("#check").disabled = false; });
  $("#check").onclick = () => {
    const pickd = ex.opts[sel].join(""), ok = pickd === key;
    $$("[data-k]").forEach(x => { x.disabled = true; const c = ex.opts[+x.dataset.k].join(""); if (c === key) x.classList.add("right"); else if (+x.dataset.k === sel) x.classList.add("wrong"); });
    answer(ex, ok, {html: `${ansLine(it)}<br>${esc(comboLabel(it.tones))}${key === "33" ? " — два третьих подряд звучат как 2 + 3" : ""}`});
  };
}

/* ---------- говорить: микрофон, распознавание речи, мелодия голоса ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
const Mic = {
  cur: null,
  ok: () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
  // вызывать прямо из нажатия: iPhone разрешает запуск распознавания только так
  start(opts){
    this.cancel();
    const st = {alts: [], srErr: "", micErr: "", blob: null, done: false, t0: Date.now()};
    this.cur = st;
    st.promise = new Promise(r => st.resolve = r);
    if (SR && S.settings.recog) {
      try {
        const r = new SR(); r.lang = "zh-CN"; r.interimResults = false; r.maxAlternatives = 5; r.continuous = false;
        r.onresult = e => { for (let i = 0; i < e.results.length; i++) { const res = e.results[i]; for (let k = 0; k < res.length; k++) st.alts.push({text: res[k].transcript, conf: res[k].confidence}); } };
        r.onerror = e => { st.srErr = e.error || "error"; };
        r.onend = () => { st.srEnded = true; if (!st.stopped && st.alts.length) setTimeout(() => this.stop(), 200); };
        r.start(); st.r = r;
      } catch (e) { st.srErr = "start: " + (e.name || e.message); }
    } else st.srErr = SR ? "off" : "unsupported";
    const onStart = () => { st.recording = true; st.timer = setTimeout(() => this.stop(), opts.maxMs || 5000); if (opts.onStart) opts.onStart(); };
    if (!this.ok()) { st.micErr = "unsupported"; if (st.r) onStart(); else this._finish(st); return st; }
    navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true}}).then(stream => {
      st.stream = stream;
      if (st.stopped || st.cancelled) return this._finish(st);
      const types = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"];
      const mt = window.MediaRecorder && MediaRecorder.isTypeSupported ? types.find(t => MediaRecorder.isTypeSupported(t)) : "";
      try {
        const rec = new MediaRecorder(stream, mt ? {mimeType: mt} : undefined);
        const chunks = [];
        rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = () => { st.blob = new Blob(chunks, {type: rec.mimeType || mt || "audio/mp4"}); this._finish(st); };
        rec.start(); st.rec = rec;
      } catch (e) { st.micErr = "recorder: " + (e.name || e.message); }
      onStart();
    }).catch(e => { st.micErr = e.name || String(e); if (st.r && !st.srErr) onStart(); else this._finish(st); });
    return st;
  },
  stop(){
    const st = this.cur; if (!st || st.stopped) return; st.stopped = true; st.recording = false; clearTimeout(st.timer);
    try { if (st.r) st.r.stop(); } catch (e) {}
    if (st.rec && st.rec.state !== "inactive") { try { st.rec.stop(); } catch (e) { this._finish(st); } }
    else this._finish(st);
  },
  cancel(){ const st = this.cur; if (!st) return; st.cancelled = true; this.stop(); try { if (st.r) st.r.abort(); } catch (e) {} },
  _finish(st){
    if (st.done || st.finishing) return; st.finishing = true;
    const fin = () => { if (st.done) return; st.done = true; if (st.stream) st.stream.getTracks().forEach(t => t.stop()); try { if (navigator.audioSession) navigator.audioSession.type = "auto"; } catch (e) {} st.resolve(st); };
    if (st.r && !st.srEnded && !st.srErr) { const t0 = Date.now(); const iv = setInterval(() => { if (st.srEnded || st.srErr || Date.now() - t0 > 1800) { clearInterval(iv); fin(); } }, 100); }
    else fin();
  }
};
const Rec = {
  cache: new Map(),
  decode(buf){
    const c = actx(); if (!c) return Promise.reject(new Error("no audio"));
    return new Promise((res, rej) => { try { const p = c.decodeAudioData(buf, res, rej); if (p && p.then) p.then(res, rej); } catch (e) { rej(e); } });
  },
  native(item){
    const src = srcOf(item);
    if (!this.cache.has(src)) this.cache.set(src, fetch(src).then(r => r.arrayBuffer()).then(b => this.decode(b)).catch(() => null));
    return this.cache.get(src).then(buf => buf ? monoOf(buf, item.sprite ? item.a : 0, item.sprite ? item.b : 0) : null);
  }
};
function monoOf(buf, a, b){
  const sr = buf.sampleRate, s0 = Math.max(0, Math.floor((a || 0) * sr)), s1 = b ? Math.min(buf.length, Math.ceil(b * sr)) : buf.length;
  const n = Math.max(0, s1 - s0), out = new Float32Array(n), ch = buf.numberOfChannels;
  for (let c = 0; c < ch; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) out[i] += d[s0 + i] / ch; }
  return {data: out, sr};
}
// высота голоса каждые 10 мс (метод YIN), в полутонах; null — тишина или шум
function pitchTrack(sig){
  if (!sig || !sig.data.length) return [];
  const k = Math.max(1, Math.round(sig.sr / 16000)), fs = sig.sr / k, n = Math.floor(sig.data.length / k);
  const x = new Float32Array(n); for (let i = 0; i < n; i++) { let t = 0; for (let j = 0; j < k; j++) t += sig.data[i * k + j]; x[i] = t / k; }
  const W = Math.round(fs * .032), hop = Math.round(fs * .01), tMin = Math.floor(fs / 500), tMax = Math.ceil(fs / 65);
  const rms = []; let maxR = 0;
  for (let st = 0; st + W + tMax < n; st += hop) { let e = 0; for (let i = 0; i < W; i++) e += x[st + i] * x[st + i]; const r = Math.sqrt(e / W); rms.push(r); if (r > maxR) maxR = r; }
  const d = new Float32Array(tMax + 2), out = [];
  for (let f = 0, st = 0; f < rms.length; f++, st += hop) {
    if (rms[f] < maxR * .12) { out.push(null); continue; }
    let run = 0; d[0] = 1;
    for (let tau = 1; tau <= tMax; tau++) { let t = 0; for (let i = 0; i < W; i++) { const v = x[st + i] - x[st + i + tau]; t += v * v; } run += t; d[tau] = run ? t * tau / run : 1; }
    let tau = -1;
    for (let t = tMin; t <= tMax; t++) if (d[t] < .15) { while (t + 1 <= tMax && d[t + 1] < d[t]) t++; tau = t; break; }
    if (tau < 1) { out.push(null); continue; }
    const a = d[tau - 1], b = d[tau], c = tau + 1 <= tMax ? d[tau + 1] : b, den = a + c - 2 * b;
    out.push(12 * Math.log2(fs / (tau + (den ? (a - c) / (2 * den) : 0)) / 100));
  }
  return out;
}
function contour(fr){
  const v = fr.slice(), all = v.filter(x => x != null).sort((a, b) => a - b);
  if (all.length < 6) return null;
  const med = all[all.length >> 1];
  for (let i = 0; i < v.length; i++) if (v[i] != null) { while (v[i] - med > 7) v[i] -= 12; while (med - v[i] > 7) v[i] += 12; }
  const m = v.map((x, i) => { if (x == null) return null; const w = []; for (let j = i - 2; j <= i + 2; j++) if (v[j] != null) w.push(v[j]); w.sort((a, b) => a - b); return w[w.length >> 1]; });
  for (let i = 0; i < m.length;) { if (m[i] == null) { i++; continue; } let j = i; while (j < m.length && m[j] != null) j++; if (j - i < 4) for (let t = i; t < j; t++) m[t] = null; i = j; }
  const s = m.findIndex(x => x != null); if (s < 0) return null;
  let e = m.length - 1; while (m[e] == null) e--;
  const seg = m.slice(s, e + 1), vv = seg.filter(x => x != null).sort((a, b) => a - b), md = vv[vv.length >> 1];
  return seg.map(x => x == null ? null : x - md);
}
function resample(pts, n){
  const idx = []; pts.forEach((p, i) => { if (p != null) idx.push(i); });
  const out = [];
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1) * (pts.length - 1); let lo = null, hi = null;
    for (const i of idx) { if (i <= t) lo = i; if (i >= t) { hi = i; break; } }
    if (lo == null) lo = hi; if (hi == null) hi = lo;
    out.push(hi === lo ? pts[lo] : pts[lo] + (pts[hi] - pts[lo]) * (t - lo) / (hi - lo));
  }
  return out;
}
function compareMel(nat, you){
  const n = 32, a = resample(nat, n), b = resample(you, n), ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let e = 0; for (let i = 0; i < n; i++) { const dd = (a[i] - ma) - (b[i] - mb); e += dd * dd; }
  const rmse = Math.sqrt(e / n), dir = arr => arr.slice(-6).reduce((x, y) => x + y, 0) / 6 - arr.slice(0, 6).reduce((x, y) => x + y, 0) / 6;
  const range = arr => Math.max(...arr) - Math.min(...arr), dn = dir(a), dy = dir(b), rn = range(a), ry = range(b);
  let hint = "";
  if (dn > 2.5 && dy < 1) hint = "У диктора голос в конце идёт вверх, у тебя — нет.";
  else if (dn < -2.5 && dy > -1) hint = "У диктора голос в конце падает, у тебя — нет.";
  else if (rn < 2.5 && ry > 4.5) hint = "У диктора голос ровный, у тебя скачет.";
  else if (rn > 3 && ry < rn * .5) hint = "Мелодия плоская: говори шире — выше и ниже, как диктор.";
  return {rmse, hint, level: rmse <= 1.8 ? "ok" : rmse <= 3.2 ? "mid" : "no"};
}
function melodySVG(nat, you){
  const W = 300, H = 110, pad = 8, lim = 8;
  const line = (pts, cls) => {
    if (!pts || pts.length < 2) return "";
    const n = pts.length, segs = []; let cur = [];
    pts.forEach((p, i) => { if (p == null) { if (cur.length > 1) segs.push(cur); cur = []; return; } const x = pad + i / (n - 1) * (W - 2 * pad), y = H / 2 - Math.max(-lim, Math.min(lim, p)) / lim * (H / 2 - pad); cur.push(x.toFixed(1) + "," + y.toFixed(1)); });
    if (cur.length > 1) segs.push(cur);
    return segs.map(sg => `<polyline class="${cls}" vector-effect="non-scaling-stroke" points="${sg.join(" ")}"/>`).join("");
  };
  return `<svg class="melody" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Мелодия голоса: диктор и ты">
    <line class="axis" x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>${line(nat, "nat")}${line(you, "you")}</svg>`;
}
// словарь «иероглиф → слог с тоном», чтобы сверить то, что услышало распознавание
let HZ = null;
function loadHz(){ return HZ ? Promise.resolve(HZ) : fetch("hz.json?v=" + VERSION).then(r => r.json()).then(d => HZ = d).catch(() => HZ = {}); }
const DIG = "零一二三四五六七八九";
function numZh(n){
  if (n < 10) return DIG[n];
  if (n < 20) return "十" + (n % 10 ? DIG[n % 10] : "");
  if (n < 100) return DIG[Math.floor(n / 10)] + "十" + (n % 10 ? DIG[n % 10] : "");
  if (n < 1000) { const r = n % 100; return DIG[Math.floor(n / 100)] + "百" + (r ? (r < 10 ? "零" : "") + (r < 20 && r >= 10 ? "一" + numZh(r) : numZh(r)) : ""); }
  if (n < 10000) { const r = n % 1000; return DIG[Math.floor(n / 1000)] + "千" + (r ? (r < 100 ? "零" : "") + numZh(r) : ""); }
  if (n < 100000000) { const r = n % 10000; return numZh(Math.floor(n / 10000)) + "万" + (r ? (r < 1000 ? "零" : "") + numZh(r) : ""); }
  return String(n);
}
function heardSylls(text){
  const t = String(text).replace(/\d+/g, m => numZh(+m)), out = [];
  for (const ch of Array.from(t)) {
    const p = HZ && HZ[ch]; if (!p) continue;
    const m = /^([a-zv]+)(\d)?$/.exec(p); if (!m) continue;
    out.push({ch, b: m[1].replace(/v/g, "u"), t: m[2] ? (+m[2] === 5 ? 0 : +m[2]) : 0});
  }
  return out;
}
function scoreHeard(item, text){
  const clean = s => String(s).replace(/[，。？！、,.?!\s…·/]/g, "");
  const tgt = sylls(item.py), got = heardSylls(text);
  const exact = clean(text) === clean(item.hz);
  const n = tgt.length, m = got.length;
  const D = Array.from({length: n + 1}, (_, i) => Array.from({length: m + 1}, (_, j) => i + j));
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (tgt[i - 1].b === got[j - 1].b ? 0 : 1));
  const flags = got.map(() => "no"); let toneBad = null;
  for (let i = n, j = m; i > 0 && j > 0;) {
    if (D[i][j] === D[i - 1][j - 1] + (tgt[i - 1].b === got[j - 1].b ? 0 : 1)) {
      if (tgt[i - 1].b === got[j - 1].b) {
        const tt = tgt[i - 1].t, gt = got[j - 1].t;
        const toneOk = exact || !tt || !gt || tt === gt || /[一不]/.test(got[j - 1].ch) || (tt === 2 && gt === 3 && tgt[i] && tgt[i].t === 3);
        flags[j - 1] = toneOk ? "ok" : "tone"; if (!toneOk) toneBad = {want: tgt[i - 1], got: got[j - 1]};
      }
      i--; j--;
    } else if (D[i][j] === D[i - 1][j] + 1) i--; else j--;
  }
  const ratio = n ? 1 - D[n][m] / Math.max(n, m, 1) : 0;
  const level = exact || (ratio === 1 && !toneBad) ? "ok" : ratio >= .5 ? "mid" : "no";
  return {text, got, flags, ratio, level, toneBad, score: (exact ? 2 : 0) + ratio - (toneBad ? .2 : 0)};
}
async function analyze(item, st){
  const out = {heard: null, mel: null};
  if (st.alts.length) { await loadHz(); for (const a of st.alts) { const r = scoreHeard(item, a.text); if (!out.heard || r.score > out.heard.score) out.heard = r; } }
  if (st.blob && st.blob.size > 600) {
    try {
      const buf = await Rec.decode(await st.blob.arrayBuffer());
      const you = contour(pitchTrack(monoOf(buf, 0, 0)));
      const natSig = await Rec.native(item), nat = natSig ? contour(pitchTrack(natSig)) : null;
      out.mel = {you, nat, cmp: you && nat ? compareMel(nat, you) : null};
    } catch (e) { out.melErr = String(e && e.message || e); }
  }
  return out;
}
function envNote(st, a){
  S.env = Object.assign(S.env || {}, {
    t: Date.now(), standalone: standalone(), ua: navigator.userAgent.slice(0, 160),
    srApi: !!SR, mic: !st.micErr, micErr: st.micErr || "", sr: st.alts.length > 0 || (S.env || {}).sr === true, srErr: st.srErr || "",
    rec: !!(st.blob && st.blob.size > 600), mel: !!(a && a.mel && a.mel.you)
  });
}
function speakVerdict(a){
  const h = a.heard, m = a.mel && a.mel.cmp;
  if (h) {
    if (h.level === "ok") return {level: "ok", text: m && m.level === "no" ? "Слова верно! Мелодию подтяни" : "Отлично!"};
    if (h.level === "mid") return {level: "mid", text: h.toneBad ? "Почти — проверь тон" : "Почти"};
    return {level: "no", text: "Не похоже — послушай и попробуй ещё"};
  }
  if (m) return {level: m.level, text: {ok: "Похоже на диктора", mid: "Почти", no: "Не похоже — послушай ещё раз"}[m.level]};
  return {level: "none", text: "Не расслышал. Скажи громче и ближе к телефону"};
}
function speakEx(ex){
  const it = ITEM.get(ex.id);
  const syl = Math.max(1, sylls(it.py).length);
  frame(`<div class="ask">Скажи вслух<small>Послушай, нажми на микрофон и повтори</small></div>
    <div class="big">${hzBig(it)}${py(it.py)}${it.ru && it.deck !== "prices" ? `<span class="ru">${esc(it.ru)}</span>` : ""}</div>
    ${listenBtns()}
    <div class="micwrap"><button class="mic" id="mic" aria-label="Записать">${I.mic}</button><div class="mic-lab" id="micLab">Нажми и говори</div></div>
    <div id="spOut" class="stack"></div>
    <div style="text-align:center"><button class="linkbtn" id="cant">Не могу сейчас говорить</button></div>`,
    `<button class="btn ghost" id="check">Пропустить</button>`);
  bindListen(it);
  let tries = 0, best = null, busy = false, url = "";
  const mic = $("#mic"), lab = $("#micLab"), out = $("#spOut"), foot = $("#check");
  const done = () => {
    tickActive();
    if (tries) { P.speak[1]++; if (best === "ok" || best === "mid") { P.speak[0]++; P.xp += 1; } }
    if (url) URL.revokeObjectURL(url);
    P.seen.add(ex.id); next();
  };
  foot.onclick = () => { Mic.cancel(); done(); };
  $("#cant").onclick = () => {
    Mic.cancel(); S.speakOffUntil = Date.now() + 60 * MIN; save();
    P.queue = P.queue.filter((q, k) => k <= P.i || q.type !== "speak");
    toast("Хорошо, час без заданий «скажи вслух»"); done();
  };
  mic.onclick = () => {
    if (busy) return;
    if (Mic.cur && Mic.cur.recording) { Mic.stop(); return; }
    stopAudio();
    const st = Mic.start({maxMs: Math.min(7000, 1800 + syl * 650), onStart: () => { mic.classList.add("rec"); lab.textContent = "Говори… нажми ещё раз, когда закончишь"; }});
    lab.textContent = "Включаю микрофон…";
    st.promise.then(async st2 => {
      if (st2.cancelled || !P) return;
      mic.classList.remove("rec"); mic.classList.add("busy"); busy = true; lab.textContent = "Слушаю…";
      const a = await analyze(it, st2); envNote(st2, a); save();
      busy = false; mic.classList.remove("busy"); tries++;
      const v = speakVerdict(a);
      if (v.level !== "none" && (!best || v.level === "ok" || (v.level === "mid" && best === "no"))) best = v.level;
      sfx(v.level === "ok" || v.level === "mid");
      if (url) URL.revokeObjectURL(url); url = st2.blob && st2.blob.size > 600 ? URL.createObjectURL(st2.blob) : "";
      const h = a.heard;
      let heard = "";
      if (h) heard = `<div class="heard">Я услышал: <span class="hz">${h.got.length ? h.got.map((g, k) => `<span class="syl ${h.flags[k] === "ok" ? "ok" : "no"}">${esc(g.ch)}</span>`).join("") : esc(h.text)}</span>${h.toneBad ? `<br>Слог «${esc(h.toneBad.want.s)}» — нужен ${esc(TONE_NAME[h.toneBad.want.t] || "лёгкий")} тон` : ""}</div>`;
      else if (SR && S.settings.recog && st2.srErr && st2.srErr !== "no-speech") heard = `<div class="heard small">Проверка слов не сработала (${esc(st2.srErr)}). Сравниваю только мелодию.</div>`;
      let micHelp = "";
      if (st2.micErr === "NotAllowedError") micHelp = `<div class="warnbox">Нет доступа к микрофону. Разреши: «Настройки» → «Safari» → «Микрофон» → «Разрешить», потом открой приложение заново.</div>`;
      else if (st2.srErr === "service-not-allowed" || st2.srErr === "not-allowed") micHelp = `<div class="warnbox">Проверка слов выключена в iPhone. Включи: «Настройки» → «Основные» → «Клавиатура» → «Включить диктовку».</div>`;
      const mel = a.mel && (a.mel.you || a.mel.nat);
      out.innerHTML = `<div class="verdict ${v.level === "none" ? "no" : v.level}">${esc(v.text)}</div>${heard}
        ${mel ? melodySVG(a.mel.nat, a.mel.you) + `<div class="legend2"><span><i style="background:var(--ink-3)"></i>диктор</span><span><i style="background:var(--t4)"></i>ты</span></div>` : ""}
        ${a.mel && a.mel.cmp && a.mel.cmp.hint ? `<p class="hint">${esc(a.mel.cmp.hint)}</p>` : ""}${micHelp}
        <div class="row" style="justify-content:center">${url ? `<button class="btn" id="me">${I.play}Я</button>` : ""}<button class="btn" id="nat">${I.play}Диктор</button></div>`;
      lab.textContent = v.level === "ok" ? "Можно ещё раз или дальше" : "Нажми и попробуй ещё";
      if (url) $("#me").onclick = () => playBlob(url);
      $("#nat").onclick = e => say(it, {btn: e.currentTarget});
      foot.className = "btn primary"; foot.textContent = "Дальше";
    });
  };
}

/* ---------- итог урока ---------- */
function finish(){
  tickActive();
  const d = today(), sec = Math.round(P.active / 1000), meta = P.meta || {};
  const scored = P.right + P.wrong, acc = scored ? Math.round(P.right / scored * 100) : 100;
  let bonus = 0;
  if (meta.lesson) { bonus = 5 + (acc >= 90 ? 5 : 0); const L = S.lessons[meta.lesson] || (S.lessons[meta.lesson] = {n: 0, best: 0}); L.n++; L.best = Math.max(L.best || 0, acc); L.last = Date.now(); L.acc = acc; d.lessons = (d.lessons || 0) + 1; }
  else d.reviews = (d.reviews || 0) + 1;
  const xp = P.xp + bonus;
  const before = d.sec || 0;
  d.xp = (d.xp || 0) + xp; d.sec = before + sec; d.right = (d.right || 0) + P.right; d.wrong = (d.wrong || 0) + P.wrong;
  d.speak = [(d.speak || [0, 0])[0] + P.speak[0], (d.speak || [0, 0])[1] + P.speak[1]];
  let fresh = 0;
  P.seen.forEach(id => { if (!ITEM.has(id)) return; if (!S.srs[id]) fresh++; srsApply(id, !P.miss.has(id)); });
  d.words = (d.words || 0) + fresh;
  touch(); Sync.flushSoon();
  const goalHit = before < goalSec() && d.sec >= goalSec();
  const mm = Math.floor(sec / 60), ss = sec % 60;
  const cheer = acc >= 95 ? "Идеально!" : acc >= 80 ? "Отличная работа!" : acc >= 60 ? "Хорошо!" : "Сделано! Ошибки повторим";
  LS_EL().innerHTML = `<div class="ls-body"><div class="finish">
    <span class="hz">${acc >= 80 ? "好!" : "加油"}</span>
    <h2>${esc(cheer)}</h2>
    <p class="muted">${esc(meta.title || "")}</p>
    <div class="tiles3"><div class="stat xp"><b>+${xp}</b><span>очков</span></div><div class="stat acc"><b>${acc}%</b><span>точность</span></div><div class="stat time"><b>${mm}:${String(ss).padStart(2, "0")}</b><span>время</span></div></div>
    ${goalHit ? `<div class="warnbox" style="background:var(--good-bg)">Цель дня выполнена: ${S.settings.goal} минут. Серия — ${streak()} ${plural(streak(), "день", "дня", "дней")} подряд!</div>` : `<p class="muted small">Сегодня ${Math.floor(d.sec / 60)} из ${S.settings.goal} минут</p>`}
    ${fresh ? `<p class="muted small">Новых слов: ${fresh}. Они придут на повторение завтра.</p>` : ""}
  </div></div><div class="ls-foot"><button class="btn primary" id="fin">Продолжить</button></div>`;
  sfx(true);
  $("#fin").onclick = () => closePlayer();
}

/* ---------- нижняя шторка ---------- */
function openSheet(html, acts){
  const w = $("#sheet"); w.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="handle"></div>${html}</div>`; w.hidden = false;
  w.onclick = e => { if (e.target === w) closeSheet(); };
  $$("[data-act]", w).forEach(b => b.onclick = () => (acts[b.dataset.act] || (() => {}))(b));
}
function closeSheet(){ const w = $("#sheet"); w.hidden = true; w.innerHTML = ""; }
function wordRows(ids){
  return `<div class="words">${ids.map(id => { const c = ITEM.get(id); if (!c) return ""; return `<button class="word" data-play="${id}"><span class="playmini">${I.play}</span><span><span class="hz">${esc(c.hz)}</span> ${py(c.py)}<br><span class="ru">${esc(c.ru || "")}</span></span></button>`; }).join("")}</div>`;
}
function bindPlays(root){ $$("[data-play]", root).forEach(b => b.onclick = () => say(ITEM.get(b.dataset.play), {btn: $(".playmini", b)})); }
function lessonSheet(l){
  const u = UNIT_OF.get(l.id), done = lessonDone(l), st = S.lessons[l.id] || {};
  const kindTxt = {words: "Новые слова", phrases: "Фразы", review: "Повторение раздела", tones: "Тоны", pairs: "Пары тонов", prices: "Цены на слух"}[l.kind];
  const list = l.kind === "review" ? `<p class="muted" style="margin:10px 0 14px">${l.items.length} ${plural(l.items.length, "слово", "слова", "слов")} раздела, сначала те, где были ошибки.</p>` : wordRows(l.items);
  openSheet(`<div class="eyebrow">${esc(u.name)}${u.title ? ` · <span class="hz">${esc(u.title)}</span>` : ""}</div>
    <h2 style="margin-top:4px">${esc(l.title)}</h2>
    <p class="muted small" style="margin-top:4px">${esc(kindTxt)}${done ? ` · пройдено ${st.n} ${plural(st.n, "раз", "раза", "раз")}, лучший результат ${st.best}%` : ""}</p>
    ${list}
    ${u.book ? `<p class="small muted" style="margin-bottom:12px">Слова взяты из списков учеников в интернете. Пришли Claude фото страницы «生词» — сверит с твоей книгой.</p>` : ""}
    <button class="btn primary block" data-act="go">${done ? "Пройти ещё раз" : "Начать"}</button>`,
    {go: () => startLesson(l)});
  bindPlays($("#sheet"));
}
function startLesson(l){
  const u = UNIT_OF.get(l.id);
  const q = genLesson(l);
  openPlayer(q, {lesson: l.id, title: u.name + " · " + l.title});
  autoplay();
}

/* ---------- экраны ---------- */
let tab = "learn";
const view = () => $("#view");
function ringSVG(frac){
  const r = 8.5, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac));
  return `<svg class="ring" viewBox="0 0 22 22" aria-hidden="true"><circle class="bgc" cx="11" cy="11" r="${r}"/><circle class="fg" cx="11" cy="11" r="${r}" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}"/></svg>`;
}
function renderTop(title){
  const s = streak(), d = S.days[dayKey()] || {}, min = Math.floor((d.sec || 0) / 60);
  $("#top").innerHTML = `<h1>${esc(title)}</h1>
    <span class="pillstat ${s ? "fire" : "off"}" aria-label="Серия ${s} ${plural(s, "день", "дня", "дней")}">${I.fire}${s}</span>
    <span class="pillstat" aria-label="Сегодня ${min} из ${S.settings.goal} минут">${ringSVG((d.sec || 0) / goalSec())}${min}<span class="muted" style="font-weight:600">/${S.settings.goal}</span></span>`;
}
function render(){
  $$("#tabs button").forEach(b => b.setAttribute("aria-current", b.dataset.tab === tab ? "page" : "false"));
  const due = dueIds().length, bd = $("#dueBadge"); bd.hidden = !due; bd.textContent = due > 99 ? "99+" : due;
  ({learn: renderLearn, review: renderReview, tones: renderTones, me: renderMe})[tab]();
}
function noteCard(){
  const n = S.notes; if (!n || !n.text) return "";
  return `<div class="note"><div class="eyebrow">Claude · ${esc(n.date || "")}</div><div style="white-space:pre-line">${esc(n.text)}</div></div>`;
}
function renderLearn(){
  renderTop("Учиться");
  const track = S.ui.track, cur = currentLesson(track), curUnit = cur && UNIT_OF.get(cur.id);
  const y = S.days[dayKey(Date.now() - DAY)], t = S.days[dayKey()];
  const hasHistory = Object.keys(S.days).some(k => dayActive(S.days[k]));
  let warn = "";
  if (hasHistory && !dayActive(y) && !dayActive(t)) warn = `<div class="warnbox">Вчера пропуск. Сегодня хотя бы 10 минут — два дня подряд не пропускаем.</div>`;
  const install = isIOS && !standalone() && !S.ui.installHidden ? `<div class="card install">${I.share}<div class="grow"><b>Поставь на экран «Домой»</b><p class="small muted" style="margin-top:4px">Внизу Safari нажми «Поделиться», потом «На экран „Домой"». Откроется как приложение и будет работать без интернета.</p></div><button class="ls-close" data-hide="install" aria-label="Скрыть">${I.close}</button></div>` : "";
  const units = unitsOf(track);
  const openSet = S.ui.open || {};
  const html = units.map((u, ui) => {
    const n = u.lessons.length, dn = u.lessons.filter(lessonDone).length, isOpen = openSet[u.id] != null ? openSet[u.id] : (curUnit ? curUnit.id === u.id : ui === 0);
    const no = track === "book" ? u.name.replace(/\D/g, "") : String(ui + 1);
    const offs = [0, 44, 62, 44, 0, -44, -62, -44];
    return `<section class="unit ${isOpen ? "open" : ""} ${dn === n ? "done" : ""}" data-unit="${u.id}">
      <button class="unit-head" data-toggle="${u.id}" aria-expanded="${isOpen}">
        <span class="unit-no">${dn === n ? stroke(I.check).replace("<svg ", '<svg width="24" height="24" ') : esc(no)}</span>
        <span class="grow"><span class="unit-name">${esc(u.name)}</span><span class="unit-sub" style="display:block">${u.title ? `<span class="hz">${esc(u.title)}</span> · ` : ""}${dn} из ${n}</span><span class="bar"><i style="width:${Math.round(dn / n * 100)}%"></i></span></span>
        ${I.chev}
      </button>
      ${isOpen ? `<div class="path">${u.lessons.map((l, k) => {
        const done = lessonDone(l), isCur = cur && cur.id === l.id;
        const icon = l.kind === "review" ? stroke(I.star) : done ? stroke(I.check) : String(k + 1);
        return `<div class="node ${done ? "done" : ""} ${isCur ? "cur" : ""}" style="transform:translateX(${offs[k % offs.length]}px)">
          ${isCur ? `<span class="startflag">${done ? "ЕЩЁ РАЗ" : "НАЧАТЬ"}</span>` : ""}
          <button class="node-btn" data-lesson="${l.id}" aria-label="${esc(l.title)}">${icon}</button>
          <span class="node-lab">${esc(l.title)}</span></div>`;
      }).join("")}</div>` : ""}
    </section>`;
  }).join("");
  view().innerHTML = `<div class="stack">
    <div class="seg" role="group" aria-label="Ветка курса">${TRACKS.map(tr => `<button data-track="${tr.id}" aria-pressed="${tr.id === track}">${esc(tr.name)}</button>`).join("")}</div>
    ${install}${warn}${noteCard()}
    ${cur ? `<button class="btn primary block cont" data-lesson="${cur.id}"><span>${lessonDone(cur) ? "Повторить" : "Продолжить"}</span><small>${esc(UNIT_OF.get(cur.id).name)} · ${esc(cur.title)}</small></button>` : `<div class="card">Вся ветка пройдена. Повторяй слова во вкладке «Повторить».</div>`}
  </div>${html}<div style="height:12px"></div>`;
  $$("[data-track]").forEach(b => b.onclick = () => { S.ui.track = b.dataset.track; save(); renderLearn(); view().scrollTop = 0; });
  $$("[data-toggle]").forEach(b => b.onclick = () => { const id = b.dataset.toggle, sec = b.closest(".unit"); S.ui.open = S.ui.open || {}; S.ui.open[id] = !sec.classList.contains("open"); save(); renderLearn(); });
  $$("[data-lesson]").forEach(b => b.onclick = () => lessonSheet(LESSON.get(b.dataset.lesson)));
  $$("[data-hide]").forEach(b => b.onclick = () => { S.ui.installHidden = true; save(); renderLearn(); });
}
function renderReview(){
  renderTop("Повторить");
  const due = dueIds(), seen = seenCount(), learned = learnedCount();
  const weakIds = Object.keys(S.srs).filter(id => ITEM.has(id) && S.srs[id].x > 0).sort((a, b) => weak(b) - weak(a)).slice(0, 8);
  view().innerHTML = `<div class="stack">
    <div class="card hero"><div class="bigno" style="color:${due.length ? "var(--accent)" : "var(--good)"}">${due.length}</div>
      <div class="grow"><b>${due.length ? "слов ждут повторения" : "Всё повторено"}</b><p class="small muted">${due.length ? "Повторение — это то, что держит слова в памяти." : seen ? "Новые придут завтра. Можно пройти новый урок." : "Пройди первый урок — слова появятся здесь."}</p></div></div>
    ${due.length ? `<button class="btn primary block" id="goRev">Повторить ${Math.min(due.length, 15)} ${plural(Math.min(due.length, 15), "слово", "слова", "слов")}</button>` : seen >= 4 ? `<button class="btn block" id="goWeak">Потренировать трудные слова</button>` : ""}
    <div class="tiles3"><div class="stat"><b>${seen}</b><span>встречено</span></div><div class="stat acc"><b>${learned}</b><span>выучено</span></div><div class="stat xp"><b>${totalXp()}</b><span>очков</span></div></div>
    ${weakIds.length ? `<div class="sec-title">Трудные слова</div><div class="card" style="padding:4px 16px">${wordRows(weakIds)}</div>` : ""}
    ${seen ? `<button class="btn ghost block" id="allWords">Все слова, что ты прошёл (${seen})</button>` : ""}
  </div>`;
  const gr = $("#goRev"); if (gr) gr.onclick = () => { openPlayer(genReview(due.slice(0, 15)), {title: "Повторение"}); autoplay(); };
  const gw = $("#goWeak"); if (gw) gw.onclick = () => { const ids = Object.keys(S.srs).filter(id => ITEM.has(id)).sort((a, b) => weak(b) - weak(a)).slice(0, 10); openPlayer(genReview(shuffle(ids)), {title: "Трудные слова"}); autoplay(); };
  const aw = $("#allWords"); if (aw) aw.onclick = () => { const ids = Object.keys(S.srs).filter(id => ITEM.has(id) && ITEM.get(id).deck !== "prices"); openSheet(`<h2>Пройденные слова</h2>${wordRows(ids)}`, {}); bindPlays($("#sheet")); };
  bindPlays(view());
}
function renderTones(){
  renderTop("Тоны");
  const ma = C.tones[0] ? C.tones[0].items : [];
  const combos = [];
  [1, 2, 3, 4].forEach(a => [1, 2, 3, 4, 0].forEach(b => { const c = C.cards.find(x => x.deck === "pairs" && x.tones && x.tones[0] === a && x.tones[1] === b); if (c) combos.push(c); }));
  view().innerHTML = `<div class="stack">
    <div class="introtones">${ma.map(it => `<button class="opt s${it.t}" data-say="${it.id}">${glyph(it.t)}<span class="hz">${esc(it.hz)}</span>${py(it.py)}</button>`).join("")}</div>
    <div class="modes">
      <button class="mode" data-drill="tone"><span class="ic">${I.ear}</span><span><b>Какой тон?</b><br><span>10 слогов на слух</span></span></button>
      <button class="mode" data-drill="pair"><span class="ic">${I.pairs}</span><span><b>Пары тонов</b><br><span>10 слов из двух слогов</span></span></button>
      <button class="mode" data-drill="speak"><span class="ic">${I.speak}</span><span><b>Скажи сам</b><br><span>микрофон и мелодия голоса</span></span></button>
      <button class="mode" data-drill="price"><span class="ic">${I.coin}</span><span><b>Цены на слух</b><br><span>как на рынке</span></span></button>
    </div>
    <div class="sec-title">20 пар — нажми и послушай</div>
    <div class="combos">${combos.map(c => `<button class="opt" data-play="${c.id}"><div class="combo">${c.tones.map(t => `<span style="color:var(--t${t})">${glyph(t)}</span>`).join("")}</div><span class="hz">${esc(c.hz)}</span>${py(c.py)}</button>`).join("")}</div>
    <p class="small muted">Строка — тон первого слога, столбец — второго. Последний столбец — лёгкий тон. 3 + 3 произносится как 2 + 3.</p>
  </div>`;
  $$("[data-say]").forEach(b => b.onclick = () => say(ITEM.get(b.dataset.say), {btn: b}));
  $$("[data-play]").forEach(b => b.onclick = () => say(ITEM.get(b.dataset.play), {btn: b}));
  $$("[data-drill]").forEach(b => b.onclick = () => {
    const k = b.dataset.drill;
    if (k === "speak" && !speakOn()) { S.speakOffUntil = 0; save(); }
    openPlayer(genDrill(k), {title: {tone: "Какой тон?", pair: "Пары тонов", speak: "Скажи сам", price: "Цены на слух"}[k]}); autoplay();
  });
}
function renderMe(){
  renderTop("Я");
  const s = streak(), d = S.days[dayKey()] || {};
  const WD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const now = new Date(Date.now() - 4 * 3600000), dow = (now.getDay() + 6) % 7;
  const week = WD.map((w, k) => { const t = Date.now() - (dow - k) * DAY, dd = S.days[dayKey(t)] || {}, full = (dd.sec || 0) >= goalSec(), part = dayActive(dd); return `<div><i class="${full ? "full" : part ? "part" : ""} ${k === dow ? "today" : ""}">${full ? I.check : ""}</i>${w}</div>`; }).join("");
  const sw = (k, on) => `<button class="switch" role="switch" aria-checked="${!!on}" data-set="${k}" aria-label="${k}"></button>`;
  const sc = Sync.cfg(), env = S.env || {};
  view().innerHTML = `<div class="stack">
    <div class="card"><div class="hero"><span class="pillstat fire" style="height:auto;padding:10px 14px;font-size:22px">${I.fire}${s}</span>
      <div class="grow"><b>${s ? `${s} ${plural(s, "день", "дня", "дней")} подряд` : "Серия начнётся сегодня"}</b><p class="small muted">Сегодня ${Math.floor((d.sec || 0) / 60)} из ${S.settings.goal} мин · ${d.xp || 0} очков</p></div></div>
      <div class="week" style="margin-top:14px">${week}</div></div>
    ${noteCard()}
    <div class="sec-title">Цель на день</div>
    <div class="seg" role="group" aria-label="Цель на день">${[10, 20, 30, 45].map(g => `<button data-goal="${g}" aria-pressed="${S.settings.goal === g}">${g} мин</button>`).join("")}</div>
    <p class="small muted" style="margin:0 4px">10 минут — минимум в тяжёлый день. Главное — не пропускать два дня подряд.</p>
    <div class="sec-title">Настройки</div>
    <div class="card" style="padding:4px 16px">
      <div class="setrow"><span class="lab">Пиньинь в вариантах ответа<small>Выключи, чтобы учиться читать иероглифы</small></span>${sw("pinyin", S.settings.pinyin)}</div>
      <div class="setrow"><span class="lab">Голос помедленнее</span>${sw("slowVoice", S.settings.slowVoice)}</div>
      <div class="setrow"><span class="lab">Звуки «верно / неверно»</span>${sw("sfx", S.settings.sfx)}</div>
      <div class="setrow"><span class="lab">Задания «скажи вслух»</span>${sw("speak", S.settings.speak)}</div>
      <div class="setrow"><span class="lab">Проверка слов по речи<small>Распознавание речи iPhone. Если мешает записи — выключи</small></span>${sw("recog", S.settings.recog)}</div>
    </div>
    <div class="sec-title">Микрофон</div>
    <div class="card stack">
      <p class="small">${env.t ? `Последняя проверка ${esc(dayKey(env.t))}, ${hhmm(env.t)}:` : "Ещё не проверяли. Нажми и скажи «你好»."}</p>
      ${env.t ? `<div class="check-list">
        <div class="${env.mic ? "ok-line" : "no-line"}">${env.mic ? "✓" : "✗"} Микрофон${env.micErr ? ` (${esc(env.micErr)})` : ""}</div>
        <div class="${env.rec && env.mel ? "ok-line" : "no-line"}">${env.rec && env.mel ? "✓" : "✗"} Мелодия голоса</div>
        <div class="${env.sr ? "ok-line" : "no-line"}">${env.sr ? "✓" : "✗"} Проверка слов${env.srErr && !env.sr ? ` (${esc(env.srErr)})` : ""}</div>
        <div class="${env.standalone ? "ok-line" : "muted"}">${env.standalone ? "✓ Открыто с экрана «Домой»" : "Открыто в Safari, не с экрана «Домой»"}</div></div>` : ""}
      <button class="btn block" id="micTest">${I.mic.replace("<svg ", '<svg fill="none" stroke="currentColor" stroke-width="2" ')}Проверить микрофон</button>
    </div>
    <div class="sec-title">Claude видит прогресс</div>
    <div class="card stack" id="syncCard">${syncCardHTML(sc)}</div>
    <div class="sec-title">Приложение</div>
    <div class="card stack">
      <p class="small muted">Версия ${esc(VERSION)}${standalone() ? "" : " · открыто в браузере"}</p>
      <button class="btn block" id="upd">Проверить обновление</button>
      <button class="btn ghost block" id="dl">Скачать весь звук для работы без интернета</button>
    </div>
  </div>`;
  $$("[data-goal]").forEach(b => b.onclick = () => { S.settings.goal = +b.dataset.goal; touch(); renderMe(); });
  $$("[data-set]").forEach(b => b.onclick = () => { const k = b.dataset.set; S.settings[k] = !S.settings[k]; if (k === "speak" && S.settings.speak) S.speakOffUntil = 0; touch(); b.setAttribute("aria-checked", S.settings[k]); });
  $("#micTest").onclick = () => { const id = (C.cards.find(c => c.hz === "你好") || C.cards[0]).id; openPlayer([{type: "speak", id}], {title: "Проверка микрофона"}); autoplay(); };
  $("#upd").onclick = async () => { try { const r = await navigator.serviceWorker.getRegistration(); if (r) { await r.update(); toast(r.installing || r.waiting ? "Скачиваю новую версию…" : "Стоит последняя версия"); } else toast("Обновления работают только с сайта"); } catch (e) { toast("Нет сети — проверю позже"); } };
  $("#dl").onclick = () => { if (navigator.serviceWorker && navigator.serviceWorker.controller) { navigator.serviceWorker.controller.postMessage("cache-audio"); toast("Качаю звук в фоне, ~6 МБ"); } else toast("Работает только с сайта"); };
  bindSyncCard();
}

/* ---------- синхронизация с закрытым хранилищем GitHub ---------- */
const SYNC_LS = "zh-sync";
const DEFAULT_REPO = "unclenesh23-debug/chinese-progress";
// страница GitHub с уже заполненным ключом: имя, срок, право «Contents: запись»; хранилище хозяин выбирает сам
const TOKEN_URL = "https://github.com/settings/personal-access-tokens/new?name=chinese-phone&description=" + encodeURIComponent("Приложение «Китайский»: прогресс для Claude") + "&target_name=unclenesh23-debug&expires_in=366&contents=write";
function b64enc(str){ const bytes = new TextEncoder().encode(str); let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); }
function b64dec(b64){ const bin = atob(String(b64).replace(/\s/g, "")); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); return new TextDecoder().decode(bytes); }
const Sync = {
  sha: null, notesSha: null, timer: 0, busy: false, last: 0, err: "",
  cfg(){ try { return JSON.parse(localStorage.getItem(SYNC_LS) || "null"); } catch (e) { return null; } },
  setCfg(c){ try { if (c) localStorage.setItem(SYNC_LS, JSON.stringify(c)); else localStorage.removeItem(SYNC_LS); } catch (e) {} },
  async api(path, opts = {}){
    const c = this.cfg(); if (!c) throw new Error("off");
    const r = await fetch("https://api.github.com/repos/" + c.repo + "/contents/" + path, Object.assign({cache: "no-store"}, opts, {headers: {"Authorization": "Bearer " + c.token, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json"}}));
    return r;
  },
  snapshot(){ return {v: 1, app: VERSION, updated: S.updated, env: S.env, settings: S.settings, lessons: S.lessons, days: S.days, srs: S.srs}; },
  merge(r){
    if (!r || typeof r !== "object") return;
    for (const id in r.srs || {}) { const a = S.srs[id], b = r.srs[id]; if (!a || (b.n || 0) > (a.n || 0)) S.srs[id] = b; }
    for (const id in r.lessons || {}) { const a = S.lessons[id], b = r.lessons[id]; if (!a) S.lessons[id] = b; else { a.n = Math.max(a.n || 0, b.n || 0); a.best = Math.max(a.best || 0, b.best || 0); } }
    for (const k in r.days || {}) { const a = S.days[k], b = r.days[k]; if (!a) { S.days[k] = b; continue; } for (const f of ["xp", "sec", "lessons", "reviews", "right", "wrong", "words"]) a[f] = Math.max(a[f] || 0, b[f] || 0); }
  },
  async pull(){
    if (!this.cfg() || this.busy || !navigator.onLine) return;
    this.busy = true;
    try {
      const r = await this.api("progress.json");
      if (r.ok) { const j = await r.json(); this.sha = j.sha; this.merge(JSON.parse(b64dec(j.content))); save(); }
      else if (r.status === 404) this.sha = null;
      else throw new Error("HTTP " + r.status);
      const n = await this.api("notes.json");
      if (n.ok) { const j = await n.json(); if (j.sha !== this.notesSha) { this.notesSha = j.sha; S.notes = JSON.parse(b64dec(j.content)); save(); if (!P) render(); } }
      this.err = "";
    } catch (e) { this.err = String(e.message || e); }
    this.busy = false;
  },
  async push(retry){
    if (!this.cfg() || !navigator.onLine) return false;
    if (this.busy) { this.schedule(); return false; }
    this.busy = true;
    try {
      if (this.sha === null && !retry) { const g = await this.api("progress.json"); if (g.ok) { const j = await g.json(); this.sha = j.sha; this.merge(JSON.parse(b64dec(j.content))); } }
      const body = {message: "Прогресс " + dayKey() + " " + hhmm(Date.now()), content: b64enc(JSON.stringify(this.snapshot(), null, 1))};
      if (this.sha) body.sha = this.sha;
      const r = await this.api("progress.json", {method: "PUT", body: JSON.stringify(body)});
      if (r.status === 409 || r.status === 422) { this.busy = false; this.sha = null; if (!retry) return this.push(true); throw new Error("конфликт версий"); }
      if (!r.ok) throw new Error(r.status === 401 ? "ключ не подходит" : r.status === 404 ? "нет доступа к хранилищу" : "HTTP " + r.status);
      const j = await r.json(); this.sha = j.content.sha; this.last = Date.now(); this.err = "";
      try { localStorage.setItem(SYNC_LS + "-last", String(this.last)); } catch (e) {}
    } catch (e) { this.err = String(e.message || e); this.busy = false; this.updateCard(); return false; }
    this.busy = false; this.updateCard(); return true;
  },
  schedule(){ if (!this.cfg()) return; clearTimeout(this.timer); this.timer = setTimeout(() => this.push(), 5000); },
  flushSoon(){ if (!this.cfg()) return; clearTimeout(this.timer); this.timer = setTimeout(() => this.push(), 300); },
  lastTime(){ if (this.last) return this.last; try { return +localStorage.getItem(SYNC_LS + "-last") || 0; } catch (e) { return 0; } },
  updateCard(){ const el = $("#syncCard"); if (el) { el.innerHTML = syncCardHTML(this.cfg()); bindSyncCard(); } }
};
window.addEventListener("online", () => Sync.flushSoon());
function syncCardHTML(c){
  if (!c) return `<p class="small">Подключи закрытое хранилище — Claude будет видеть уроки, ошибки и серию и писать тебе план. Один раз, 3 минуты.</p>
    <a class="btn block" href="${TOKEN_URL}" target="_blank" rel="noopener">1. Создать ключ на GitHub</a>
    <p class="small muted">Там выбери хранилище <b>chinese-progress</b>, проверь «Contents — Read and write», нажми «Generate token» и скопируй ключ.</p>
    <input class="field" id="tok" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="2. Вставь ключ (github_pat_…)">
    <input class="field" id="repo" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(DEFAULT_REPO)}" aria-label="Хранилище">
    <button class="btn primary block" id="conn">3. Подключить</button>`;
  const t = Sync.lastTime();
  return `<div class="${Sync.err ? "no-line" : "ok-line"}">${Sync.err ? "✗ " + esc(Sync.err) : "✓ Подключено"}</div>
    <p class="small muted">${Sync.busy ? "Связываюсь с хранилищем…" : t ? "Отправлено: " + (dayKey(t) === dayKey() ? "сегодня" : dayKey(t)) + " в " + hhmm(t) : "Ещё не отправлялось"} · ${esc(c.repo)}</p>
    <div class="row"><button class="btn grow" id="pushNow">Отправить сейчас</button><button class="btn ghost" id="disc">Отключить</button></div>`;
}
function bindSyncCard(){
  const conn = $("#conn");
  if (conn) conn.onclick = async () => {
    const token = $("#tok").value.trim(), repo = $("#repo").value.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
    if (!token || !/^[\w.-]+\/[\w.-]+$/.test(repo)) { toast("Вставь ключ и название хранилища"); return; }
    conn.disabled = true; conn.textContent = "Проверяю…";
    try {
      const r = await fetch("https://api.github.com/repos/" + repo, {cache: "no-store", headers: {"Authorization": "Bearer " + token, "Accept": "application/vnd.github+json"}});
      if (!r.ok) throw new Error(r.status === 401 ? "Ключ не подходит" : r.status === 404 ? "Хранилище не найдено или ключ к нему без доступа" : "Ошибка " + r.status);
      const j = await r.json();
      if (!j.private) { toast("Хранилище открытое — нужно закрытое, там личный прогресс", 4000); throw new Error("не закрытое"); }
      Sync.setCfg({repo, token}); Sync.sha = null;
      await Sync.pull(); const ok = await Sync.push();
      toast(ok ? "Готово! Claude видит прогресс" : "Подключено, отправлю позже", 3000);
    } catch (e) { toast(String(e.message || e), 3500); }
    Sync.updateCard();
  };
  const pn = $("#pushNow"); if (pn) pn.onclick = async () => { pn.disabled = true; const ok = await Sync.push(); toast(ok ? "Отправлено" : "Не вышло: " + Sync.err); };
  const dc = $("#disc"); if (dc) dc.onclick = () => openSheet(`<h2>Отключить?</h2><p class="muted" style="margin:8px 0 16px">Ключ удалится с телефона. Прогресс на телефоне останется, но Claude перестанет его видеть.</p><div class="stack"><button class="btn primary block" data-act="keep">Оставить</button><button class="btn ghost block" data-act="off">Отключить</button></div>`, {keep: closeSheet, off: () => { Sync.setCfg(null); closeSheet(); Sync.updateCard(); }});
}

/* ---------- запуск ---------- */
$$("#tabs button").forEach(b => b.onclick = () => { if (tab === b.dataset.tab) { view().scrollTop = 0; return; } tab = b.dataset.tab; stopAudio(); render(); view().scrollTop = 0; });
async function boot(){
  try {
    const r = await fetch("content.json?v=" + VERSION);
    C = await r.json();
  } catch (e) { view().innerHTML = `<div class="card">Не загрузилось. Проверь интернет и открой ещё раз.</div>`; return; }
  indexContent();
  render();
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    const hadCtl = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register("sw.js").then(reg => {
      // когда звук ещё не скачан — докачать в фоне
      setTimeout(() => { if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage("cache-audio"); }, 8000);
      setInterval(() => reg.update().catch(() => {}), 30 * MIN);
    }).catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadCtl || reloaded) return; reloaded = true;
      const go = () => { if (P) return setTimeout(go, 3000); location.reload(); };
      toast("Приложение обновилось"); setTimeout(go, 1200);
    });
  }
  Sync.pull().then(() => { if (Sync.cfg() && S.updated > Sync.lastTime()) Sync.schedule(); });
}
boot();
// для проверки из консоли
window.__zh = {S, C: () => C, P: () => P, Sync, genLesson, LESSON, ITEM, scoreHeard, loadHz};
})();
