/* «Китайский» v2 — service worker. Тот же адрес и то же имя файла, что у старого приложения:
   новый сразу встаёт на его место (skipWaiting), удаляет все чужие кэши (старое приложение и ≈ 10 МБ старого звука),
   берёт открытые окна (clients.claim); окна старого приложения перезагружает сразу, окна v2 — сами решают когда
   (не посреди занятия). Страницу отдаёт новым ответом из байтов кэша — без пометки «перенаправлен» (проба 30.10).
   Журнал (IndexedDB «zh2-swlog»): вызывали ли его при запуске и что он отдал — уходит Claude в пакете. */
const V = "152342241e";
const SHELL_CACHE = "zh2-shell-" + V;
const SND_CACHE = "zh2-snd"; // звук уроков: кладёт страница, переживает обновления версии
const SHELL = ["./", "index.html", "app.js", "worklet.js", "manifest.webmanifest", "data/words.json", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png"];
const MATCH = { ignoreSearch: true, ignoreVary: true };
const abs = p => new URL(p, self.registration.scope).href;
const short = u => String(u).replace(self.registration.scope, "./");
const errText = e => String((e && e.message) || e).slice(0, 160);

function openLog() {
  return new Promise((ok, bad) => {
    const r = indexedDB.open("zh2-swlog", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("ev", { autoIncrement: true });
    r.onsuccess = () => ok(r.result);
    r.onerror = () => bad(r.error);
  });
}
async function log(ev) {
  try {
    const db = await openLog();
    await new Promise(done => {
      const tx = db.transaction("ev", "readwrite"), st = tx.objectStore("ev");
      st.add(Object.assign({ t: Date.now(), v: V, on: self.navigator.onLine }, ev));
      const c = st.count();
      c.onsuccess = () => { // держим последние 100 событий
        let extra = c.result - 100;
        if (extra > 0) st.openCursor().onsuccess = e => { const cur = e.target.result; if (cur && extra-- > 0) { cur.delete(); cur.continue(); } };
      };
      tx.oncomplete = tx.onerror = tx.onabort = () => done();
    });
    db.close();
  } catch (e) {}
}

const FALLBACK = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Китайский</title></head>
<body style="font:17px -apple-system,system-ui,sans-serif;padding:calc(env(safe-area-inset-top) + 24px) 20px 24px;background:#121413;color:#f2f2ef">
<h2 style="margin:0 0 12px">Китайский: нет сети</h2>
<p>Приложение ещё не успело сохраниться на телефоне, а интернета нет. Включи интернет (в Китае — с VPN) и открой «Китайский» снова.</p>
<p><button onclick="location.reload()" style="font:inherit;min-height:48px;padding:0 20px;border-radius:12px;border:0;background:#FF6B45;color:#1a0f0b">Ещё раз</button></p>
<p style="opacity:.7;font-size:15px">версия ${V}</p></body></html>`;

/* Первая установка: страница только что скачала оболочку — не качаем её второй раз, пока она грузится:
   ждём «готово» от страницы (не дольше 8 с) и берём файлы из HTTP-кэша браузера. Обновление — всегда свежие файлы. */
let pageReady = false;
self.addEventListener("message", e => { if (e.data === "zh2-ready") pageReady = true; });
self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const t0 = Date.now();
    const first = (await caches.keys()).length === 0;
    if (first) for (let i = 0; i < 27 && !pageReady; i++) await new Promise(r => setTimeout(r, 300));
    try {
      const c = await caches.open(SHELL_CACHE);
      await c.addAll(SHELL.map(p => new Request(p, { cache: first ? "default" : "reload" })));
      await log({ k: "install", ok: true, n: SHELL.length, ms: Date.now() - t0, first });
    } catch (err) {
      await log({ k: "install", ok: false, err: errText(err), ms: Date.now() - t0 });
      await caches.delete(SHELL_CACHE).catch(() => {}); // пустой кэш не должен выдавать себя за «скачанное»
      throw err;
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    let old = 0, foreign = 0;
    for (const k of await caches.keys()) {
      if (k === SHELL_CACHE || k === SND_CACHE) continue;
      await caches.delete(k);
      old++;
      if (!k.startsWith("zh2-")) foreign++; // кэш старого приложения
    }
    try { if (self.registration.navigationPreload) await self.registration.navigationPreload.disable(); } catch (err) {}
    await self.clients.claim();
    const wins = await self.clients.matchAll({ type: "window" });
    let moved = 0;
    for (const w of wins) {
      // окна старого приложения — сразу в новое; окнам v2 — сообщение, перезагрузятся сами после занятия
      if (foreign) { try { if (w.navigate) { w.navigate(w.url).catch(() => {}); moved++; } } catch (err) {} }
      else { try { w.postMessage({ type: "sw-updated", v: V }); } catch (err) {} }
    }
    await log({ k: "activate", old, foreign, wins: wins.length, moved });
  })());
});

async function page(req) {
  const t0 = Date.now(), ev = { k: "page", url: short(req.url) };
  let res;
  try {
    const c = await caches.open(SHELL_CACHE);
    let hit = await c.match(abs("./"), MATCH), from = "кэш ./";
    if (!hit) { hit = await c.match(abs("index.html"), MATCH); from = "кэш index.html"; }
    if (!hit) {
      for (const k of await caches.keys()) {
        if (!k.startsWith("zh2-shell-")) continue;
        hit = await (await caches.open(k)).match(abs("index.html"), MATCH);
        if (hit) { from = "старый кэш " + k; break; }
      }
    }
    if (hit) {
      ev.from = from; ev.redir = hit.redirected;
      res = new Response(await hit.blob(), { status: 200, statusText: "OK", headers: { "Content-Type": "text/html; charset=utf-8" } });
    } else {
      ev.from = "сеть";
      const net = await Promise.race([fetch(req), new Promise((_, bad) => setTimeout(() => bad(new Error("сеть не ответила за 8 с")), 8000))]);
      ev.st = net.status; ev.redir = net.redirected;
      res = net.redirected ? new Response(await net.blob(), { status: net.status, statusText: net.statusText, headers: net.headers }) : net;
    }
  } catch (err) {
    ev.from = "запасная страница"; ev.err = errText(err);
    res = new Response(FALLBACK, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  ev.ms = Date.now() - t0;
  return { res, ev };
}

async function file(req, url) {
  if (url.pathname.includes("/snd/")) { // клип урока: из памяти телефона, иначе сеть (страница сама кладёт в кэш)
    const hit = await (await caches.open(SND_CACHE)).match(req, { ignoreVary: true });
    if (hit) return hit;
    return fetch(req);
  }
  const hit = await (await caches.open(SHELL_CACHE)).match(req, MATCH);
  if (hit) return hit;
  try { return await fetch(req); }
  catch (err) { await log({ k: "miss", url: short(req.url), err: errText(err) }); throw err; }
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || !url.href.startsWith(self.registration.scope)) return;
  if (url.searchParams.has("net")) return; // проверка связи и свежие файлы — всегда в сеть
  if (req.mode === "navigate") {
    const job = page(req);
    e.respondWith(job.then(r => r.res));
    e.waitUntil(job.then(r => log(r.ev)));
    return;
  }
  if (req.headers.has("range")) return; // звук играем из памяти страницы (blob), кусками не просим
  e.respondWith(file(req, url));
});
