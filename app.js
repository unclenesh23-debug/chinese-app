/* Китайский v2 — собрано app-pwa/v2/build.py, исходник app-pwa/v2/src/js/ */
(() => {
"use strict";
/* ===== core: константы, мелочи, пиньинь, журнал (IndexedDB), повторение (ТЗ 4.4), план дня (ТЗ 2.2) ===== */
const VERSION = "2e1ccd9278";
/* Громкость речи после записи голоса — ОДНА константа, ведущий ставит победителя пробы 2:
   "modes"  — audioSession "play-and-record" до записи и "playback" после (пауза 0,5 с), речь — тем же <audio>;
   "stream" — речь всегда через Web Audio → MediaStream → второй <audio>;
   "gain2"  — после первой записи речь через Web Audio с усилением ×2 и ограничителем;
   "mr"     — запись через MediaRecorder без AudioContext, пауза 2,5 с, после записи — новый плеер;
   "none"   — ничего особого. */
const AFTER_REC = "modes";
const MIN = 60000, DAY_MS = 86400000;
const STEPS = [1, 3, 7, 14, 30, 60, 120];
const PARTS = { warmup: "Разминка", review: "Повторение", check: "Проверка урока", new: "Новое", tones: "Тоны", recall: "Скажи по памяти" };
const PART_MS = { warmup: 60e3, review: 300e3, check: 180e3, new: 240e3, tones: 180e3, recall: 120e3 };
const EST = { "4.8": 8e3, "4.3": 10e3, "4.4": 8e3, "4.1": 30e3, "4.2": 12e3, "4.9": 25e3 };
const SAY_REVIEW_MAX = 4, REVIEW_MAX = 30;

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k === "html") el.innerHTML = v;
    else if (k === "test") el.setAttribute("data-test", v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of kids.flat(9)) if (c != null && c !== false) el.append(c.nodeType ? c : String(c));
  return el;
}
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pad2 = n => (n < 10 ? "0" : "") + n;
const errText = e => String((e && (e.name ? e.name + ": " : "") + (e.message || "")) || e).slice(0, 200);
function dayNum(t) { const d = new Date(t == null ? Date.now() : t); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS); }
function dayStr(n) { const d = new Date(n * DAY_MS); return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth() + 1) + "-" + pad2(d.getUTCDate()); }
function hhmm(t) { const d = new Date(t); return pad2(d.getHours()) + ":" + pad2(d.getMinutes()); }
function whenText(t) {
  const dn = dayNum() - dayNum(t), s = dayStr(dayNum(t));
  return (dn === 0 ? "сегодня" : dn === 1 ? "вчера" : s.slice(8) + "." + s.slice(5, 7)) + ", " + hhmm(t);
}
function plural(n, a, b, c) { const m = n % 10, mm = n % 100; return m === 1 && mm !== 11 ? a : m >= 2 && m <= 4 && (mm < 10 || mm >= 20) ? b : c; }
function hashNum(s) { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const rid = () => Math.random().toString(36).slice(2, 10);
const DATE_RU = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const WEEK_RU = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];

/* ---------- пиньинь и тоны ---------- */
const VOW = "aeiouüvāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ";
const SYL = new RegExp("(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?[" + VOW + "]+(?:ngr?(?![" + VOW + "])|nr?(?![" + VOW + "])|r(?![" + VOW + "]))?", "gi");
const TONE = {};
"āēīōūǖ".split("").forEach(c => TONE[c] = 1); "áéíóúǘ".split("").forEach(c => TONE[c] = 2);
"ǎěǐǒǔǚ".split("").forEach(c => TONE[c] = 3); "àèìòùǜ".split("").forEach(c => TONE[c] = 4);
const sylTone = s => { for (const c of s.toLowerCase()) if (TONE[c]) return TONE[c]; return 0; };
const baseOf = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ü|v/g, "u");
function sylls(py) { return (String(py || "").normalize("NFC").match(SYL) || []).map(s => ({ s, b: baseOf(s), t: sylTone(s) })); }
const tonesOf = py => sylls(py).map(x => x.t);
function pyHTML(py) {
  let out = "", last = 0; const text = String(py || "").normalize("NFC");
  text.replace(SYL, (m, i) => { out += esc(text.slice(last, i)) + '<span class="t' + sylTone(m) + '">' + esc(m) + "</span>"; last = i + m.length; return m; });
  return out + esc(text.slice(last));
}
const CONT = { 1: "4,6 20,6", 2: "4,17 20,5", 3: "4,8 9,18 15,18 20,8", 4: "4,5 20,18" };
function glyph(t) {
  return t ? '<svg class="tg" viewBox="0 0 24 24" aria-hidden="true"><polyline points="' + CONT[t] + '"/></svg>'
    : '<svg class="tg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="3" fill="currentColor"/></svg>';
}
const toneName = t => t ? t + "-й" : "лёгкий";
function tonesHTML(arr) { return arr.map(t => '<span class="tn t' + t + '">' + glyph(t) + "<b>" + toneName(t) + "</b></span>").join('<span class="plus">+</span>'); }

/* ---------- содержимое (data/words.json) ---------- */
let C = null, LESSONS = [], BY_LESSON = {}, PAIRS = [];
const W = id => C && C.w[id];
function indexContent(data) {
  C = data; LESSONS = []; BY_LESSON = {};
  for (const b of C.books) for (const l of b.lessons) LESSONS.push(Object.assign({ book: b.id, bookTitle: b.short || b.title }, l));
  for (const id in C.w) (BY_LESSON[C.w[id].l] = BY_LESSON[C.w[id].l] || []).push(id);
  // «тот же слог — другой тон»: слова с одинаковым пиньинем без тонов и разными тонами
  const groups = {};
  for (const id in C.w) {
    const w = C.w[id]; if (w.k === "q" || !w.s || !Object.keys(w.s).length) continue;
    const ss = sylls(w.py); if (!ss.length || ss.length > 2) continue;
    const key = ss.map(x => x.b).join(" ");
    (groups[key] = groups[key] || []).push(id);
  }
  PAIRS = [];
  for (const k in groups) {
    const g = groups[k];
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
      const a = W(g[i]), b = W(g[j]);
      if (tonesOf(a.py).join() !== tonesOf(b.py).join() && a.ru !== b.ru) PAIRS.push([g[i], g[j]]);
    }
  }
}
const lessonOf = lid => LESSONS.find(l => l.id === lid);
const lessonWords = lid => BY_LESSON[lid] || [];
const isActive = id => W(id) && W(id).k === "a";
const bookLessons = bid => LESSONS.filter(l => l.book === bid);
function hasClip(id, voice) { const w = W(id) || (C && C.x[id]); return !!(w && w.s && (voice ? w.s[voice] : (w.s.f || w.s.m))); }
function clipOf(id, voice) {
  const w = W(id) || (C && C.x[id]); if (!w || !w.s) return null;
  return voice ? w.s[voice] || null : w.s.f || w.s.m || null;
}

/* ---------- журнал и состояние: IndexedDB «zh2» (log — каждый ответ сразу, kv — снимок состояния и занятие) ---------- */
const DB = {
  db: null, mem: null,
  open() {
    return new Promise(ok => {
      let done = false; const fin = v => { if (!done) { done = true; ok(v); } };
      try {
        const r = indexedDB.open("zh2", 1);
        r.onupgradeneeded = () => { const d = r.result; d.createObjectStore("log", { autoIncrement: true }); d.createObjectStore("kv"); };
        r.onsuccess = () => { DB.db = r.result; DB.db.onversionchange = () => { try { DB.db.close(); } catch (e) {} }; fin(true); };
        r.onerror = () => fin(false); // не уходим молча «в память»: запуск покажет «Память телефона не открылась»
        setTimeout(() => fin(false), 4000);
      } catch (e) { fin(false); }
    });
  },
  reopen() { // запись не прошла (iOS: «соединение с базой потеряно» после долгого фона) — новое соединение
    return new Promise((ok, bad) => {
      try { if (DB.db) DB.db.close(); } catch (e) {}
      try {
        const r = indexedDB.open("zh2", 1);
        r.onsuccess = () => { DB.db = r.result; ok(); };
        r.onerror = () => bad(r.error);
        setTimeout(() => bad(new Error("база не ответила за 4 с")), 4000);
      } catch (e) { bad(e); }
    });
  },
  get(key) {
    if (DB.mem) return Promise.resolve(DB.mem.kv[key]);
    return new Promise((ok, bad) => { const r = DB.db.transaction("kv").objectStore("kv").get(key); r.onsuccess = () => ok(r.result); r.onerror = () => bad(r.error); });
  },
  /* одной транзакцией: события в журнал + снимки (st, sess). Ответ не потеряется даже при закрытии посреди записи. */
  commit(evs, kv) {
    if (DB.mem) {
      const keys = evs.map(e => { DB.mem.log.push(e); return DB.mem.log.length; });
      for (const k in kv) DB.mem.kv[k] = kv[k] === undefined ? undefined : JSON.parse(JSON.stringify(kv[k]));
      return Promise.resolve(keys);
    }
    return new Promise((ok, bad) => {
      const tx = DB.db.transaction(["log", "kv"], "readwrite"), keys = [];
      const ls = tx.objectStore("log"), ks = tx.objectStore("kv");
      evs.forEach((e, i) => { const r = ls.add(e); r.onsuccess = () => { keys[i] = r.result; }; });
      for (const k in kv) { if (kv[k] == null) ks.delete(k); else ks.put(kv[k], k); }
      tx.oncomplete = () => ok(keys);
      tx.onerror = tx.onabort = () => bad(tx.error);
    });
  },
  since(key, limit) { // события с номером > key
    if (DB.mem) return Promise.resolve(DB.mem.log.map((v, i) => ({ k: i + 1, v })).filter(x => x.k > key).slice(0, limit || 1e9));
    return new Promise((ok, bad) => {
      const out = [], r = DB.db.transaction("log").objectStore("log").openCursor(IDBKeyRange.lowerBound(key, true));
      r.onsuccess = () => { const c = r.result; if (c && out.length < (limit || 1e9)) { out.push({ k: c.key, v: c.value }); c.continue(); } else ok(out); };
      r.onerror = () => bad(r.error);
    });
  },
  count(key) {
    if (DB.mem) return Promise.resolve(DB.mem.log.length - key);
    return new Promise(ok => { const r = DB.db.transaction("log").objectStore("log").count(IDBKeyRange.lowerBound(key, true)); r.onsuccess = () => ok(r.result); r.onerror = () => ok(0); });
  }
};

/* ---------- состояние и повторение ---------- */
let ST = null, SESS = null;
function freshState() {
  return { v: 1, dev: rid() + rid(), born: Date.now(), lesson: null, w: {}, days: {}, checked: {}, shown: {},
    copy: { t: 0, upto: 0, prev: 0, rows: 0 }, set: { theme: "auto", micOff: 0, noListen: 0 }, last: null, launches: 0 };
}
function wrec(id) { return ST.w[id] || (ST.w[id] = { lv: -1, due: 0, f: 0, hn: 0, sn: 0, tn: 0, tr: 0, tx: 0, x: 0 }); }
/* Применить событие журнала к состоянию. Чистая функция от событий: состояние всегда можно пересчитать из журнала. */
function apply(e) {
  const d = e.d != null ? e.d : dayNum(e.t);
  if (e.k === "n") { const w = wrec(e.w); if (w.lv < 0) { w.lv = 0; w.due = d + 1; w.f = d; } return; }
  if (e.k === "q") { ST.shown[e.w] = d; return; }
  if (e.k === "C") { ST.checked[e.l] = [e.n, e.of, d]; return; }
  if (e.k === "D") { const dd = ST.days[e.d] || (ST.days[e.d] = { a: 0, r: 0 }); if (!dd.done) dd.done = e.min || 1; return; }
  if (e.k !== "a") return;
  const day = ST.days[d] || (ST.days[d] = { a: 0, r: 0 });
  day.a++; if (e.r === 2) day.r++;
  if (!W(e.w)) return; // слово сняли в новой версии — ответ в журнале остаётся
  if (e.ns) return; // ответ «без звука» (звук урока сломан) — повторение не двигаем (методист, М1)
  const w = wrec(e.w);
  if (e.sk === "t") { w.tn++; if (e.r === 2) w.tr++; else w.tx++; return; }    // у тона свой счёт: «слышу» и «говорю» не сбивает
  if (e.p === "check") {                                                        // быстрая проверка: узнал → длинный срок 3–7 дней с разбросом
    if (e.r === 2 && w.lv < 0) { w.lv = 1; w.due = d + 3 + hashNum(e.w) % 5; w.f = d; w.ck = 1; w.hn++; }
    return;
  }
  if (w.lv < 0) { w.lv = 0; w.due = d + 1; w.f = d; }
  const isDue = w.due <= d && w.f < d, before = w.lv;
  if (e.r === 2) { if (e.sk === "s") w.sn++; else w.hn++; }
  if (e.r === 0) { w.x++; w.lv = 0; w.due = d + 1; }                            // ошибка — в конце занятия и завтра
  else if (isDue) {
    if (e.r === 2) {                                                            // просроченное, отвеченное верно, — на следующий шаг
      w.lv = Math.min(before + 1, STEPS.length - 1); w.due = d + STEPS[w.lv];
      if (STEPS[before] >= 7) { if (e.sk === "s") w.sl = 1; else if (e.x === "4.9") w.sl = 1; else w.hl = 1; }
    } else { w.lv = Math.max(before - 1, 0); w.due = d + STEPS[w.lv]; }        // «почти» — шаг назад
  }
}
function rebuild(events) { // состояние из журнала, если снимок потерян
  const keep = ST; ST = Object.assign(freshState(), { dev: keep.dev, born: keep.born, lesson: keep.lesson, set: keep.set, copy: keep.copy });
  for (const x of events) apply(x.v);
}
const learned = id => { const w = ST.w[id]; return !!(w && w.hl && w.sl); };
const known = id => { const w = ST.w[id]; return !!(w && (w.lv >= 1 || w.hn + w.sn > 0)); };
const isNew = id => !ST.w[id] || ST.w[id].lv < 0;
const micOff = () => ST.set.micOff > Date.now();
const listenOff = () => ST.set.noListen > Date.now();
function dueList(d) {
  const out = [];
  for (const id in ST.w) { const w = ST.w[id]; if (W(id) && W(id).k !== "p" && w.lv >= 0 && w.due <= d && w.f < d) out.push(id); }
  return out.sort((a, b) => ST.w[a].due - ST.w[b].due || ST.w[a].lv - ST.w[b].lv);
}
function streak() {
  const today = dayNum(); let top = today;
  for (const k in ST.days) if (ST.days[k].done && +k > top) top = +k; // часы перевели назад — серия не рвётся
  let d = ST.days[top] && ST.days[top].done ? top : top - 1, n = 0;
  while (ST.days[d] && ST.days[d].done) { n++; d--; }
  return n;
}
const dayDone = d => !!(ST.days[d == null ? dayNum() : d] && ST.days[d == null ? dayNum() : d].done);
function recentAcc() {
  let a = 0, r = 0; const d = dayNum();
  for (let k = d - 7; k < d; k++) if (ST.days[k]) { a += ST.days[k].a || 0; r += ST.days[k].r || 0; }
  return a >= 20 ? r / a : null;
}

