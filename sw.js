/* Работа без интернета: оболочка приложения — в кэше версии, звук — в отдельном кэше.
   iPhone просит звук кусками (Range) — отдаём кусок из кэша с кодом 206, иначе звук не играет. */
const V = "0b2e5058cb";
const SHELL = ["./", "index.html", "app.css", "app.js", "content.json", "hz.json", "manifest.webmanifest", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png"];
const AUDIO = ["audio/hj1-01.mp3?h=ff3618e8", "audio/hj1-02.mp3?h=e93ee45b", "audio/hj1-03.mp3?h=07947278", "audio/hj1-04.mp3?h=5a6ca0a4", "audio/hj1-05.mp3?h=175d34ee", "audio/hj1-06.mp3?h=02fa24dd", "audio/hj1-07.mp3?h=bc16f26b", "audio/hj1-08.mp3?h=830c1662", "audio/hj1-09.mp3?h=54c7a8b4", "audio/hj1-10.mp3?h=3f6255bb", "audio/hj1-11.mp3?h=b4c9f1f2", "audio/hj1-12.mp3?h=2ee7b58f", "audio/hj1-13.mp3?h=3029002a", "audio/hj1-14.mp3?h=83aa6a6a", "audio/hj1-15.mp3?h=9a232cd9", "audio/l01.mp3?h=6e367730", "audio/l02.mp3?h=62f8e51e", "audio/l03.mp3?h=b7db802d", "audio/l04.mp3?h=0d39cf76", "audio/l05.mp3?h=395f9eb6", "audio/l06.mp3?h=7f001e0d", "audio/l07.mp3?h=176de945", "audio/l08.mp3?h=683b16f7", "audio/l09.mp3?h=5cbc8080", "audio/l10.mp3?h=c518b8d6", "audio/l11.mp3?h=b896b093", "audio/l12.mp3?h=20be237c", "audio/l13.mp3?h=0746471a", "audio/l14.mp3?h=f59e3ae5", "audio/l15.mp3?h=558fbf0f", "audio/l16.mp3?h=b8c70e90", "audio/l17.mp3?h=b4e640a6", "audio/l18.mp3?h=4a2dcea1", "audio/l19.mp3?h=93280686", "audio/l20.mp3?h=daebcc2d", "audio/l21.mp3?h=5b640591", "audio/l22.mp3?h=3fea95cd", "audio/l23.mp3?h=c3d4ecd2", "audio/l24.mp3?h=1475c187", "audio/l25.mp3?h=789a0a16", "audio/m01.mp3?h=4ec33ee7", "audio/m02.mp3?h=bd7c55ab", "audio/m03.mp3?h=6f44bc9d", "audio/m04.mp3?h=149bfd28", "audio/m05.mp3?h=ab85647c", "audio/m06.mp3?h=be4dd04c", "audio/m07.mp3?h=71f49423", "audio/m08.mp3?h=0b12db65", "audio/m09.mp3?h=a28bd2cb", "audio/m10.mp3?h=d93b2cf4", "audio/m11.mp3?h=53715116", "audio/m12.mp3?h=af7bd6b4", "audio/m13.mp3?h=1f71cb22", "audio/m14.mp3?h=cbfe4208", "audio/m15.mp3?h=ed9365b2", "audio/m16.mp3?h=bf6e3573", "audio/m17.mp3?h=11873880", "audio/m18.mp3?h=61db381d", "audio/m19.mp3?h=e8859bcc", "audio/m20.mp3?h=db9899ac", "audio/m21.mp3?h=1cfe29d8", "audio/m22.mp3?h=c027036b", "audio/m23.mp3?h=a9b7c7cd", "audio/m24.mp3?h=49493250", "audio/m25.mp3?h=cdf35a3f", "audio/n00.mp3?h=ee1511f6", "audio/n01.mp3?h=3f921f2e", "audio/n02.mp3?h=2ee03516", "audio/n02b.mp3?h=9e23782d", "audio/n03.mp3?h=d204dad3", "audio/n04.mp3?h=e5561a28", "audio/n05.mp3?h=661f4864", "audio/n06.mp3?h=c654329a", "audio/n07.mp3?h=d0a8884a", "audio/n08.mp3?h=79876c90", "audio/n09.mp3?h=b513b338", "audio/n10.mp3?h=80a6b595", "audio/n11.mp3?h=9b0629f9", "audio/n12.mp3?h=5ce44273", "audio/n13.mp3?h=81f834bf", "audio/n14.mp3?h=ccf95f5f", "audio/n15.mp3?h=940650b3", "audio/p10a.mp3?h=3896c2df", "audio/p10b.mp3?h=af77f47e", "audio/p11a.mp3?h=15ba6438", "audio/p11b.mp3?h=9f99572c", "audio/p12a.mp3?h=54055ce3", "audio/p12b.mp3?h=6a79827d", "audio/p13a.mp3?h=b5808c70", "audio/p13b.mp3?h=4c21babc", "audio/p14a.mp3?h=e03dd171", "audio/p14b.mp3?h=d37c3775", "audio/p20a.mp3?h=08835ed2", "audio/p20b.mp3?h=5e2810da", "audio/p21a.mp3?h=57023516", "audio/p21b.mp3?h=c14631b7", "audio/p22a.mp3?h=f75ae0d8", "audio/p22b.mp3?h=eaa0971e", "audio/p23a.mp3?h=80ab7853", "audio/p23b.mp3?h=d5b9d6fd", "audio/p24a.mp3?h=001fefbd", "audio/p24b.mp3?h=7f79405c", "audio/p30a.mp3?h=8e025fd5", "audio/p30b.mp3?h=e74e0da3", "audio/p31a.mp3?h=1cafe9d8", "audio/p31b.mp3?h=4ed2f55b", "audio/p32a.mp3?h=964027c5", "audio/p32b.mp3?h=1de56109", "audio/p33a.mp3?h=dfadca4e", "audio/p33b.mp3?h=db5aa6c9", "audio/p34a.mp3?h=f469b750", "audio/p34b.mp3?h=d732adbe", "audio/p40a.mp3?h=44bf5447", "audio/p40b.mp3?h=a44935d0", "audio/p41a.mp3?h=dcecf890", "audio/p41b.mp3?h=214bc0ff", "audio/p42a.mp3?h=8bab4d20", "audio/p42b.mp3?h=2fb948b0", "audio/p43a.mp3?h=aa8047ed", "audio/p43b.mp3?h=f45e7720", "audio/p44a.mp3?h=57c09dca", "audio/p44b.mp3?h=33b9ea55", "audio/pr10.mp3?h=de34175b", "audio/pr1000.mp3?h=7195999c", "audio/pr10000.mp3?h=951212f8", "audio/pr104.mp3?h=26e87fe0", "audio/pr105.mp3?h=61ae090d", "audio/pr110.mp3?h=c443db41", "audio/pr12.mp3?h=bbd83b4e", "audio/pr120.mp3?h=87ddf1cd", "audio/pr1200.mp3?h=4eb8c3c5", "audio/pr14.mp3?h=0fa8a4f1", "audio/pr140.mp3?h=731eec24", "audio/pr1400.mp3?h=272f811e", "audio/pr150.mp3?h=4ca7ea3d", "audio/pr1500.mp3?h=564d9f85", "audio/pr2.mp3?h=a47cc0e7", "audio/pr20.mp3?h=a1f4d4df", "audio/pr200.mp3?h=0bfe99ac", "audio/pr2000.mp3?h=d7cb1644", "audio/pr240.mp3?h=7a7c9acf", "audio/pr25.mp3?h=995ea90e", "audio/pr2500.mp3?h=1c9d88b9", "audio/pr2600.mp3?h=3d85ac15", "audio/pr300.mp3?h=08385213", "audio/pr3080.mp3?h=1b19148c", "audio/pr350.mp3?h=dfb28766", "audio/pr38.mp3?h=3d2edd92", "audio/pr4.mp3?h=e4dbe396", "audio/pr40.mp3?h=ef50985d", "audio/pr400.mp3?h=39089710", "audio/pr4000.mp3?h=82c1d495", "audio/pr40000.mp3?h=64a2d9bb", "audio/pr404.mp3?h=52d3c308", "audio/pr4040.mp3?h=b01ad21b", "audio/pr410.mp3?h=2855cb46", "audio/pr44.mp3?h=f63c733a", "audio/pr4400.mp3?h=c8cf2328", "audio/pr45.mp3?h=443e6184", "audio/pr480.mp3?h=224e5118", "audio/pr560.mp3?h=d0991db1", "audio/pr68.mp3?h=0be76f0a", "audio/pr99.mp3?h=409c3c3e", "audio/pr999.mp3?h=bbd558b2", "audio/t_ba1.mp3?h=725bbf6e", "audio/t_ba2.mp3?h=8a5cb541", "audio/t_ba3.mp3?h=4da84deb", "audio/t_ba4.mp3?h=1cc52d72", "audio/t_fei1.mp3?h=698cd68f", "audio/t_fei2.mp3?h=ee96ecf0", "audio/t_fei3.mp3?h=d47796f7", "audio/t_fei4.mp3?h=10a464e8", "audio/t_ma1.mp3?h=313177e1", "audio/t_ma2.mp3?h=31072d4a", "audio/t_ma3.mp3?h=e4f297e9", "audio/t_ma4.mp3?h=24f15b7d", "audio/t_qi1.mp3?h=11b56da2", "audio/t_qi2.mp3?h=5430f34c", "audio/t_qi3.mp3?h=d36719cf", "audio/t_qi4.mp3?h=47e30e69", "audio/t_shu1.mp3?h=1a94d27b", "audio/t_shu2.mp3?h=12008a32", "audio/t_shu3.mp3?h=a6cd949a", "audio/t_shu4.mp3?h=c336913a", "audio/t_tang1.mp3?h=8f00de2c", "audio/t_tang2.mp3?h=72379f8b", "audio/t_tang3.mp3?h=fb9e4ea0", "audio/t_tang4.mp3?h=d6979186", "audio/t_tong1.mp3?h=f6757dd7", "audio/t_tong2.mp3?h=574f2301", "audio/t_tong3.mp3?h=98d30fa7", "audio/t_tong4.mp3?h=8dd66fa6", "audio/t_wu1.mp3?h=9d1d95e2", "audio/t_wu2.mp3?h=71f6cfa4", "audio/t_wu3.mp3?h=cc1a8bde", "audio/t_wu4.mp3?h=c078744e", "audio/t_yi1.mp3?h=c3b8f863", "audio/t_yi2.mp3?h=607de2d7", "audio/t_yi3.mp3?h=9af93a8a", "audio/t_yi4.mp3?h=fa040581"];
const SC = "zh-shell-" + V, AC = "zh-audio";
const abs = p => new URL(p, self.registration.scope).href;
const AUDIO_SET = new Set(AUDIO.map(abs));

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SC).then(c => c.addAll(SHELL.map(p => new Request(p, {cache: "reload"})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("zh-shell-") && k !== SC) await caches.delete(k);
    const ac = await caches.open(AC);
    for (const r of await ac.keys()) if (!AUDIO_SET.has(r.url)) await ac.delete(r);
    await self.clients.claim();
  })());
});