/* ---------- урок на парах и «догоняю 1上» ---------- */
function lessonMode() { return !ST.lesson ? "none" : ST.lesson.other ? "other" : ST.lesson.catchup ? "catchup" : "lesson"; }
const unknownActive = lid => lessonWords(lid).filter(id => isActive(id) && isNew(id));
function catchupLesson() {
  const ls = bookLessons("hj1");
  for (const l of ls) if (unknownActive(l.id).length) return l.id;
  return ls.length ? ls[ls.length - 1].id : null;
}
function curLesson() { const m = lessonMode(); return m === "lesson" ? ST.lesson.id : catchupLesson(); }
function readyOf(lid) { const act = lessonWords(lid).filter(isActive); return { n: act.filter(known).length, of: act.length }; }
const checkPool = lid => lessonWords(lid).filter(id => W(id).k !== "q" && !W(id).c && hasClip(id) && isNew(id));
const needCheck = lid => !!lid && !ST.checked[lid] && checkPool(lid).length >= 4;

function newLimit(due) {
  let n = 5; const acc = recentAcc();
  if (acc != null && acc < 0.7) n = 3;
  if (due > REVIEW_MAX * 2) n = 0; else if (due > REVIEW_MAX * 1.5) n = 2;               // новые по долгу (ТЗ 4.4)
  return n;
}
function planDay() {
  const d = dayNum(), L = curLesson(), due = dueList(d), chk = needCheck(L);
  const parts = chk && due.length < 10 ? ["warmup", "check", "new", "tones", "recall"]
    : chk ? ["warmup", "review", "check", "tones", "recall"] : ["warmup", "review", "new", "tones", "recall"];
  const newN = parts.includes("new") ? Math.min(newLimit(due.length), unknownActive(L || "").length + (chk ? 99 : 0)) : 0;
  return { d, L, parts, due: due.length, review: parts.includes("review") ? Math.min(REVIEW_MAX, due.length) : 0, newN, onlyReview: newLimit(due.length) === 0 };
}

/* ---------- вопросы ---------- */
let OFFLINE_OK = null; // без сети — только слова со скачанным звуком (заполняет audio.js)
function playable(id) { // звук есть и не сломан (битые клипы помнит audio.js), без сети — только скачанный
  return hasClip(id) && !SND_FAILED.has(absUrl(clipOf(id))) && (!OFFLINE_OK || navigator.onLine !== false || OFFLINE_OK.has(clipOf(id)));
}
function distract(id, n) {
  const w = W(id), ss = sylls(w.py), base = ss.map(x => x.b).join(" "), f0 = ss[0] ? ss[0].b : "", ini = f0.replace(/[aeiou].*$/, "");
  const scored = [];
  for (const j in C.w) {
    const v = C.w[j]; if (j === id || v.k === "q" || v.ru === w.ru) continue;
    const vs = sylls(v.py), vb = vs.map(x => x.b).join(" ");
    let s = Math.random();
    if (vb === base) s += 5; else if (vs[0] && vs[0].b === f0) s += 3;
    if (vs.length === ss.length) s += 1;
    if (vs[0] && ini && vs[0].b.startsWith(ini)) s += 1;
    if (v.l === w.l) s += 1;
    scored.push([s, j]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  const out = [], seen = new Set([w.ru]);
  for (const [, j] of scored) { if (out.length >= n) break; if (!seen.has(C.w[j].ru)) { seen.add(C.w[j].ru); out.push(j); } }
  return out;
}
function q48(id, p) { const opts = shuffle([id].concat(distract(id, 3))); return { x: "4.8", w: id, p, o: opts, c: opts.indexOf(id) }; }
function toneQ(id, p) {
  const t = tonesOf(W(id).py), key = a => a.join(" "), right = key(t);
  const twin = t.length === 2 && t[0] === 3 && t[1] === 3 ? "2 3" : t.length === 2 && t[0] === 2 && t[1] === 3 && (W(id).nt || "").includes("3 + 3") ? "3 3" : null;
  const cands = [];
  for (let i = 0; i < t.length; i++) if (t[i]) for (const v of [1, 2, 3, 4]) if (v !== t[i]) { const a = t.slice(); a[i] = v; cands.push(key(a)); }
  const set = [right];
  for (const c of shuffle(cands)) { if (set.length >= 4) break; if (c !== twin && !set.includes(c)) set.push(c); }
  const opts = set.sort(); // тоны всегда по порядку 1–4, на одних местах: выбирают ухом (методист, М2)
  return { x: "4.3", w: id, p, o: opts, c: opts.indexOf(right) };
}
const toneable = id => { const w = W(id); if (!w || w.k === "q" || w.c || w.ph) return false; /* у слов «во фразе» звучит фраза — тон слова не спросить */ const t = tonesOf(w.py); return t.length >= 1 && t.length <= 2 && t.some(x => x) && !(t.length === 1 && !t[0]); };
function hearQ(id, p) { const w = ST.w[id]; return toneable(id) && w && w.tn > 0 && w.tr / w.tn < 0.7 && Math.random() < 0.6 ? toneQ(id, p) : q48(id, p); }
function buildPart(p, plan, sess) {
  const d = plan.d, L = plan.L, out = [], canSay = !micOff() && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const used = new Set(); for (const pp of sess.parts) for (const q of pp.q || []) used.add(q.w);
  const ok = id => playable(id) && !(listenOff());
  if (p === "warmup") {
    const pool = shuffle(Object.keys(ST.w).filter(id => W(id) && W(id).k !== "q" && ST.w[id].lv >= 1 && ST.w[id].due > d && ok(id)));
    pool.slice(0, 3).forEach(id => out.push(q48(id, p)));
  } else if (p === "review") {
    let say = 0, load = 0; // «говорю» — три экрана (4.9 → 4.10 → 4.11) и ≈ 25 с: в потолке считаем за три
    for (const id of dueList(d)) {
      if (load >= REVIEW_MAX) break;
      if (used.has(id)) continue;
      const w = ST.w[id], act = isActive(id) && !W(id).c;
      if (ok(id)) { out.push(hearQ(id, p)); load++; } // «говорю» — только в «Скажи по памяти», последним блоком: меньше звука после записи (ТЗ 7.5)
    }
  } else if (p === "check") {
    const pool = shuffle(checkPool(L).filter(ok)), act = pool.filter(isActive), rest = pool.filter(id => !isActive(id));
    const words = act.concat(rest).slice(0, 12);
    words.forEach(id => out.push(q48(id, p)));
    shuffle(words.filter(toneable)).slice(0, 5).forEach(id => out.push(toneQ(id, p)));
  } else if (p === "new") {
    const fresh = unknownActive(L).filter(id => hasClip(id) && playable(id)).slice(0, plan.newN);
    fresh.forEach(id => out.push({ x: "4.1", w: id, p }));
    const passive = lessonWords(L).filter(id => W(id).k !== "a" && !(id in ST.shown) && hasClip(id) && playable(id) && (W(id).k !== "q" || W(id).ph || (W(id).ex && C.x[W(id).ex]))).slice(0, 2); // голая частица без фразы не показывается
    passive.forEach(id => out.push({ x: "4.2", w: id, p }));
    shuffle(fresh.slice()).forEach(id => out.push(q48(id, p)));
  } else if (p === "tones") {
    const seen = Object.keys(ST.w).filter(id => ST.w[id].lv >= 0 && toneable(id) && ok(id));
    let pool = seen.length >= 6 ? seen : seen.concat(lessonWords(L).filter(id => toneable(id) && ok(id) && !seen.includes(id)));
    pool = pool.map(id => [(ST.w[id] ? ST.w[id].tx * 2 : 0) + Math.random() * 3, id]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
    const n = Math.min(12, pool.length);
    const cur = lessonOf(L), passed = id => { const l = lessonOf(W(id).l); return !!(l && cur && l.book === cur.book && l.n <= cur.n); };
    const pairs = shuffle(PAIRS.filter(([a, b]) => ok(a) && ok(b) && passed(a) && passed(b) && (ST.w[a] || ST.w[b]))).slice(0, 3); // только пройденные уроки (М2)
    pairs.forEach(([a, b]) => { const w = Math.random() < 0.5 ? a : b; const o = shuffle([a, b]); out.push({ x: "4.4", w, p, o, c: o.indexOf(w) }); });
    pool.slice(0, Math.max(0, n - pairs.length)).forEach(id => out.push(toneQ(id, p)));
  } else if (p === "recall") {
    if (canSay) {
      const today = Object.keys(ST.w).filter(id => isActive(id) && !W(id).c && !W(id).ph && ST.w[id].f === d && hasClip(id));
      const due = Object.keys(ST.w).filter(id => isActive(id) && !W(id).c && !W(id).ph && ST.w[id].lv >= 0 && ST.w[id].f < d && hasClip(id) && !used.has(id))
        .sort((a, b) => (ST.w[a].sn - ST.w[b].sn) || (ST.w[a].due - ST.w[b].due));
      const pick = [];
      for (const id of due.concat(today)) { if (pick.length >= 5) break; if (!pick.includes(id)) pick.push(id); }
      pick.slice(0, Math.max(3, Math.min(5, pick.length))).forEach(id => out.push({ x: "4.9", w: id, p }));
    }
  }
  return out;
}
const estMs = q => EST[q.x] || 10e3;

/* ===== audio: пакеты урока в памяти телефона, один плеер, запись голоса (AudioWorklet), график тона ===== */
const SND = "zh2-snd";
function fetchT(url, ms, opts) {
  const ac = window.AbortController ? new AbortController() : null;
  const t = setTimeout(() => { try { ac && ac.abort(); } catch (e) {} }, ms);
  return fetch(url, Object.assign({ signal: ac ? ac.signal : undefined }, opts || {})).finally(() => clearTimeout(t));
}
const absUrl = u => new URL(u, location.href).href;
const SND_FAILED = new Set();
async function fetch2(a, ms) { // клип: попытка и один повтор, дальше — «недоступен» до следующего запуска
  let r = null;
  try { r = await fetchT(a, ms); if (r.ok) return r; } catch (e) { if (navigator.onLine === false) throw e; }
  await sleep(150);
  return fetchT(a, ms);
}
let sndLogged = 0;
function sndFail(u, why) { // один повтор на клип, потом «недоступен» до следующего запуска; в журнал — одна запись на клип
  const a = absUrl(u);
  if (SND_FAILED.has(a)) return;
  SND_FAILED.add(a);
  if (sndLogged++ >= 100) return;
  const ev = { k: "E", t: Date.now(), m: "звук недоступен до перезапуска: " + a.replace(/^.*?(snd\/)/, "$1").split("?")[0] + " (" + why + ")" };
  try { if (DB.db || DB.mem) DB.commit([ev], {}).catch(() => {}); } catch (e) {}
}
const Snd = {
  have: new Set(), objs: new Map(), busy: false, prog: null,
  async init() {
    try { const c = await caches.open(SND); for (const r of await c.keys()) Snd.have.add(r.url); } catch (e) {}
    OFFLINE_OK = { has: u => Snd.have.has(absUrl(u)) };
  },
  pend: new Map(),
  blob(url) { // один запрос на клип за раз: касание во время автозвука ждёт тот же ответ, а не качает заново
    const a = absUrl(url);
    if (Snd.pend.has(a)) return Snd.pend.get(a);
    const p = Snd.blob1(url).finally(() => Snd.pend.delete(a));
    Snd.pend.set(a, p);
    return p;
  },
  async blob1(url) {
    const a = absUrl(url);
    try { const c = await caches.open(SND); const r = await c.match(a); if (r) return await r.blob(); } catch (e) {}
    if (navigator.onLine === false || SND_FAILED.has(a)) return null;
    try {
      const r = await fetch2(a, 9000); if (!r.ok) { sndFail(a, "HTTP " + r.status); return null; }
      const b = await r.blob();
      try { const c = await caches.open(SND); await c.put(a, new Response(b, { headers: { "Content-Type": "audio/mpeg" } })); Snd.have.add(a); } catch (e) {}
      return b;
    } catch (e) { return null; } // обрыв или таймаут — не «сломан»: попробуем, когда слово встретится снова
  },
  async obj(url) {
    if (Snd.objs.has(url)) return Snd.objs.get(url);
    const b = await Snd.blob(url); if (!b) return null;
    const u = URL.createObjectURL(b); Snd.objs.set(url, u);
    if (Snd.objs.size > 80) { const [k, v] = Snd.objs.entries().next().value; URL.revokeObjectURL(v); Snd.objs.delete(k); }
    return u;
  },
  lessonClips(lid) {
    const out = new Set();
    for (const id of lessonWords(lid)) { const w = W(id); for (const v in w.s) out.add(w.s[v]); if (w.ex && C.x[w.ex]) for (const v in C.x[w.ex].s) out.add(C.x[w.ex].s[v]); }
    return Array.from(out);
  },
  state(lid) { const u = Snd.lessonClips(lid); return { n: u.filter(x => Snd.have.has(absUrl(x))).length, of: u.length }; },
  lessonsDone() { return LESSONS.filter(l => { const s = Snd.state(l.id); return s.of && s.n === s.of; }).length; },
  totalMb() { return C.mb || Math.round(LESSONS.reduce((a, l) => a + (l.kb || 0), 0) / 102.4) / 10; },
  async download(lids, onStep) { // качаем по одному маленькому файлу: обрыв связи не ломает пакет
    if (Snd.busy) return false;
    Snd.busy = true;
    try {
      const todo = []; for (const l of lids) for (const u of Snd.lessonClips(l)) if (!Snd.have.has(absUrl(u)) && !SND_FAILED.has(absUrl(u))) todo.push(u);
      Snd.prog = { n: 0, of: todo.length };
      const c = await caches.open(SND), fails = [];
      let i = 0;
      const worker = async () => {
        while (i < todo.length) {
          if (navigator.onLine === false) return;
          const u = todo[i++];
          try { const r = await fetch2(absUrl(u), 15000); if (r.ok) { await c.put(absUrl(u), new Response(await r.blob(), { headers: { "Content-Type": "audio/mpeg" } })); Snd.have.add(absUrl(u)); } else sndFail(u, "HTTP " + r.status); } catch (e) {} // обрыв связи — не помечаем
          Snd.prog.n++; if (onStep) onStep(Snd.prog);
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
      return true;
    } catch (e) { return false; } finally { Snd.busy = false; Snd.prog = null; }
  },
  forget(url) { // битый клип — из памяти телефона долой, до следующего запуска «недоступен»
    const a = absUrl(url), o = Snd.objs.get(url);
    if (o) { try { URL.revokeObjectURL(o); } catch (e) {} Snd.objs.delete(url); }
    Snd.have.delete(a);
    caches.open(SND).then(c => c.delete(a)).catch(() => {});
  },
  async prune() { // старые версии клипов (другой ?h=) — долой
    try {
      const keep = new Set(); for (const id in C.w) for (const v in C.w[id].s) keep.add(absUrl(C.w[id].s[v]));
      for (const id in C.x) for (const v in C.x[id].s) keep.add(absUrl(C.x[id].s[v]));
      const c = await caches.open(SND);
      for (const r of await c.keys()) if (!keep.has(r.url)) { await c.delete(r); Snd.have.delete(r.url); }
    } catch (e) {}
  }
};

/* ---------- один плеер ---------- */
function makeWav(pcm, rate) {
  const n = pcm.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const s = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); s(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) { const x = Math.max(-1, Math.min(1, pcm[i])); v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7FFF, true); }
  return new Blob([buf], { type: "audio/wav" });
}
const AC = () => window.AudioContext || window.webkitAudioContext;
function setSession(t) { try { if (navigator.audioSession) navigator.audioSession.type = t; } catch (e) {} }
const Player = {
  el: null, ctx: null, tok: 0, btn: null, recDone: false, waitUntil: 0, silent: null, cur: null,
  unlock() { // только из касания «Начать»: один <audio> и AudioContext для «дзынь»
    const el = Player.el || (Player.el = $("#aud"));
    try {
      if (!Player.silent) Player.silent = URL.createObjectURL(makeWav(new Float32Array(1600), 16000));
      if (!Player.pend) { el.src = Player.silent; el.removeAttribute("data-src"); const p = el.play(); Player.track(p); }
    } catch (e) {}
    try { const A = AC(); if (A && !Player.ctx) Player.ctx = new A(); if (Player.ctx && Player.ctx.state !== "running") Player.ctx.resume().catch(() => {}); } catch (e) {}
    if (AFTER_REC === "modes") setSession("playback");
  },
  mark(btn, state) { if (btn && btn.isConnected !== false) btn.setAttribute("data-state", state); },
  pend: null,
  pause(el) { // пауза без AbortError: если play() ещё не завершился — паузим после него
    if (!el) return;
    const p = Player.pend, tok = Player.tok;
    if (p) p.then(() => { if (tok === Player.tok) { try { el.pause(); } catch (e) {} } }, () => {});
    else { try { el.pause(); } catch (e) {} }
  },
  stop() {
    Player.tok++;
    if (Player.cur) { try { Player.cur(); } catch (e) {} Player.cur = null; }
    Player.pause(Player.el);
    if (Player.btn) { Player.mark(Player.btn, "idle"); Player.btn = null; }
  },
  /* сыграть клип; вызывать прямо из касания. Возвращает "ok" | "missing" | "fail" */
  play(url, opts) {
    opts = opts || {};
    Player.stop();
    const tok = Player.tok, btn = opts.btn || null;
    Player.btn = btn; Player.mark(btn, "playing");
    const useWA = AFTER_REC === "stream" || (AFTER_REC === "gain2" && Player.recDone);
    let ctx = null;
    const prep = { dest: null, el2: null, err: null, fresh: null }; // плеер запускаем прямо в касании, звук подставим потом (как в пробе 2)
    if (useWA) {
      try {
        const A = AC(); ctx = new A(); const r = ctx.resume(); if (r && r.catch) r.catch(() => {});
        if (AFTER_REC === "stream") {
          prep.dest = ctx.createMediaStreamDestination(); prep.el2 = $("#aud2"); prep.el2.srcObject = prep.dest.stream;
          const pp = prep.el2.play(); if (pp && pp.catch) pp.catch(e => { prep.err = e; });
        }
      } catch (e) { ctx = null; }
    }
    if (AFTER_REC === "mr" && Player.recDone && !ctx) {
      try { prep.fresh = new Audio(); prep.fresh.setAttribute("playsinline", ""); if (Player.silent) { prep.fresh.src = Player.silent; const pp = prep.fresh.play(); if (pp && pp.catch) pp.catch(() => {}); } } catch (e) { prep.fresh = null; }
    }
    const fin = res => { if (tok === Player.tok) { Player.mark(btn, res === "missing" ? "missing" : "idle"); Player.btn = null; Player.cur = null; } if (ctx) { try { ctx.close(); } catch (e) {} } return res; };
    return (async () => {
      if (!url) return fin("missing");
      const u = opts.raw ? url : await Snd.obj(url);
      if (tok !== Player.tok) return fin("stop");
      if (!u) return fin("missing");
      const wait = Player.waitUntil - Date.now(); if (wait > 0) await sleep(wait);
      if (tok !== Player.tok) return fin("stop");
      if (ctx) return fin(await Player.playWA(ctx, u, AFTER_REC === "gain2" ? 2 : 1, prep, tok));
      const el = prep.fresh || Player.el || (Player.el = $("#aud"));
      const res = await Player.playEl(el, u, opts.slow ? 0.7 : 1, tok);
      if (res === "bad" && !opts.raw) { sndFail(url, "файл не играет"); Snd.forget(url); return fin("missing"); }
      return fin(res === "bad" ? "fail" : res);
    })().catch(() => fin("fail"));
  },
  track(p) {
    if (!p || !p.then) return;
    Player.pend = p;
    const clear = () => { if (Player.pend === p) Player.pend = null; };
    p.then(clear, clear);
  },
  async playEl(el, u, rate, tok) {
    if (el === Player.el && Player.pend) { try { await Player.pend; } catch (e) {} } // новый src во время play() — тоже AbortError
    if (tok !== Player.tok) return "stop";
    return new Promise(resolve => {
      let done = false, tm = null;
      const end = r => { if (done) return; done = true; clearTimeout(tm); el.removeEventListener("ended", onEnd); el.removeEventListener("error", onErr); resolve(r); };
      const onEnd = () => end("ok"), onErr = () => end("bad"); // ошибка самого файла (битый клип) — не путать с запретом play()
      Player.cur = () => { Player.pause(el); end("stop"); };
      el.addEventListener("ended", onEnd); el.addEventListener("error", onErr);
      el.setAttribute("playsinline", "");
      if (el.getAttribute("data-src") !== u) { el.src = u; el.setAttribute("data-src", u); }
      try { el.currentTime = 0; } catch (e) {}
      try { el.playbackRate = rate; el.defaultPlaybackRate = rate; } catch (e) {}
      let p; try { p = el.play(); } catch (e) { end("fail"); return; }
      if (el === Player.el) Player.track(p);
      if (p && p.catch) p.catch(() => end(tok === Player.tok ? "fail" : "stop"));
      tm = setTimeout(() => end("ok"), 15000);
    });
  },
  async playWA(ctx, u, gain, prep, tok) {
    const ab = await (await fetch(u)).arrayBuffer();
    const buf = await new Promise((ok, bad) => { const p = ctx.decodeAudioData(ab, ok, bad); if (p && p.then) p.then(ok, bad); });
    if (tok !== Player.tok) return "stop";
    const src = ctx.createBufferSource(); src.buffer = buf; let last = src;
    if (gain !== 1) {
      const g = ctx.createGain(); g.gain.value = gain;
      const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -1.5; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.1;
      src.connect(g); g.connect(lim); last = lim;
    }
    let el = null;
    if (prep.dest) { if (prep.err) return "fail"; last.connect(prep.dest); el = prep.el2; } // play() потока запрещён — честно «не сыграл»
    else last.connect(ctx.destination);
    src.start(ctx.currentTime + 0.05);
    return new Promise(resolve => {
      let done = false;
      const end = r => { if (done) return; done = true; try { src.stop(); } catch (e) {} if (el) { try { el.pause(); el.srcObject = null; } catch (e) {} } resolve(r); };
      Player.cur = () => end("stop");
      src.onended = () => setTimeout(() => end("ok"), 120);
      setTimeout(() => end("ok"), 15000);
    });
  },
  ding(ok) { // короткий «дзынь» через Web Audio — при беззвучном режиме молчит, и это нормально
    try {
      const c = Player.ctx; if (!c || c.state !== "running") return;
      const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
      o.frequency.setValueAtTime(ok ? 880 : 220, t); if (ok) o.frequency.setValueAtTime(1320, t + 0.08);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.3);
    } catch (e) {}
  }
};

/* ---------- запись голоса ---------- */
const Mic = {
  stopNow: null, recording: false,
  async record(maxMs, onLevel) {
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) throw { reason: "no-mic", err: "нет mediaDevices" };
    Player.stop();
    const t0 = performance.now(), cons = { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } };
    if (AFTER_REC === "modes") setSession("play-and-record");
    let stream = null, ctx = null, rate = 48000, chunks = [], levels = [], peak = 0, mr = null, mrChunks = [];
    const stopper = new Promise(r => { Mic.stopNow = r; });
    Mic.recording = true;
    try {
      if (AFTER_REC !== "mr") { const A = AC(); if (!A) throw { reason: "no-mic", err: "нет AudioContext" }; ctx = new A(); try { ctx.resume().catch(() => {}); } catch (e) {} }
      const g = navigator.mediaDevices.getUserMedia(cons);
      try { stream = await Promise.race([g, sleep(30000).then(() => { g.then(s => s.getTracks().forEach(t => t.stop()), () => {}); throw Object.assign(new Error("нет ответа 30 с"), { name: "AbortError" }); })]); } // разрешение пришло поздно — дорожки сразу стоп
      catch (e) { const n = e && e.name; throw { reason: n === "NotAllowedError" || n === "SecurityError" ? "denied" : "no-mic", err: errText(e) }; }
      if (AFTER_REC === "mr") {
        if (!window.MediaRecorder) throw { reason: "no-mic", err: "нет MediaRecorder" };
        mr = new MediaRecorder(stream); const stopped = new Promise(r => { mr.onstop = r; });
        mr.ondataavailable = e => { if (e.data && e.data.size) mrChunks.push(e.data); };
        mr.start();
        const tick = setInterval(() => onLevel && onLevel(0.05 + Math.random() * 0.1), 60);
        await Promise.race([sleep(maxMs), stopper]); clearInterval(tick);
        mr.stop(); await Promise.race([stopped, sleep(3000)]);
      } else {
        if (ctx.state !== "running") { try { await Promise.race([ctx.resume(), sleep(1500)]); } catch (e) {} }
        rate = ctx.sampleRate;
        const src = ctx.createMediaStreamSource(stream), sink = ctx.createGain(); sink.gain.value = 0; sink.connect(ctx.destination);
        let heard = false, lastLoud = 0;
        const take = (pcm, rms, pk) => {
          chunks.push(pcm); levels.push(rms); if (pk > peak) peak = pk; if (onLevel) onLevel(rms);
          const now = performance.now(); // сама останавливается после ~0,8 с тишины после голоса
          if (rms > 0.012) { heard = true; lastLoud = now; } else if (heard && now - lastLoud > 800 && Mic.stopNow) Mic.stopNow();
        };
        let node = null;
        try {
          await Promise.race([ctx.audioWorklet.addModule("worklet.js"), sleep(3000).then(() => { throw new Error("worklet за 3 с не загрузился"); })]);
          node = new AudioWorkletNode(ctx, "rec");
          node.port.onmessage = ev => take(ev.data.pcm, ev.data.rms, ev.data.peak);
        } catch (e) { // запасной путь без AudioWorklet
          node = ctx.createScriptProcessor(2048, 1, 1);
          node.onaudioprocess = ev => { const d = new Float32Array(ev.inputBuffer.getChannelData(0)); let s = 0, pk = 0; for (const x of d) { s += x * x; const a = Math.abs(x); if (a > pk) pk = a; } take(d, Math.sqrt(s / d.length), pk); };
        }
        src.connect(node); node.connect(sink);
        await Promise.race([sleep(maxMs), stopper]);
        try { src.disconnect(); node.disconnect(); } catch (e) {}
      }
    } finally {
      Mic.recording = false; Mic.stopNow = null;
      try { stream && stream.getTracks().forEach(t => t.stop()); } catch (e) {}
      try { ctx && ctx.close(); } catch (e) {}
      Player.recDone = true;
      if (AFTER_REC === "modes") { Player.waitUntil = Date.now() + 500; setTimeout(() => setSession("playback"), 450); }
      if (AFTER_REC === "mr") Player.waitUntil = Date.now() + 2500;
    }
    let pcm;
    if (mr) {
      const blob = new Blob(mrChunks, { type: mr.mimeType || "audio/mp4" });
      try { const d = await decodeTo(await blob.arrayBuffer()); pcm = d.data; rate = d.sr; } catch (e) { throw { reason: "silent", err: "запись не читается: " + errText(e) }; }
      for (let i = 0; i < pcm.length; i += 2400) { let s = 0, pk = 0; const e = Math.min(pcm.length, i + 2400); for (let j = i; j < e; j++) { s += pcm[j] * pcm[j]; const a = Math.abs(pcm[j]); if (a > pk) pk = a; } levels.push(Math.sqrt(s / (e - i))); if (pk > peak) peak = pk; }
    } else {
      let n = 0; for (const c of chunks) n += c.length;
      pcm = new Float32Array(n); let o = 0; for (const c of chunks) { pcm.set(c, o); o += c.length; }
    }
    const voiced = levels.filter(r => r > 0.006).length; // ≈ −45 дБ
    const ms = Math.round(performance.now() - t0);
    if (peak < 0.015 || voiced < 3) throw { reason: "silent", err: "пик " + peak.toFixed(3) + ", голос " + voiced + " кусков" };
    return { pcm, rate, peak, voiced, ms };
  }
};
function decodeTo(ab) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const oc = new OAC(1, 16000, 16000);
  return new Promise((ok, bad) => { const p = oc.decodeAudioData(ab, ok, bad); if (p && p.then) p.then(ok, bad); })
    .then(buf => ({ data: buf.getChannelData(0).slice(), sr: buf.sampleRate }));
}

/* ---------- высота голоса (YIN) и график ---------- */
function pitchTrack(data, sr) {
  if (!data || !data.length) return [];
  const k = Math.max(1, Math.round(sr / 16000)), fs = sr / k, n = Math.floor(data.length / k);
  const x = new Float32Array(n); for (let i = 0; i < n; i++) { let t = 0; for (let j = 0; j < k; j++) t += data[i * k + j]; x[i] = t / k; }
  const Wn = Math.round(fs * 0.032), hop = Math.round(fs * 0.01), tMin = Math.floor(fs / 500), tMax = Math.ceil(fs / 65);
  const rms = []; let maxR = 0;
  for (let st = 0; st + Wn + tMax < n; st += hop) { let e = 0; for (let i = 0; i < Wn; i++) e += x[st + i] * x[st + i]; const r = Math.sqrt(e / Wn); rms.push(r); if (r > maxR) maxR = r; }
  const d = new Float32Array(tMax + 2), out = [];
  for (let f = 0, st = 0; f < rms.length; f++, st += hop) {
    if (rms[f] < maxR * 0.12) { out.push(null); continue; }
    let run = 0; d[0] = 1;
    for (let tau = 1; tau <= tMax; tau++) { let t = 0; for (let i = 0; i < Wn; i++) { const v = x[st + i] - x[st + i + tau]; t += v * v; } run += t; d[tau] = run ? t * tau / run : 1; }
    let tau = -1;
    for (let t = tMin; t <= tMax; t++) if (d[t] < 0.15) { while (t + 1 <= tMax && d[t + 1] < d[t]) t++; tau = t; break; }
    if (tau < 1) { out.push(null); continue; }
    const a = d[tau - 1], b = d[tau], c = tau + 1 <= tMax ? d[tau + 1] : b, den = a + c - 2 * b;
    out.push(12 * Math.log2(fs / (tau + (den ? (a - c) / (2 * den) : 0)) / 100));
  }
  return out;
}
function contour(fr) {
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
const REF = new Map();
async function refContour(url) {
  if (REF.has(url)) return REF.get(url);
  let c = null;
  try { const b = await Snd.blob(url); if (b) { const d = await decodeTo(await b.arrayBuffer()); c = contour(pitchTrack(d.data, d.sr)); } } catch (e) {}
  REF.set(url, c); return c;
}
function graphSVG(ref, me, syl) {
  const Wd = 320, Ht = 118, pad = 10, lim = 8;
  const line = (pts, cls) => {
    if (!pts || pts.length < 2) return "";
    const n = pts.length, segs = []; let cur = [];
    const m = Math.max(2.5, ...pts.filter(x => x != null).map(Math.abs)); // шкала под каждый клип: контур виден, даже если голос «ровный» (Н2)
    pts.forEach((p, i) => { if (p == null) { if (cur.length > 1) segs.push(cur); cur = []; return; } const x = pad + i / (n - 1) * (Wd - 2 * pad), y = (Ht - 18) / 2 - Math.max(-m, Math.min(m, p)) / m * ((Ht - 18) / 2 - pad); cur.push(x.toFixed(1) + "," + y.toFixed(1)); });
    if (cur.length > 1) segs.push(cur);
    return segs.map(sg => '<polyline class="' + cls + '" points="' + sg.join(" ") + '"/>').join("");
  };
  const labels = (syl || []).map((s, i, a) => '<text x="' + (pad + (i + 0.5) / a.length * (Wd - 2 * pad)).toFixed(0) + '" y="' + (Ht - 4) + '" text-anchor="middle">' + esc(s) + "</text>").join("");
  return '<svg class="graph" data-test="graph" viewBox="0 0 ' + Wd + " " + Ht + '" role="img" aria-label="Линия голоса: ты и диктор">' +
    '<line class="axis" x1="0" x2="' + Wd + '" y1="' + ((Ht - 18) / 2) + '" y2="' + ((Ht - 18) / 2) + '" stroke-dasharray="3 5"/>' + line(ref, "ref") + line(me, "me") + labels + "</svg>";
}

/* ===== ui: экраны по «Контракту разметки 1а» (Plans/phase_2/screens.md) ===== */
const I = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3z"/><path d="M16.5 12A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z"/></svg>',
  slow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 16c0-4.5 3.4-8 7.5-8S18 11.5 18 16H3z"/><path d="M18 14h1.5a2 2 0 0 0 0-4H18"/><path d="M6 16v3M14.5 16v3"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/></svg>',
  me: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4-6.5 8-6.5s7 2 8 6.5"/></svg>'
};
const UI = { tab: "today", sub: null, pageOk: false, pack: null, packAt: 0, reloadPending: false, firstShown: false, inSession: false, homeHint: true };
const Run = { q: null, shownAt: 0, plays: 0, answered: false, saving: Promise.resolve(), rec: null, lastTick: 0 };