async function audioResponse(req){
  const url = req.url, cache = await caches.open(AC);
  let res = await cache.match(url);
  if (!res) {
    res = await fetch(url, {cache: "no-cache"});
    if (res.ok && res.status === 200 && AUDIO_SET.has(url)) await cache.put(url, res.clone());
  }
  const range = req.headers.get("range");
  if (!range || res.status !== 200) return res;
  const buf = await res.arrayBuffer(), size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  let start = 0, end = size - 1;
  if (m) {
    if (m[1] === "" && m[2] !== "") start = Math.max(0, size - +m[2]);
    else { start = +m[1] || 0; if (m[2] !== "") end = Math.min(size - 1, +m[2]); }
  }
  if (start >= size) return new Response(null, {status: 416, headers: {"Content-Range": "bytes */" + size}});
  return new Response(buf.slice(start, end + 1), {status: 206, headers: {
    "Content-Type": res.headers.get("Content-Type") || "audio/mpeg",
    "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes"}});
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // GitHub API и прочее — мимо
  if (url.pathname.includes("/audio/")) { e.respondWith(audioResponse(req).catch(() => fetch(req))); return; }
  e.respondWith((async () => {
    const hit = await caches.match(req.mode === "navigate" ? abs("./") : req, {ignoreSearch: true});
    if (hit) return hit;
    try { return await fetch(req); }
    catch (err) { if (req.mode === "navigate") { const idx = await caches.match(abs("index.html")); if (idx) return idx; } throw err; }
  })());
});

// докачать весь звук в фоне (по просьбе страницы)
let filling = false;
self.addEventListener("message", e => {
  if (e.data !== "cache-audio" || filling) return;
  filling = true;
  e.waitUntil((async () => {
    const cache = await caches.open(AC);
    for (const u of AUDIO_SET) {
      if (await cache.match(u)) continue;
      try { const r = await fetch(u, {cache: "no-cache"}); if (r.ok && r.status === 200) await cache.put(u, r); } catch (err) { break; }
    }
    filling = false;
  })());
});