function toast(msg, ms) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, ms || 2600); }
function mount(el) {
  Player.stop();
  const app = $("#app");
  for (const c of Array.from(app.children)) { if (c.classList.contains("boot")) c.hidden = true; else c.remove(); } // каркас 1.1–1.3 остаётся скрытым — для экрана ошибки
  app.append(el);
  $("#ov").textContent = "";
  UI.shownAt = performance.now();
  document.documentElement.setAttribute("data-ready", "true");
}
function overlay(el) { $("#ov").append(el); UI.shownAt = performance.now(); return el; }
const closeOv = sel => { const o = $(sel, $("#ov")); if (o) o.remove(); };
function tabs(on) {
  const t = (id, label, icon) => h("button", { type: "button", class: "tab", test: "tab", "data-to": id, "data-state": on === id ? "on" : "off", onclick: () => { if (id === "today") { UI.tab = "today"; UI.sub = null; renderToday(); } else { UI.tab = "me"; UI.sub = null; renderMe(); } } }, h("span", { html: icon }), label);
  return h("nav", { class: "tabs" }, t("today", "Сегодня", I.today), t("me", "Я", I.me));
}
function bar(n, of) { return h("div", { class: "bar" }, h("i", { style: "width:" + (of ? Math.round(n / of * 100) : 0) + "%" })); }
function playBtn(url, cls, attrs) {
  const b = h("button", Object.assign({ type: "button", class: "pbtn " + (cls || "big"), test: "play", "data-state": url ? "idle" : "missing", "aria-label": "Слушать", html: I.play }, attrs || {}));
  b.addEventListener("click", () => { Run.plays++; Player.play(url, { btn: b }).then(r => { if (r === "missing") onMissing(b); }); });
  return b;
}
function slowUrl(id) { const w = W(id) || C.x[id]; return w && w.s ? (w.s.fs || w.s.ms || null) : null; }
function slowBtn(id) {
  const b = h("button", { type: "button", class: "pbtn mid", test: "slow", "data-state": clipOf(id) ? "idle" : "missing", "aria-label": "Медленно", html: I.slow });
  b.addEventListener("click", () => { Run.plays++; const s = slowUrl(id); Player.play(s || clipOf(id), { btn: b, slow: !s }).then(r => { if (r === "missing") onMissing(b); }); });
  return b;
}
function onMissing(btn) {
  if (btn && !btn.isConnected) return; // звук от прошлого экрана — к текущему вопросу не относится
  if (btn) btn.setAttribute("data-state", "missing");
  if (Run.q && !Run.answered) Run.noSound = true; // ответ без звука не двигает повторение (М1)
  // 3.5 — только пока на вопрос не ответили и только у заданий со звуком; после ответа — просто перечёркнутая кнопка
  if (!Run.q || Run.answered || !["4.8", "4.3", "4.4", "4.1", "4.2"].includes(Run.q.x) || $("[data-overlay='3.5']")) return;
  const zone = $(".zone"); if (!zone) return;
  $$("[data-test=cant-listen]").forEach(x => { x.hidden = true; });
  $$("[data-test=next]", zone).forEach(x => { x.hidden = true; }); // одна «Дальше» на экране
  zone.append(h("div", { class: "panel bad", "data-overlay": "3.5" },
    h("div", { class: "ttl" }, h("button", { type: "button", class: "pbtn sm", test: "play", "data-state": "missing", disabled: true, html: I.play }), "Звук не скачан"),
    h("p", { class: "trap", text: navigator.onLine === false ? "Звук этого слова не скачан, интернета нет. Пропускаю — вернём, когда будет сеть." : "Звук этого слова не загрузился. Пропускаю — вернём позже." }),
    h("button", { type: "button", class: "btn main", test: "next", text: "Дальше", onclick: () => skipQ("audio") })));
}
const dateLine = () => { const d = new Date(); return WEEK_RU[d.getDay()] + ", " + d.getDate() + " " + DATE_RU[d.getMonth()]; };
const lessonNum = lid => { const l = lessonOf(lid); return l ? l.n : 0; };
function lessonLabel(lid) { const l = lessonOf(lid); return l ? "урок " + l.n + (l.title ? " · " + l.title : "") : "урок"; }

/* ---------- 1.4, 1.5, 1.6: первый запуск ---------- */
function inApp() { // WeChat, Telegram и другие встроенные браузеры iPhone: в их строке нет «Safari/». С «Домой» — никогда.
  const ua = navigator.userAgent, home = document.documentElement.getAttribute("data-standalone") === "true";
  return !home && (/MicroMessenger|Telegram|FBAN|FBAV|Instagram|Line\//i.test(ua) || !!window.TelegramWebviewProxy || (/iPhone|iPad|iPod/.test(ua) && !/Safari\//.test(ua)));
}
function showGate() {
  const link = location.origin + location.pathname;
  if (inApp()) {
    mount(h("section", { class: "scr", "data-screen": "1.5" }, h("div", { class: "body" },
      h("h1", { text: "Открой в Safari" }),
      h("p", { class: "line", text: "Внутри WeChat и Telegram не работает микрофон и не сохранится прогресс." }),
      h("ol", { class: "steps" }, h("li", { text: "Нажми «···» вверху." }), h("li", { text: "«Открыть в браузере» (Safari)." }), h("li", { text: "В Safari: «Поделиться» → «На экран „Домой“»." })),
      h("p", { class: "card", style: "margin-top:16px;word-break:break-all" }, h("a", { href: link, test: "link", style: "color:var(--link);display:inline-block;min-height:44px;padding:10px 0", text: link }))),
      h("div", { class: "foot" }, h("button", { type: "button", class: "btn main", test: "copy-link", text: "Скопировать ссылку", onclick: () => copyText(link).then(ok => toast(ok ? "Ссылка скопирована ✓" : "Не скопировалось — нажми на ссылку и подержи")) }))));
    return true;
  }
  if (document.documentElement.getAttribute("data-standalone") !== "true" && UI.homeHint) {
    mount(h("section", { class: "scr", "data-screen": "1.4" }, h("div", { class: "body" },
      h("h1", { text: "Поставь на экран «Домой»" }),
      h("p", { class: "line", text: "Во вкладке Safari iPhone сотрёт прогресс, если 7 дней не заходить. С «Домой» — не сотрёт и работает без интернета." }),
      h("ol", { class: "steps" }, h("li", { text: "«Поделиться» — квадрат со стрелкой, внизу или в меню «···»." }), h("li", { text: "«На экран „Домой“»." }), h("li", { text: "Открой «Китайский» с иконки." })),
      h("p", { class: "line", text: "Занятия во вкладке Safari в значок на «Домой» не перейдут — у них разная память." })),
      h("div", { class: "foot" },
        h("button", { type: "button", class: "btn main", test: "ok", text: "Понятно", onclick: () => { UI.homeHint = false; route(); } }))));
    return true;
  }
  return false;
}
function lessonGrid(onPick, inSheet) {
  const books = C.books.filter(b => b.lessons.length);
  const cur = ST.lesson && ST.lesson.id;
  const bid = UI.book || (cur && lessonOf(cur) ? lessonOf(cur).book : books[0].id);
  const kids = [];
  if (books.length >= 2) kids.push(h("div", { class: "books" }, books.map(b => h("button", { type: "button", class: "btn", test: "book", "data-book": b.id, "aria-pressed": b.id === bid ? "true" : "false", text: b.short || b.title, onclick: () => { UI.book = b.id; onPick(null); } }))));
  kids.push(h("div", { class: "lgrid" }, bookLessons(bid).map(l => h("button", { type: "button", class: "btn", test: "lesson", "data-lesson": l.n, "data-book": l.book, "data-state": l.id === cur ? "on" : "off", "aria-label": "Урок " + l.n, text: String(l.n), onclick: () => onPick({ id: l.id }) }))));
  kids.push(h("button", { type: "button", class: "btn sec", test: "lesson-other", text: "Урок не из 1上 или дальше 15", onclick: () => onPick({ other: true }) }));
  kids.push(h("button", { type: "button", class: inSheet ? "btn sec" : "btn main", test: "catchup", text: "Не знаю — догоняю 1上", onclick: () => onPick({ catchup: true }) }));
  return kids;
}
function setLesson(v) { // экран меняется сразу, запись в память идёт следом (очередь commit)
  ST.lesson = v;
  return commit([{ k: "lesson", t: Date.now(), l: v.id || (v.other ? "other" : "catchup") }]);
}
function showFirst() {
  const pick = v => { if (!v) return showFirst(); setLesson(v); UI.tab = "today"; renderToday(); downloadSoon(); };
  mount(h("section", { class: "scr", "data-screen": "1.6" }, h("div", { class: "body" },
    h("h1", { text: "Какой урок сейчас на парах?" }),
    h("p", { class: "line", text: "Новое каждый день — из этого урока. Одно касание — и начинаем." }),
    h("div", { style: "display:grid;gap:12px" }, lessonGrid(pick, false)))));
}
function lessonSheet() {
  const close = () => closeOv("[data-overlay='2.6']");
  const pick = v => { if (!v) { close(); return lessonSheet(); } setLesson(v); close(); UI.sub === "settings" ? renderSettings() : renderToday(); downloadSoon(); };
  const sh = h("div", { class: "shade", "data-overlay": "2.6", onclick: e => { if (e.target === sh) close(); } },
    h("div", { class: "sheet" }, h("div", { class: "grab" }), h("h2", { text: "Какой урок сейчас на парах?" }),
      lessonGrid(pick, true), h("p", { class: "line", text: "Новое каждый день — из этого урока." }),
      h("button", { type: "button", class: "btn main", test: "close", text: "Готово", onclick: close })));
  overlay(sh);
}

/* ---------- 2.x Сегодня ---------- */
function planLines(plan) {
  const L = plan.L, n = lessonNum(L), out = [];
  if (plan.parts.includes("review") && plan.review) out.push("Повторение · " + plan.review);
  if (plan.parts.includes("check")) out.push("Проверка урока " + n + " · 2–3 мин");
  if (plan.parts.includes("new")) out.push(plan.onlyReview ? "Сегодня только повторение" : "Новые слова урока " + n + " · до " + Math.max(1, plan.newN));
  out.push("Тоны на слух · 10–15");
  out.push(micOff() ? "Скажи по памяти — микрофон выключен на час" : "Скажи по памяти · 3–5");
  return out;
}
function netPlate(L) {
  if (navigator.onLine !== false) return null;
  const st = L ? Snd.state(L) : { n: 1, of: 1 };
  const pl = h("div", { class: "netbar", "data-overlay": "2.9" }, h("b", { text: "Нет интернета — занимаемся тем, что скачано" }),
    h("span", { test: "queued", "data-n": 0, text: "Ответы сохранены на телефоне." }));
  if (st.n < st.of) pl.append(h("span", { test: "no-audio-note", text: "Звук урока " + lessonNum(L) + " скачан не весь — возьмём слова со скачанным звуком." }));
  pendingCount().then(n => { const q = $("[data-test=queued]", pl); if (q) { q.setAttribute("data-n", n); q.textContent = "Ответы сохранены на телефоне" + (n ? ": " + n + " — скопируешь для Claude, когда удобно." : "."); } });
  return pl;
}
function closeStale() { // вчерашнее незаконченное занятие не продолжаем: ответы уже в журнале, новый день — заново
  if (!SESS || UI.inSession || SESS.d >= dayNum()) return;
  const s = SESS; SESS = null;
  commit([{ k: "F", t: Date.now(), s: s.id, d: s.d, min: Math.round((s.act || 0) / MIN), n: s.n, stale: 1 }]);
}
function renderToday() {
  UI.tab = "today"; UI.sub = null; UI.inSession = false;
  closeStale();
  if (lessonMode() === "none") return showFirst();
  const d = dayNum(), mode = lessonMode(), plan = planDay(), L = plan.L;
  const scr = SESS ? "2.2" : dayDone(d) ? "2.3" : mode === "other" ? "2.7" : "2.1";
  const body = h("div", { class: "body" });
  const st = streak();
  body.append(h("div", { class: "top" }, h("div", {}, h("h1", { text: "Сегодня" }), h("div", { class: "date", text: dateLine() })),
    h("button", { type: "button", class: "streak", test: "streak", "data-days": st, "aria-label": "Серия", onclick: () => toast("Серия — дни подряд, когда занятие засчитано") }, "🔥 ", h("b", { text: String(st) }), " " + plural(st, "день", "дня", "дней"))));
  const net = netPlate(L); if (net) body.append(net);
  if (listenOff()) body.append(h("button", { type: "button", class: "row", test: "listen-on", onclick: () => { ST.set.noListen = 0; commit([{ k: "off", t: Date.now(), what: "listen-on" }]); renderToday(); } },
    h("span", { text: "Задания на слух выключены до " + hhmm(ST.set.noListen) }), h("b", { style: "color:var(--link)", text: "Включить" })));
  if (scr !== "2.7") {
    const lbl = mode === "lesson" ? "На парах: " + lessonLabel(L) : "Урок на парах: выбрать";
    body.append(h("button", { type: "button", class: "row", test: "lesson-now", "data-lesson": lessonNum(L), onclick: lessonSheet }, h("span", { text: lbl }), h("span", { class: "chev", text: "›" })));
  }
  const ls = bookLessons("hj1");
  if (mode === "lesson") {
    const r = readyOf(L);
    body.append(h("div", { class: "prog", test: "ready", "data-n": r.n, "data-of": r.of }, h("span", { text: "К паре знаю " + r.n + " из " + r.of + " " + plural(r.of, "слова", "слов", "слов") }), bar(r.n, r.of)));
  } else {
    const k = lessonNum(catchupLesson());
    body.append(h("div", { class: "prog", test: "catchup-line", "data-lesson": k, "data-of": ls.length }, h("span", { text: (scr === "2.7" ? "Пока догоняю 1上 · урок " : "Догоняю 1上 · урок ") + k + " из " + ls.length }), bar(k - 1, ls.length)));
  }
  const due = dueList(d).length - (scr === "2.3" ? 0 : plan.review);
  let card;
  if (scr === "2.2") {
    const left = Math.max(1, Math.round(sessLeftMs() / MIN));
    card = h("div", { class: "card" }, h("h2", { text: "Занятие не закончено" }),
      h("p", { class: "line", test: "saved", "data-n": SESS.n, text: SESS.n + " " + plural(SESS.n, "ответ сохранён", "ответа сохранено", "ответов сохранено") + " — продолжишь с того же места." }),
      h("button", { type: "button", class: "btn main", test: "continue", "data-min": left, text: "Продолжить с места · ≈ " + left + " мин", onclick: resumeDay }));
  } else if (scr === "2.3") {
    const last = ST.last && ST.last.d === d ? ST.last : null, min = (ST.days[d] && ST.days[d].done) || 15;
    card = h("div", { class: "card" }, h("div", { class: "done-big", test: "day-done", "data-min": min }, h("span", { class: "seal", text: "✓" }), "День засчитан · " + min + " мин"),
      last && last.wrong && last.wrong.length ? h("p", { class: "line", text: "Завтра вернутся: " + last.wrong.map(id => W(id) ? W(id).hz : "").join(", ") }) : null,
      h("p", { class: "line", text: "Завтра — новое занятие на 15 минут." }),
      copyBtn("btn sec"));
  } else {
    if (scr === "2.7") body.append(h("div", { class: "card", test: "photo-hint" }, h("h2", { text: "Твоего урока пока нет" }),
      h("ol", { class: "steps" }, h("li", { text: "Сфотографируй страницу 生词 своего урока." }), h("li", { text: "Отправь фото в чат «Китайский» в приложении Claude." }), h("li", { text: "Claude добавит урок за день — он появится здесь." })),
      h("p", { class: "line", text: "Пока занимаемся повторением, тонами и догоняем 1上." })));
    card = h("div", { class: "card" }, h("h2", { text: "Занятие на 15 минут" }), h("ul", { class: "plan" }, planLines(plan).map(t => h("li", { text: t }))),
      h("button", { type: "button", class: "btn main", test: "start", "data-min": 15, text: "Начать · 15 минут", onclick: beginDay }));
  }
  body.append(card);
  if (due > 0) body.append(h("p", { class: "line", test: "due", "data-n": due, text: (scr === "2.3" ? "Ждут повторения: " : "И ещё ") + due + " " + plural(due, "слово", "слова", "слов") + (scr === "2.3" ? " — завтра." : " ждут повторения — возьмём завтра.") }));
  const ps = L ? Snd.state(L) : null;
  if (ps && ps.n < ps.of) body.append(h("p", { class: "line", test: "pack", "data-n": ps.n, "data-of": ps.of, text: "Звук урока " + lessonNum(L) + (navigator.onLine === false ? ": скачан на " : " качается… ") + Math.round(ps.n / Math.max(1, ps.of) * 100) + " %" }));
  mount(h("section", { class: "scr tabbed", "data-screen": scr, "data-tab": "today" }, body, tabs("today")));
  if (UI.updated) { const v = UI.updated; UI.updated = null; showUpdated(v); }
  if (scr === "2.3") prebuildPack();
}
function showUpdated(v) {
  if (UI.inSession) return;
  const p = overlay(h("div", { class: "plate", "data-overlay": "1.9", "data-version": VERSION, role: "status", text: "Обновлено: новая версия приложения" + (v ? " (" + v + ")" : "") }));
  setTimeout(() => p.remove(), 3000);
}

/* ---------- занятие ---------- */
function sessLeftMs() {
  if (!SESS) return 15 * MIN;
  let left = 0;
  SESS.parts.forEach((pt, i) => {
    if (i < SESS.pi) return;
    const qs = pt.q ? pt.q.slice(pt.i) : null;
    const est = qs ? qs.reduce((a, q) => a + estMs(q), 0) : PART_MS[pt.p];
    left += Math.max(0, Math.min(est, PART_MS[pt.p] * 1.2 - (pt.ms || 0)));
  });
  return left;
}
function tick(force) {
  const now = Date.now();
  if (SESS && Run.lastTick && (force || !document.hidden)) {
    const dt = Math.min(now - Run.lastTick, 90000);
    SESS.act += dt; const pt = SESS.parts[SESS.pi]; if (pt) pt.ms = (pt.ms || 0) + dt;
  }
  Run.lastTick = now;
}
function commit(evs, extra) {
  const kv = Object.assign({ st: ST, sess: SESS }, extra || {});
  const snap = JSON.parse(JSON.stringify(kv));
  try { localStorage.setItem("zh2-id", JSON.stringify({ dev: ST.dev, lesson: ST.lesson, copy: ST.copy })); } catch (e) {} // на случай потери снимка
  Run.saving = Run.saving.then(() => DB.commit(evs, snap)).catch(async e1 => {
    try { await DB.reopen(); return await DB.commit(evs, snap); } // один повтор с новым соединением
    catch (e2) { saveFailed(errText(e2 || e1)); }
  });
  return Run.saving;
}
function saveFailed(why) { // запись не проходит — честно говорим и пишем в журнал при следующем запуске
  try { localStorage.setItem("zh2-savefail", JSON.stringify({ t: Date.now(), why: String(why).slice(0, 160) })); } catch (e) {}
  if ($("[data-test=save-fail]")) return;
  document.body.append(h("div", { class: "plate warn", test: "save-fail", role: "alert", text: "Не сохраняется — закрой и открой приложение" }));
}
function beginDay() {
  Player.unlock();
  const plan = planDay(), t = Date.now();
  SESS = { id: rid(), d: plan.d, t0: t, parts: plan.parts.map(p => ({ p, q: null, i: 0, ms: 0 })), pi: 0, n: 0, act: 0, newN: plan.newN, wrong: [], again: false,
    st: { tones: [0, 0], recall: [0, 0], newW: [], newOf: 0, check: null } };
  Run.lastTick = t;
  commit([{ k: "S", t, s: SESS.id, d: plan.d, parts: plan.parts.join(","), L: plan.L }]);
  UI.inSession = true;
  nextQuestion();
}
function resumeDay() { Player.unlock(); Run.lastTick = Date.now(); UI.inSession = true; nextQuestion(); }
function partDone(pt) {
  if (!pt.q) return false;
  if (pt.i >= pt.q.length) return true;
  const q = pt.q[pt.i];
  if (q.again) return false;
  if (pt.p === "check") return pt.ms > PART_MS.check * 1.5;
  if (pt.p === "new" && q.x !== "4.1") return false;
  return pt.ms > PART_MS[pt.p] * 1.15;
}
function nextQuestion() {
  if (!SESS) return renderToday();
  tick();
  Run.answered = false; Run.plays = 0; Run.rec = null; Run.noSound = false;
  for (let guard = 0; guard < 500; guard++) {
    const pt = SESS.parts[SESS.pi];
    if (!pt) {
      // ошибки — ещё раз в конце занятия
      const wrong = SESS.wrong.filter(id => W(id) && playable(id));
      if (!SESS.again && wrong.length) {
        SESS.again = true; SESS.pi = SESS.parts.length - 1;
        const last = SESS.parts[SESS.pi];
        wrong.forEach(id => { const q = q48(id, last.p); q.again = true; last.q.push(q); });
        continue;
      }
      return finishDay();
    }
    if (!pt.q) { pt.q = buildPart(pt.p, { d: SESS.d, L: curLesson(), newN: SESS.newN }, SESS); if (pt.p === "new") SESS.st.newOf = pt.q.filter(q => q.x === "4.1").length;
      if (pt.p === "recall" && !SESS.again) { // ошибки дня — перед «Скажи по памяти», чтобы после записи звука было меньше
        const rep = SESS.wrong.filter(id => W(id) && playable(id)).map(id => { const x = q48(id, pt.p); x.again = true; return x; });
        if (rep.length) { SESS.again = true; pt.q = rep.concat(pt.q); }
      }
      commit([]); }
    if (partDone(pt)) {
      if (pt.p === "check" && !SESS.st.check) {
        const L = curLesson(), qs = pt.q.filter(q => q.x === "4.8" && q.r != null);
        SESS.st.check = { l: L, n: qs.filter(q => q.r === 2).length, of: qs.length };
        const ev = { k: "C", t: Date.now(), d: SESS.d, l: L, n: SESS.st.check.n, of: SESS.st.check.of }; apply(ev); commit([ev]);
      }
      SESS.pi++; continue;
    }
    const q = pt.q[pt.i];
    const listen = q.x === "4.8" || q.x === "4.3" || q.x === "4.4";
    if ((listen && listenOff()) || (q.x === "4.9" && micOff()) || !W(q.w) || (q.o && q.x !== "4.3" && q.o.some(o => !W(o)))
      || ((listen || q.x === "4.1" || q.x === "4.2") && clipOf(q.w) && SND_FAILED.has(absUrl(clipOf(q.w))))) { pt.i++; continue; } // звук слова недоступен — пропуск без тишины // снятое слово или «не могу» — пропуск
    Run.q = q; Run.shownAt = Date.now();
    return showQ(q, pt);
  }
  finishDay();
}
function skipQ(why) {
  if (!SESS) return;
  const pt = SESS.parts[SESS.pi];
  commit([{ k: "skip", t: Date.now(), w: Run.q && Run.q.w, why, s: SESS.id }]);
  if (pt && Run.q && pt.q[pt.i] === Run.q && !Run.answered) pt.i++;
  nextQuestion();
}
function head(pt) {
  const i = SESS.parts.indexOf(pt), n = Math.min(pt.i + 1, pt.q.length), of = pt.q.length;
  const parts = SESS.parts.map((x, j) => h("div", { class: "part", test: "part", "data-part": x.p, "data-state": j < i ? "done" : j === i ? "now" : "todo", style: j === i ? "--p:" + Math.max(6, Math.round(pt.i / Math.max(1, of) * 100)) + "%" : null }, h("i")));
  const left = Math.max(1, Math.ceil(sessLeftMs() / MIN));
  return h("div", { class: "shead", test: "session-head" },
    h("button", { type: "button", class: "btn icon", test: "close", "aria-label": "Пауза", html: I.x, onclick: pause }),
    h("div", { class: "parts", test: "progress" }, parts),
    h("div", { class: "tleft", test: "time-left", "data-min": left, text: "≈ " + left + " мин" }),
    h("span", { test: "counter", "data-n": n, "data-of": of, hidden: true }));
}
function partLabel(pt) {
  const n = Math.min(pt.i + 1, pt.q.length), of = pt.q.length, q = pt.q[Math.min(pt.i, pt.q.length - 1)];
  if (pt.p === "new" && q) { // считаем слова, а не экраны (методист, Н5)
    const intro = pt.q.filter(x => x.x === "4.1"), quiz = pt.q.filter(x => x.x === "4.8");
    const t = q.x === "4.1" ? "слово " + (intro.indexOf(q) + 1) + " из " + intro.length : q.x === "4.2" ? "только на слух" : "проверка " + (quiz.indexOf(q) + 1) + " из " + quiz.length;
    return h("div", { class: "elabel", text: "Новое · " + t });
  }
  const name = pt.p === "check" ? "Проверка урока " + lessonNum(curLesson()) : PARTS[pt.p];
  return h("div", { class: "elabel", text: name + " · " + n + " из " + of });
}
function exScreen(q, pt, screen, kids, zone, extra, top) {
  const w = W(q.w);
  const root = h("section", Object.assign({ class: "scr ex", "data-screen": screen, "data-part": pt.p, "data-word": q.w, "data-lesson": lessonNum(w.l) }, extra || {}),
    head(pt), h("div", { class: "ebody" }, h("div", { class: "erow" }, partLabel(pt), top || null), kids), zone);
  mount(root);
  return root;
}
function showQ(q, pt) {
  if (q.x === "4.1") return showNew(q, pt);
  if (q.x === "4.2") return showPassive(q, pt);
  if (q.x === "4.9") return showSay(q, pt);
  return showChoice(q, pt);
}
function showChoice(q, pt) {
  const w = W(q.w), url = clipOf(q.w);
  const T = { "4.8": ["Что ты услышал?", "Выбери перевод"], "4.3": ["Какой тон?", "Слушай и выбери тоны"], "4.4": ["Тот же слог — другой тон", "Какое слово прозвучало?"] }[q.x];
  const btns = q.o.map((o, i) => {
    const attrs = { type: "button", class: "opt", test: "opt", "data-state": "idle", "data-correct": i === q.c ? "true" : "false" };
    let inner;
    if (q.x === "4.3") { attrs["data-tones"] = o; inner = h("span", { class: "tones", html: tonesHTML(o.split(" ").map(Number)) }); }
    else inner = h("span", { text: W(o) ? W(o).ru : "?" });
    return h("button", attrs, inner, h("span", { class: "mark", "aria-hidden": "true" })); // значок ✓/✗ — место заранее, вариант не сдвигается
  });
  btns.forEach((b, i) => b.addEventListener("click", () => choose(q, i, btns)));
  const pb = playBtn(url, "big");
  const kids = [h("div", { class: "etitle", text: T[0] }), h("div", { class: "ehint", text: q.x === "4.3" ? w.hz + " — " + (tonesOf(w.py).length === 1 ? "слушай и выбери тон" : "слушай и выбери тоны") : T[1] }),
    h("div", { class: "playrow" }, pb, q.x !== "4.4" ? slowBtn(q.w) : null),
    h("div", { class: "opts" + (q.x === "4.4" ? " two" : "") }, btns)];
  const zone = h("div", { class: "zone" }); // место под панель «Верно / Не так»; «не могу слушать» — наверху, не под «Дальше»
  exScreen(q, pt, q.x, kids, zone, null, h("button", { type: "button", class: "btn link", test: "cant-listen", text: "Не могу слушать", onclick: cantListen }));
  Player.play(url, { btn: pb }).then(r => { if (r === "missing") onMissing(pb); });
}
function cantListen() {
  ST.set.noListen = Date.now() + 60 * MIN;
  toast("Задания со звуком убраны на час");
  commit([{ k: "off", t: Date.now(), what: "listen" }]);
  skipQ("cant-listen");
}
function trapOf(q, right) {
  const w = W(q.w);
  if (q.x === "4.4") { const o = W(q.o[1 - q.c]); return w.hz + " " + w.py + " — " + w.ru + "; " + o.hz + " " + o.py + " — " + o.ru; }
  return w.nt || null;
}
function choose(q, i, btns) {
  if (Run.answered) return;
  const p35 = $("[data-overlay='3.5']"); if (p35) p35.remove(); // ответил, хотя звук не пришёл, — панель «не скачан» уходит, «Дальше» одна
  Run.answered = true;
  const right = i === q.c, now = Date.now();
  btns.forEach((b, j) => {
    b.disabled = true;
    b.setAttribute("data-state", j === i ? (right ? "picked-right" : "picked-wrong") : j === q.c ? "reveal" : "off");
    if (j === i) { const m = b.querySelector(".mark"); if (m) m.textContent = right ? "✓" : "✗"; }
  });
  Player.ding(right);
  answer(q, right ? 2 : 0, q.x === "4.8" ? "h" : "t", now);
  const w = W(q.w), url = clipOf(q.w), pb = playBtn(url, "sm");
  const trap = trapOf(q, right);
  const showTrap = trap && (!right || q.x === "4.3"), again = !right && !q.again;
  const panel = h("div", { class: "panel " + (right ? "ok" : "bad"), "data-overlay": right ? "3.3" : "3.4", role: "status" },
    h("div", { class: "ttl" }, h("span", { text: right ? "✓ Верно" : "✗ Не так" }), pb),
    h("div", { class: "ans", test: right ? null : "answer", "data-word": q.w }, h("span", { class: "hz", text: w.ph ? w.ph.hz : w.hz }), h("span", { class: "pyp", html: pyHTML(w.ph ? w.ph.py : w.py) }), h("span", { text: w.ru })),
    showTrap || again ? h("p", { class: "trap" }, showTrap ? h("span", { test: right ? null : "trap", text: trap + " " }) : null, again ? h("span", { class: "mut", text: "Вернётся в конце занятия." }) : null) : null,
    h("button", { type: "button", class: "btn main", test: "next", text: right ? "Дальше" : "Понятно", onclick: nextQuestion }));
  const zone = $(".zone"); zone.append(panel);
  $$("[data-test=cant-listen]").forEach(x => { x.hidden = true; });
  if (!right) Player.play(url, { btn: pb });
}
function answer(q, r, sk, now) {
  if (!SESS) return;
  tick();
  const pt = SESS.parts[SESS.pi], d = dayNum(now);
  const ev = { k: "a", t: now, d, w: q.w, sk, x: q.x, r, pl: Run.plays, ms: Math.min(now - Run.shownAt, 120000), s: SESS.id, p: pt.p };
  if (q.again) ev.ag = 1;
  if (Run.noSound) ev.ns = 1; // «без звука»
  apply(ev);
  q.r = r; SESS.n++; pt.i++;
  if (r === 0 && !q.again && !SESS.wrong.includes(q.w)) SESS.wrong.push(q.w);
  if (sk === "t" && pt.p === "tones") { SESS.st.tones[1]++; if (r === 2) SESS.st.tones[0]++; } // в итоге — только блок «Тоны» (как в плане 10–15)
  if (q.x === "4.9") { SESS.st.recall[1]++; if (r === 2) SESS.st.recall[0]++; }
  commit([ev]);
}
function showNew(q, pt) {
  const w = W(q.w), t = tonesOf(w.py), ex = w.ex && C.x[w.ex];
  const voices = ["f", "m"].filter(v => w.s && w.s[v]).map(v => {
    const b = h("button", { type: "button", class: "vbtn", test: "play", "data-voice": v, "data-state": "idle", html: I.play.replace("<svg", '<svg width="20" height="20"') + (v === "f" ? " Женский" : " Мужской") });
    b.addEventListener("click", () => { Run.plays++; Player.play(w.s[v], { btn: b }).then(r => { if (r === "missing") onMissing(b); }); });
    return b;
  });
  const sl = h("button", { type: "button", class: "vbtn", test: "slow", "data-state": "idle", html: I.slow.replace("<svg", '<svg width="20" height="20"') + " Медленно" });
  sl.addEventListener("click", () => { Run.plays++; const s = slowUrl(q.w); Player.play(s || clipOf(q.w), { btn: sl, slow: !s }).then(r => { if (r === "missing") onMissing(sl); }); });
  const len = Array.from(w.hz).length;
  const kids = [h("div", { class: "newcard" },
    h("div", { class: "tzg hz" + (len > 1 ? " w" + Math.min(len, 4) : ""), test: "char", text: w.hz }),
    h("div", { class: "py", test: "pinyin", "data-tones": t.join(" "), html: pyHTML(w.py) + " " + t.map(x => '<span class="t' + x + '">' + glyph(x).replace("<svg", '<svg width="22" height="22"') + "</span>").join("") }),
    h("div", { class: "ru", text: w.ru }),
    w.ph ? h("div", { class: "excard" }, h("div", { class: "t" }, h("div", { class: "hz", html: esc(w.ph.hz).split(esc(w.hz)).join("<mark>" + esc(w.hz) + "</mark>") }), h("div", { html: pyHTML(w.ph.py) }), w.ph.ru ? h("div", { class: "mut", text: w.ph.ru + " · звучит во фразе" }) : null)) : null,
    h("div", { class: "voices" }, voices, sl),
    ex ? h("div", { class: "excard", test: "example" }, playBtn(clipOf(w.ex), "sm"), h("div", { class: "t" }, h("div", { class: "hz", text: ex.hz }), h("div", { html: pyHTML(ex.py) }), h("div", { class: "mut", text: ex.ru }))) : null,
    h("div", { class: "tag", text: w.cl ? "Учим слышать и говорить · урок сверим по фото" : "Учим слышать и говорить" }))];
  const zone = h("div", { class: "zone low" }, h("button", { type: "button", class: "btn main", test: "next", text: "Дальше", onclick: () => introDone(q, "n") }));
  exScreen(q, pt, "4.1", kids, zone, { "data-kind": "active" });
  if (voices[0]) voices[0].click();
}
function showPassive(q, pt) {
  const w = W(q.w), ex = w.ph || (w.ex && C.x[w.ex]), part = w.k === "q" && ex; // частица — только во фразе (manifest контент-мастера или реплика диалога)
  const url = w.ph ? clipOf(q.w) : part ? clipOf(w.ex) : clipOf(q.w), pb = playBtn(url, "big");
  const kids = part
    ? [h("div", { class: "etitle", text: "Частица во фразе" }), h("div", { class: "playrow" }, pb),
      h("div", { class: "newcard" }, h("div", { class: "phrase", html: esc(ex.hz).split(esc(w.hz)).join("<mark>" + esc(w.hz) + "</mark>") }),
        h("div", { class: "py", style: "font-size:20px", html: pyHTML(ex.py) }), h("div", { class: "ru", text: ex.ru }),
        h("div", { class: "tag", text: w.hz + " " + w.py + " — " + w.ru + ". Слышим только во фразе." }))]
    : [h("div", { class: "etitle", text: "Узнай на слух" }), h("div", { class: "playrow" }, pb),
      h("div", { class: "newcard" }, h("div", { class: "tzg hz" + (Array.from(w.hz).length > 1 ? " w" + Math.min(Array.from(w.hz).length, 4) : "") , text: w.hz }),
        h("div", { class: "py", html: pyHTML(w.py) }), h("div", { class: "ru", text: w.ru }), h("div", { class: "tag", text: "Только узнать на слух — говорить не нужно" }))];
  const zone = h("div", { class: "zone low" }, h("button", { type: "button", class: "btn main", test: "next", text: "Дальше", onclick: () => introDone(q, "q") }));
  exScreen(q, pt, "4.2", kids, zone, { "data-kind": w.k === "q" ? "particle" : "passive" });
  Player.play(url, { btn: pb }).then(r => { if (r === "missing") onMissing(pb); });
}
function introDone(q, k) {
  if (Run.answered || !SESS) return;
  Run.answered = true;
  tick();
  const pt = SESS.parts[SESS.pi], now = Date.now(), ev = { k, t: now, d: dayNum(now), w: q.w, x: q.x, s: SESS.id, p: pt.p, ms: Math.min(now - Run.shownAt, 300000) };
  apply(ev); pt.i++;
  if (k === "n") SESS.st.newW.push(q.w);
  commit([ev]);
  nextQuestion();
}

/* ---------- 4.9–4.11, 4.13: скажи по памяти ---------- */
function showSay(q, pt) {
  const w = W(q.w);
  const mic = h("button", { type: "button", class: "mic", test: "mic", "data-state": "idle", "aria-label": "Нажми и говори", html: I.mic, onclick: () => startRec(q, pt) });
  const kids = [h("div", { class: "etitle", text: "Скажи по-китайски" }), h("div", { class: "prompt", test: "prompt", text: w.ru }),
    h("div", { class: "center", style: "display:grid;gap:6px;justify-items:center;margin-top:8px" }, mic, h("div", { class: "ehint", text: "Нажми и говори" })),
    h("button", { type: "button", class: "btn link", test: "reveal", style: "align-self:center;margin-top:6px", text: "Не вспомнил — показать", onclick: () => showSayResult(q, pt, null) })];
  exScreen(q, pt, "4.9", kids, h("div", { class: "zone low" }), null, h("button", { type: "button", class: "btn link", test: "cant-speak", text: "Не могу говорить", onclick: cantSpeak }));
}
function cantSpeak() {
  ST.set.micOff = Date.now() + 60 * MIN;
  toast("Микрофон выключен на час — «скажи» вернётся позже");
  commit([{ k: "off", t: Date.now(), what: "mic" }]);
  skipQ("cant-speak");
}
async function startRec(q, pt) {
  if (Mic.recording) return;
  const w = W(q.w);
  const tStart = performance.now(); // второе касание в первые 600 мс (двойное) запись не останавливает
  const mic = h("button", { type: "button", class: "mic", test: "mic", "data-state": "recording", "aria-label": "Стоп", html: I.stop, onclick: () => { if (Mic.stopNow && performance.now() - tStart > 600) Mic.stopNow(); } });
  const lv = h("div", { class: "level", test: "level" }, Array.from({ length: 9 }, () => h("i")));
  const secs = h("div", { class: "ehint center", text: "Слушаю… 0,0 с" });
  const kids = [h("div", { class: "etitle", text: "Скажи по-китайски" }), h("div", { class: "prompt", test: "prompt", text: w.ru }),
    h("div", { style: "display:grid;justify-items:center;gap:4px" }, mic, lv, secs, h("div", { class: "ehint", text: "Остановлю сам после паузы — или нажми" }))];
  exScreen(q, pt, "4.10", kids, h("div", { class: "zone low" }));
  const bars = $$("i", lv), t0 = Date.now(); let k = 0;
  const onLevel = r => { const x = Math.min(1, Math.sqrt(r) * 3.2); bars[k % bars.length].style.height = Math.round(6 + x * 50) + "px"; k++; secs.textContent = "Слушаю… " + ((Date.now() - t0) / 1000).toFixed(1).replace(".", ",") + " с"; };
  try {
    const rec = await Mic.record(3500, onLevel); // до 4 с (3,5), сама — после ~0,8 с тишины после голоса
    Run.rec = rec;
    showSayResult(q, pt, rec);
  } catch (e) {
    const why = e && e.reason ? e.reason : "no-mic";
    commit([{ k: "M", t: Date.now(), why, e: e && e.err ? String(e.err).slice(0, 120) : errText(e) }]);
    showMicTrouble(q, pt, why);
  }
}
const MIC_TXT = {
  denied: ["Нет доступа к микрофону", "iPhone спросит ещё раз — нажми «Разрешить». Не спрашивает? Настройки → Safari → Микрофон → «Спрашивать»."],
  "no-mic": ["Микрофон не нашёлся или занят", "Закончи звонок или диктофон и нажми «Ещё раз». В WeChat и Telegram микрофон не работает — открой «Китайский» с экрана «Домой»."],
  silent: ["Ничего не услышал", "Нажми, дождись, пока кнопка станет красной, и скажи слово целиком. Держи телефон сантиметрах в 20 от рта."]
};
function showMicTrouble(q, pt, why) {
  const t = MIC_TXT[why] || MIC_TXT["no-mic"];
  const kids = [h("div", { class: "etitle", text: "Микрофон" }), h("div", { class: "card" }, h("h2", { test: "reason", text: t[0] }), h("p", { class: "line", test: "help", text: t[1] }))];
  const zone = h("div", { class: "zone low" },
    h("button", { type: "button", class: "btn main", test: "retry", text: "Ещё раз", onclick: () => startRec(q, pt) }),
    h("button", { type: "button", class: "btn sec", test: "skip-rec", text: "Пропустить запись", onclick: () => showSayResult(q, pt, null) }));
  exScreen(q, pt, "4.13", kids, zone, { "data-reason": why });
}
function showSayResult(q, pt, rec) {
  const w = W(q.w), url = clipOf(q.w), syl = sylls(w.py).map(s => s.s);
  const gwrap = h("div", { class: "gwrap" });
  const refB = playBtn(url, "sm", { "data-voice": "ref", class: "vbtn", html: "▶ Диктор" });
  const row = h("div", { class: "brow" });
  if (rec) {
    const meUrl = URL.createObjectURL(makeWav(downsample(rec.pcm, rec.rate, 16000), 16000));
    const meB = h("button", { type: "button", class: "vbtn", test: "play", "data-voice": "me", "data-state": "idle", text: "▶ Я" });
    meB.addEventListener("click", () => Player.play(meUrl, { btn: meB, raw: true }));
    row.append(meB);
    gwrap.innerHTML = graphSVG(null, null, syl);
    const me = contour(pitchTrack(rec.pcm, rec.rate));
    refContour(url).then(ref => { if (gwrap.isConnected) gwrap.innerHTML = graphSVG(ref, me, syl); });
  }
  row.append(refB, h("button", { type: "button", class: "vbtn", test: "retry", text: "Ещё раз", onclick: () => startRec(q, pt) }));
  const grade = (g, label) => h("button", { type: "button", class: "btn", test: "grade", "data-grade": g, text: label, onclick: () => {
    if (Run.answered) return; Run.answered = true; answer(q, g, "s", Date.now()); nextQuestion();
  } });
  const kids = [h("div", { class: "wordline" }, h("span", { class: "hz", text: w.hz }), h("span", { class: "py", style: "font-size:20px", html: pyHTML(w.py) }), h("span", { text: w.ru })),
    rec ? gwrap : h("p", { class: "line", text: "Записи нет — послушай диктора, скажи про себя и отметь честно." }),
    rec ? h("div", { class: "legend" }, h("span", { class: "me", text: "ты" }), h("span", { class: "ref", text: "диктор" })) : null,
    row, h("p", { class: "note", test: "honest-note", text: "Тон по слогам пока не оцениваю — сравни на слух и по линии." })];
  const zone = h("div", { class: "zone low" }, h("div", { class: "ehint", text: "Как вспомнил?" }),
    h("div", { class: "grades" }, grade(0, "Не вспомнил"), grade(1, "Почти"), grade(2, "Знал")));
  exScreen(q, pt, "4.11", kids, zone, { "data-rec": rec ? "graph" : "none" });
  if (!rec) Player.play(url, { btn: refB });
}
function downsample(pcm, from, to) {
  if (from === to) return pcm;
  const r = from / to, n = Math.floor(pcm.length / r), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = Math.floor(i * r), b = Math.min(pcm.length, Math.floor((i + 1) * r)); let s = 0; for (let j = a; j < b; j++) s += pcm[j]; out[i] = s / Math.max(1, b - a); }
  return out;
}

/* ---------- 3.2 пауза, конец дня, 5.1 ---------- */
function pause() {
  if (!SESS || $("[data-overlay='3.2']")) return;
  Player.stop(); if (Mic.stopNow) Mic.stopNow();
  tick(); commit([]);
  const close = () => { closeOv("[data-overlay='3.2']"); Run.lastTick = Date.now(); };
  overlay(h("div", { class: "shade", "data-overlay": "3.2" }, h("div", { class: "sheet" }, h("div", { class: "grab" }),
    h("h2", { text: "Пауза" }),
    h("p", { test: "saved", "data-n": SESS.n, text: (SESS.n ? "Всё сохранено (" + SESS.n + " " + plural(SESS.n, "ответ", "ответа", "ответов") + ")" : "Всё сохранено") + ". Продолжишь с этого места." }),
    h("button", { type: "button", class: "btn main", test: "resume", text: "Продолжить", onclick: close }),
    h("button", { type: "button", class: "btn sec", test: "home", text: "Выйти на «Сегодня»", onclick: () => { close(); UI.inSession = false; Player.stop(); if (UI.reloadPending) return reloadNow(); renderToday(); } }),
    h("p", { class: "line", text: "Жест «назад» тоже ставит паузу." }))));
}
function finishDay() {
  tick();
  const s = SESS, now = Date.now(), d = s.d != null ? s.d : dayNum(now), min = Math.max(1, Math.round(s.act / MIN));
  const evs = [{ k: "F", t: now, s: s.id, d, min, n: s.n }];
  const first = !dayDone(d);
  if (first) evs.push({ k: "D", t: now, d, min });
  evs.forEach(apply);
  ST.last = { d, min, st: s.st, wrong: s.wrong.slice(0, 12), first };
  SESS = null; UI.inSession = false;
  commit(evs);
  showSummary();
}
function showSummary() {
  const last = ST.last, st = last.st, d = last.d, nl = st.newW.map(id => W(id) ? W(id).hz : "").join(" ");
  const ck = st.check;
  const body = h("div", { class: "body" },
    h("div", { class: "done-big", test: "day-done", "data-min": last.min }, h("span", { class: "seal", text: "✓" }), "День засчитан"),
    h("p", { class: "line", test: "streak", "data-days": streak(), text: last.min + " мин · " + streak() + " " + plural(streak(), "день", "дня", "дней") + " подряд" }),
    h("div", { class: "skills" },
      h("div", { class: "skill", test: "skill", "data-skill": "tones", "data-n": st.tones[0], "data-of": st.tones[1] }, h("span", { text: "Тоны на слух" }), h("b", { text: st.tones[1] ? st.tones[0] + " из " + st.tones[1] : "сегодня не было" })),
      h("div", { class: "skill", test: "skill", "data-skill": "new", "data-n": st.newW.length, "data-of": st.newOf }, h("span", { text: "Новые слова" + (nl ? ": " : "") }), h("b", { class: "hz", html: st.newW.length ? st.newW.filter(W).map(id => esc(W(id).hz) + " " + pyHTML(W(id).py)).join(" · ") : "сегодня не было" })),
      h("div", { class: "skill", test: "skill", "data-skill": "recall", "data-n": st.recall[0], "data-of": st.recall[1] }, h("span", { text: "Скажи по памяти" }), h("b", { text: st.recall[1] ? "знал " + st.recall[0] + " из " + st.recall[1] : "сегодня не было" }))),
    ck ? h("p", { class: "card", test: "check-line", "data-lesson": lessonNum(ck.l), text: "Урок " + lessonNum(ck.l) + ": узнал " + ck.n + " из " + ck.of + ". Узнанные вернутся через 3–7 дней, остальные — новыми словами." }) : null,
    h("p", { class: "line", test: "tomorrow", text: last.wrong.length ? "Завтра вернутся: " + last.wrong.map(id => W(id) ? W(id).hz : "").join(", ") : "Ошибок нет — завтра только то, что по сроку." }),
    copyBtn("btn sec"));
  mount(h("section", { class: "scr", "data-screen": "5.1" }, body,
    h("div", { class: "foot" }, h("button", { type: "button", class: "btn main", test: "done", text: "На сегодня всё", onclick: () => renderToday() }))));
  prebuildPack();
}

/* ---------- 8.1 Я, 8.2 настройки ---------- */
function sentInfo(pending) {
  const c = ST.copy, at = c.t ? new Date(c.t).toISOString() : "";
  const state = !c.t ? "never" : (Date.now() - c.t > 2 * DAY_MS && pending > 0 ? "stale" : "ok");
  const text = !c.t ? "Ещё не копировал прогресс для Claude." : "Скопировано для Claude: " + whenText(c.t) + " · с тех пор " + pending + " " + plural(pending, "запись", "записи", "записей");
  return { at, state, text };
}
function renderMe() {
  UI.tab = "me"; UI.sub = null;
  const d = dayNum(); let days7 = 0; for (let k = d - 6; k <= d; k++) if (dayDone(k)) days7++;
  const ids = Object.keys(ST.w).filter(id => W(id)), kn = ids.filter(known).length, le = ids.filter(learned).length;
  const sent = h("div", { class: "card", test: "sent", "data-at": "", "data-pending": 0, "data-state": "never" }, h("p", { text: "…" }));
  const body = h("div", { class: "body" }, h("h1", { text: "Я", style: "margin-bottom:12px" }),
    h("div", { class: "card" }, h("p", { test: "streak", "data-days": streak(), text: "Серия: " + streak() + " " + plural(streak(), "день", "дня", "дней") + " подряд" }),
      h("p", { class: "line", text: "Дни занятий за неделю: " + days7 + " из 7" }),
      h("p", { class: "line", text: ids.length ? "Слов встретил: " + ids.length + " · выучено (вспомнил вслух через неделю и позже): " + le : "Слов пока нет — начни первое занятие." })),
    sent, copyBtn("btn main"),
    h("button", { type: "button", class: "row", test: "settings", style: "margin-top:14px", onclick: renderSettings }, h("span", { text: "Настройки" }), h("span", { class: "chev", text: "›" })),
    h("p", { class: "line", text: "Не очищай данные Safari — сотрёт прогресс на телефоне." }));
  mount(h("section", { class: "scr tabbed", "data-screen": "8.1", "data-tab": "me" }, body, tabs("me")));
  pendingCount().then(n => {
    const s = sentInfo(n); sent.setAttribute("data-at", s.at); sent.setAttribute("data-pending", n); sent.setAttribute("data-state", s.state);
    sent.firstChild.textContent = s.text;
    if (s.state === "stale") sent.append(h("p", { class: "line", text: "Скопируй для Claude — он увидит, как идут дела." }));
  });
  prebuildPack();
}
function renderSettings() {
  UI.sub = "settings";
  const L = curLesson(), mode = lessonMode();
  const theme = v => h("button", { type: "button", class: "btn", test: "theme", "data-value": v, "aria-pressed": ST.set.theme === v ? "true" : "false", text: { auto: "Как iPhone", light: "Светлая", dark: "Тёмная" }[v], onclick: () => { setTheme(v); renderSettings(); } });
  const done = Snd.lessonsDone(), all = LESSONS.length, mb = Snd.totalMb(), pk = packNow();
  const dl = h("button", { type: "button", class: "btn sec", test: "download-all", "data-mb": mb, disabled: done === all || navigator.onLine === false,
    text: done === all ? "Весь звук скачан ✓" : "Скачать весь звук — " + String(mb).replace(".", ",") + " МБ", onclick: () => downloadAll(dl) });
  const mm = micOff();
  const body = h("div", { class: "body" },
    h("button", { type: "button", class: "btn link", test: "back", style: "padding-left:0", text: "‹ Я", onclick: () => renderMe() }),
    h("h1", { text: "Настройки", style: "margin:4px 0 8px" }),
    h("div", { class: "set" }, h("span", { text: "Урок на парах" }), h("button", { type: "button", class: "btn", test: "lesson-now", "data-lesson": lessonNum(L), text: mode === "lesson" ? "Урок " + lessonNum(L) : mode === "other" ? "Не из 1上" : "Догоняю 1上", onclick: lessonSheet })),
    h("div", { class: "set" }, h("span", { text: "Обычный день" }), h("b", { text: "15 минут" })),
    h("div", { class: "set" }, h("span", { text: "Тема" }), h("div", { class: "seg" }, ["auto", "light", "dark"].map(theme))),
    h("div", { class: "set" }, h("span", { test: "downloaded", "data-n": pk.n, "data-of": pk.of, text: "Звук " + pk.name + ": скачано " + pk.n + " из " + pk.of + (done ? " · уроков целиком: " + done + " из " + all : "") })),
    dl,
    h("div", { class: "set" }, h("span", { text: mm ? "Микрофон выключен до " + hhmm(ST.set.micOff) : "Не могу говорить — выключить микрофон на час" }),
      h("button", { type: "button", class: "btn sw", test: "mute-mic", "data-state": mm ? "on" : "off", "aria-pressed": mm ? "true" : "false", text: mm ? "Вкл." : "Выкл.", onclick: () => { ST.set.micOff = mm ? 0 : Date.now() + 60 * MIN; commit([{ k: "off", t: Date.now(), what: mm ? "mic-on" : "mic" }]); renderSettings(); } })),
    h("div", { style: "margin-top:14px" }, copyBtn("btn sec")),
    h("p", { class: "ver", test: "version", "data-version": VERSION, text: "Версия " + VERSION }));
  mount(h("section", { class: "scr tabbed", "data-screen": "8.2", "data-tab": "me" }, body, tabs("me")));
  prebuildPack();
}
function setTheme(v) {
  ST.set.theme = v; try { localStorage.setItem("zh2-theme", v); } catch (e) {}
  applyTheme(); commit([]);
}
function applyTheme() {
  const v = ST.set.theme || "auto";
  let dark = v === "dark"; if (v === "auto") { try { dark = matchMedia("(prefers-color-scheme: dark)").matches; } catch (e) {} }
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  const m = $("meta[name=theme-color]"); if (m) m.setAttribute("content", dark ? "#121413" : "#B23A21");
}
async function downloadAll(btn) {
  if (navigator.onLine === false) return toast("Нет интернета — скачаю, когда появится");
  btn.disabled = true;
  while (Snd.busy) await sleep(300); // фоновое скачивание урока закончится — потом всё остальное
  await Snd.download(LESSONS.map(l => l.id), p => { if (btn.isConnected) btn.textContent = "Качаю: " + p.n + " из " + p.of; });
  if (UI.sub === "settings") renderSettings();
}
function packNow() { // звук урока на парах и следующего
  const L = curLesson(), i = LESSONS.findIndex(l => l.id === L), next = LESSONS[i + 1];
  const lids = [L].concat(next ? [next.id] : []).filter(Boolean);
  let n = 0, of = 0; lids.forEach(l => { const s = Snd.state(l); n += s.n; of += s.of; });
  return { lids, n, of, name: lids.length > 1 ? "уроков " + lessonNum(lids[0]) + "–" + lessonNum(lids[1]) : "урока " + lessonNum(L) };
}
let dlTimer = 0;
function downloadSoon() { // звук урока на парах и следующего — заранее, в фоне
  clearTimeout(dlTimer);
  dlTimer = setTimeout(async () => {
    if (navigator.onLine === false || !C) return;
    const L = curLesson(), lids = packNow().lids;
    if (lids.every(l => { const s = Snd.state(l); return s.n === s.of; })) return;
    const live = () => { const pk = packNow(), el = $("[data-test=downloaded]"); if (el) { el.setAttribute("data-n", pk.n); el.setAttribute("data-of", pk.of); el.textContent = "Звук " + pk.name + ": скачано " + pk.n + " из " + pk.of; } };
    await Snd.download(lids, p => { live(); const el = $("[data-test=pack]"); if (el) { const s = Snd.state(L); el.setAttribute("data-n", s.n); el.textContent = "Звук урока " + lessonNum(L) + ": скачано " + s.n + " из " + s.of + " · качаю…"; } });
    live();
    const el = $("[data-test=pack]"); if (el) { const s = Snd.state(L); if (s.n === s.of) el.remove(); else el.textContent = "Звук урока " + lessonNum(L) + ": скачано " + s.n + " из " + s.of; }
  }, 1200);
}

/* ---------- «Скопировать для Claude»: пакет, у каждой строки короткая сумма, в шапке — общая ---------- */
const PASTE_HINT = "Приложение Claude → вкладка Code → окно 🀄 Китайский → вставь и отправь (компьютер должен быть включён)";
const CRCT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const utf8 = s => new TextEncoder().encode(s);
function crc32(s) { const b = utf8(s); let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRCT[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return ((c ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, "0"); }
async function pendingCount() { try { await Run.saving; return await DB.count(ST.copy.upto || 0); } catch (e) { return 0; } }
function readSwLog() { return Promise.race([readSwLog0(), sleep(1500).then(() => [])]); }
async function readSwLog0() {
  return new Promise(ok => {
    try {
      const r = indexedDB.open("zh2-swlog", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("ev", { autoIncrement: true });
      r.onerror = () => ok([]);
      r.onsuccess = () => { const db = r.result; try { const q = db.transaction("ev").objectStore("ev").getAll(); q.onsuccess = () => { ok((q.result || []).slice(-6)); db.close(); }; q.onerror = () => { ok([]); db.close(); }; } catch (e) { ok([]); } };
    } catch (e) { ok([]); }
  });
}
async function buildPack() {
  await Run.saving;
  const from = ST.copy.prev || 0; // с перекрытием: прошлый пакет + новое — потерянная вставка не страшна, повторы убирает приём
  const rows = await DB.since(from, 20000);
  const d = dayNum(), ids = Object.keys(ST.w).filter(id => W(id));
  let a = 0, r = 0, days7 = 0; for (let k = d - 6; k <= d; k++) { if (ST.days[k]) { a += ST.days[k].a || 0; r += ST.days[k].r || 0; } if (dayDone(k)) days7++; }
  const m = lessonMode(), L = curLesson(), sw = await readSwLog();
  const head = [
    "КИТАЙСКИЙ → Claude · прогресс · " + dayStr(d).split("-").reverse().join(".") + " " + hhmm(Date.now()) + " · версия " + VERSION,
    "Серия " + streak() + " · сегодня " + (dayDone(d) ? "засчитан (" + ST.days[d].done + " мин)" : "не засчитан") + " · урок на парах: " + (m === "lesson" ? lessonNum(L) : m === "other" ? "не из 1上, догоняю " + lessonNum(L) : "не знаю, догоняю " + lessonNum(L)),
    "Знаю слов " + ids.filter(known).length + " · выучено " + ids.filter(learned).length + " · ждут повторения " + dueList(d).length + " · за 7 дней: дней " + days7 + ", ответов " + a + (a ? ", верно " + Math.round(r / a * 100) + " %" : ""),
    "С «Домой»: " + (document.documentElement.getAttribute("data-standalone") === "true" ? "да" : "нет") + " · звук после записи: " + AFTER_REC + " · audioSession: " + (navigator.audioSession ? "есть" : "нет") + " · " + (navigator.userAgent.match(/OS [\d_]+/) || [""])[0].replace(/_/g, "."),
    "Service worker: " + (sw.length ? sw.map(e => hhmm(e.t) + " " + e.k + (e.from ? " " + e.from : "") + (e.err ? " ✗" + e.err : "") + (e.on === false ? " без сети" : "")).join(" | ") : "журнала нет"),
    "Устройство: " + ST.dev + " · события с №" + (from + 1),
    "Вставь это сообщение целиком в чат «Китайский» — Claude сам положит его в файл (progress.py import)."
  ];
  const lines = rows.map(x => { const body = JSON.stringify(x.v); return "#" + String(x.k).padStart(6, "0") + " " + body + " ·" + crc32(body).slice(0, 4); });
  const last = rows.length ? rows[rows.length - 1].k : from, LIMIT = 18 * 1024 - 1500, parts = []; // вставка > 20 КБ с iPhone не проверена — части ≤ 18 КБ
  let cur = [], size = 0;
  for (const ln of lines) { const b = utf8(ln).length + 1; if (cur.length && size + b > LIMIT) { parts.push(cur); cur = []; size = 0; } cur.push(ln); size += b; }
  if (cur.length || !parts.length) parts.push(cur);
  const texts = parts.map((pl, i) => {
    const all = pl.join("\n"), sum = crc32(all), hd = i === 0 ? head.slice() : [head[0], head[head.length - 2]];
    if (parts.length > 1) hd[0] += " · часть " + (i + 1) + " из " + parts.length;
    return hd.join("\n") + "\n=== ПРОВЕРКА ВСТАВКИ · строк " + pl.length + " · байт " + utf8(all).length + " · контроль " + sum + " ===\n" + all + (all ? "\n" : "") + "=== КОНЕЦ · строк " + pl.length + " · контроль " + sum + " ===";
  });
  return { texts, text: texts[0], from, upto: Math.max(last, ST.copy.upto || 0), rows: lines.length };
}
function prebuildPack() { buildPack().then(p => { UI.pack = p; UI.packAt = Date.now(); UI.packPart = 0; }, e => logErr("пакет: " + errText(e))); }
function copyText(t) {
  return new Promise(done => {
    const fallback = () => {
      const ta = h("textarea", { readonly: true, style: "position:fixed;left:-9999px;top:0" }); ta.value = t; document.body.append(ta);
      ta.select(); try { ta.setSelectionRange(0, t.length); } catch (e) {}
      let ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
      ta.remove(); done(ok);
    };
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(() => done(true), fallback); return; } } catch (e) {}
    fallback();
  });
}
function copyBtn(cls) {
  const b = h("button", { type: "button", class: cls, test: "copy-claude", "data-state": "idle", text: "Скопировать для Claude" });
  b.addEventListener("click", async () => {
    if (b.disabled) return;
    b.disabled = true; // двойное касание — одно копирование
    try {
      let p = UI.pack && Date.now() - UI.packAt < 60000 ? UI.pack : null, ok = false;
      if (!p || (UI.packPart || 0) >= p.texts.length) {
        UI.packPart = 0;
        const job = buildPack();
        if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) { // iPhone: текст собирается после касания
          try { await navigator.clipboard.write([new ClipboardItem({ "text/plain": job.then(x => new Blob([x.texts[0]], { type: "text/plain" })) })]); ok = true; } catch (e) { ok = false; }
        }
        p = await job; UI.pack = p; UI.packAt = Date.now();
        if (!ok) ok = await copyText(p.texts[0]);
      } else ok = await copyText(p.texts[UI.packPart]);
      const k = UI.packPart || 0;
      if (!ok) { showCopyText(p.texts[k]); return; }
      UI.packPart = k + 1;
      if (UI.packPart < p.texts.length) {
        b.textContent = "Скопировать ещё: часть " + (UI.packPart + 1) + " из " + p.texts.length;
        toast("Скопирована часть " + UI.packPart + " из " + p.texts.length + " — вставь в окно 🀄 Китайский и нажми ещё раз", 4500);
        return;
      }
      ST.copy = { t: Date.now(), prev: ST.copy.upto || 0, upto: p.upto, rows: p.rows };
      commit([]);
      b.setAttribute("data-state", "done"); b.textContent = "Скопировано ✓";
      toast("Скопировано ✓ " + PASTE_HINT, 5500);
      UI.pack = null; UI.packPart = 0;
      if (UI.tab === "me" && !UI.sub) setTimeout(() => { if (UI.tab === "me" && !UI.sub) renderMe(); }, 1500);
    } finally { b.disabled = false; }
  });
  return h("div", { class: "copywrap" }, b, h("p", { class: "line", text: PASTE_HINT }));
}
function showCopyText(t) {
  const close = () => closeOv(".shade");
  const ta = h("textarea", { readonly: true, style: "width:100%;height:40vh;font:13px ui-monospace,monospace;-webkit-user-select:text;user-select:text" }); ta.value = t;
  overlay(h("div", { class: "shade" }, h("div", { class: "sheet" }, h("h2", { text: "Не скопировалось само" }),
    h("p", { class: "line", text: "Нажми в текст, «Выбрать всё» → «Скопировать» и вставь в чат «Китайский»." }), ta,
    h("button", { type: "button", class: "btn main", text: "Готово", onclick: close }))));
}

/* ===== main: запуск, «назад», обновление, журнал запусков и ошибок ===== */
let errCount = 0, reloading = false;
function logErr(m) {
  if (errCount++ > 20) return;
  const ev = { k: "E", t: Date.now(), m: String(m).slice(0, 300) };
  try { if (DB.db || DB.mem) DB.commit([ev], {}).catch(() => {}); } catch (e) {}
}
document.addEventListener("click", e => { // двойное касание пальцем: второе — в то же место сразу после смены экрана — не считается
  if (!e.isTrusted || !e.detail) return; // только настоящее касание (у программного нажатия нет точки касания)
  const now = performance.now(), last = UI.lastTap;
  UI.lastTap = { x: e.clientX, y: e.clientY, t: now };
  // глотаем только «Дальше» нового слова (4.1, 4.2): второе касание не пролистывает слово, не показав; «не могу …» стоят наверху, под «Дальше» не попадают
  const intro = e.target && e.target.closest && e.target.closest("[data-screen='4.1'] [data-test=next], [data-screen='4.2'] [data-test=next]");
  if (intro && UI.guardUsed !== UI.shownAt && last && now - (UI.shownAt || 0) < 400 && now - last.t < 450 && Math.abs(e.clientX - last.x) < 48 && Math.abs(e.clientY - last.y) < 48) {
    UI.guardUsed = UI.shownAt; e.stopPropagation(); e.preventDefault(); // не больше одного «лишнего» касания на экран
  }
}, true);
window.addEventListener("error", e => { if (e && e.message) logErr(e.message + " @" + String(e.filename || "").split("/").pop() + ":" + e.lineno); });
window.addEventListener("unhandledrejection", e => logErr("promise: " + errText(e && e.reason)));

async function loadWords() {
  let bad = 0;
  for (let k = 0; ; k++) {
    try {
      // тот же адрес: с телефона — из памяти (service worker), иначе сеть. Из памяти ответ мгновенный — не ждём 15 с, если запнулся
      const r = await fetchT("data/words.json", navigator.serviceWorker && navigator.serviceWorker.controller ? 4000 : 15000);
      if (!r.ok) { BOOT.err("broken"); bad++; throw new Error("HTTP " + r.status); } // сервер ответил ошибкой — как битые данные: 1.3 сразу после повтора
      const txt = await r.text();
      let j = null;
      try { j = JSON.parse(txt); } catch (e) { BOOT.err("broken"); bad++; throw e; }
      if (!j || !j.w || !j.books || !j.books.length) { BOOT.err("broken"); bad++; throw new Error("пустой файл слов"); }
      return j;
    } catch (e) { if (navigator.onLine === false) BOOT.err("offline"); }
    if (bad >= 2 && !BOOT.failed) BOOT.fail(); // указатель уроков повреждён дважды подряд — сразу «Данные повреждены»
    if (BOOT.failed) return new Promise(() => {}); // показан 1.3 — ждём «Ещё раз» / «Открыть скачанное»
    await sleep(k < 3 ? 1500 : 3000);
  }
}
function route() {
  if (showGate()) return;
  if (lessonMode() === "none") return showFirst();
  if (UI.tab === "me") return UI.sub === "settings" ? renderSettings() : renderMe();
  renderToday();
}
function onBack() {
  if ($("[data-overlay='2.6']")) return closeOv("[data-overlay='2.6']");
  if (UI.inSession && SESS) return pause();
  if ($(".shade")) return closeOv(".shade");
  if ($("[data-screen='5.1']")) return renderToday();
  if (UI.sub === "settings") return renderMe();
  if (UI.tab === "me") return renderToday();
  // на главном — остаёмся в приложении: «назад» не выкидывает никогда
}
function initHistory() {
  try { history.replaceState({ zh: 0 }, ""); history.pushState({ zh: 1 }, ""); } catch (e) {}
  window.addEventListener("popstate", () => { try { history.pushState({ zh: 1 }, ""); } catch (e) {} onBack(); });
}
function reloadNow() {
  if (reloading) return; reloading = true;
  try { localStorage.setItem("zh2-updated", VERSION); } catch (e) {}
  location.reload();
}
function onUpdate() { if (UI.inSession) { UI.reloadPending = true; return; } reloadNow(); } // посреди занятия не перезагружаем — после выхода
function saveNow() { if (SESS) { tick(); commit([]); } }

async function boot() {
  BOOT.progress(1);
  const hadCtrl = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
  const [data, dbok] = await Promise.all([loadWords(), DB.open()]);
  if (!dbok) { BOOT.fail("storage"); return; } // база не открылась — не уходим молча «в память»
  indexContent(data);
  BOOT.progress(2);
  try { ST = await DB.get("st"); SESS = await DB.get("sess"); } catch (e) { ST = null; SESS = null; logErr("чтение памяти: " + errText(e)); }
  if (!ST || !ST.w) {
    ST = freshState();
    try { const bk = JSON.parse(localStorage.getItem("zh2-id") || "null"); if (bk) Object.assign(ST, { dev: bk.dev || ST.dev, lesson: bk.lesson || null, copy: bk.copy || ST.copy }); } catch (e) {}
    try { const evs = await DB.since(0); if (evs.length) rebuild(evs); } catch (e) {}
  }
  if (SESS && !(SESS.parts && SESS.parts.length)) SESS = null;
  ST.set = Object.assign({ theme: "auto", micOff: 0, noListen: 0 }, ST.set);
  ST.copy = Object.assign({ t: 0, upto: 0, prev: 0, rows: 0 }, ST.copy);
  ST.launches = (ST.launches || 0) + 1;
  try { localStorage.removeItem("zh2-updated"); } catch (e) {}
  if (ST.ver && ST.ver !== VERSION) UI.updated = VERSION; // первое открытие после обновления — плашка 1.9 на 3 с
  const prevVer = ST.ver; ST.ver = VERSION;
  applyTheme();
  BOOT.progress(3);
  await Snd.init();
  initHistory();
  route();
  BOOT.done(); // таймеры 8/20 с гасим только после первого экрана: ошибка при рисовании → 1.3 с «Ещё раз»
  // service worker при первой установке ждёт этого «готово», чтобы не качать оболочку второй раз во время загрузки
  const tellReady = () => { try { navigator.serviceWorker.getRegistration().then(r => { if (r) [r.installing, r.waiting, r.active].forEach(w => w && w.postMessage("zh2-ready")); }).catch(() => {}); } catch (e) {} };
  if ("serviceWorker" in navigator) { setTimeout(tellReady, 700); setTimeout(tellReady, 1500); setTimeout(tellReady, 4000); }
  // журнал запуска: время до каркаса и до экрана, сеть, «Домой», версия
  const per = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted().catch(() => null) : null;
  const ev = { k: "L", t: Date.now(), sk: Math.round(BOOT.t0 - (performance.timeOrigin || BOOT.t0)), ok: Math.round(performance.now()),
    net: navigator.onLine === false ? 0 : 1, home: document.documentElement.getAttribute("data-standalone") === "true" ? 1 : 0, v: VERSION, sw: hadCtrl ? 1 : 0, per: per ? 1 : 0 };
  if (UI.updated) ev.upd = prevVer;
  try { const sf = localStorage.getItem("zh2-savefail"); if (sf) { localStorage.removeItem("zh2-savefail"); const x = JSON.parse(sf); commit([{ k: "E", t: Date.now(), m: "запись в память не прошла: " + x.why, at: x.t }]); } } catch (e) {}
  try { const bf = localStorage.getItem("zh2-bootfail"); if (bf) { localStorage.removeItem("zh2-bootfail"); const x = JSON.parse(bf); commit([{ k: "E", t: Date.now(), m: "прошлый запуск не загрузился: " + x.r + " (" + (x.log || []).join(",") + ")", at: x.t }]); } } catch (e) {}
  if (BOOT.log && BOOT.log.length) commit([{ k: "E", t: Date.now(), m: "загрузка с повторами: " + BOOT.log.slice(-5).join(",") }]);
  if (BOOT.swErr) ev.swErr = BOOT.swErr;
  commit([ev]);
  if (!per && navigator.storage && navigator.storage.persist) navigator.storage.persist().then(ok => { if (ok) commit([{ k: "P", t: Date.now(), ok: 1 }]); }, () => {});
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadCtrl) onUpdate(); });
    navigator.serviceWorker.addEventListener("message", e => { if (e.data && e.data.type === "sw-updated" && e.data.v !== VERSION && hadCtrl) onUpdate(); });
    setTimeout(() => { if (navigator.onLine !== false) navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => {}); }, 4000);
  }
  window.addEventListener("online", () => { document.documentElement.setAttribute("data-net", "online"); if (UI.tab === "today" && !UI.inSession && $("[data-screen^='2.']")) renderToday(); downloadSoon(); });
  window.addEventListener("offline", () => { document.documentElement.setAttribute("data-net", "offline"); if (UI.tab === "today" && !UI.inSession && $("[data-screen^='2.']")) renderToday(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { tick(true); Player.stop(); if (Mic.stopNow) Mic.stopNow(); saveNow(); if (UI.reloadPending && !UI.inSession) reloadNow(); }
    else Run.lastTick = Date.now();
  });
  window.addEventListener("pagehide", saveNow);
  try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if ((ST.set.theme || "auto") === "auto") applyTheme(); }); } catch (e) {}
  downloadSoon();
  setTimeout(() => Snd.prune(), 8000);
}
boot().catch(e => { logErr("запуск: " + errText(e)); BOOT.err("broken"); BOOT.fail(); }); // не вечная заставка: «Не загрузилось» с «Ещё раз»

})();
