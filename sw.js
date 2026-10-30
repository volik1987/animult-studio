// Офлайн-режим «АниМульт Студии». Файл собирается make-sw.py из sw-template.js — правьте шаблон.
const VERSION = '378c3de670';
const CACHE = 'animult-' + VERSION;
const ASSETS = [
"./",
"apple-touch-icon.png",
"css/app.css",
"favicon-32.png",
"icon-192.png",
"icon-512.png",
"icon-maskable-512.png",
"img/bg/beach.jpg",
"img/bg/beach_t.jpg",
"img/bg/bedroom.jpg",
"img/bg/bedroom_t.jpg",
"img/bg/cafe.jpg",
"img/bg/cafe_t.jpg",
"img/bg/classroom.jpg",
"img/bg/classroom_t.jpg",
"img/bg/cyber.jpg",
"img/bg/cyber_t.jpg",
"img/bg/forest.jpg",
"img/bg/forest_t.jpg",
"img/bg/hallway.jpg",
"img/bg/hallway_t.jpg",
"img/bg/living.jpg",
"img/bg/living_t.jpg",
"img/bg/park.jpg",
"img/bg/park_t.jpg",
"img/bg/rooftop.jpg",
"img/bg/rooftop_t.jpg",
"img/bg/shrine.jpg",
"img/bg/shrine_t.jpg",
"img/bg/space.jpg",
"img/bg/space_t.jpg",
"img/bg/stage.jpg",
"img/bg/stage_t.jpg",
"img/bg/street.jpg",
"img/bg/street_t.jpg",
"img/bg/throne.jpg",
"img/bg/throne_t.jpg",
"img/bg/winter.jpg",
"img/bg/winter_t.jpg",
"img/hero.jpg",
"img/props/backpack.webp",
"img/props/balloons.webp",
"img/props/bike.webp",
"img/props/bouquet.webp",
"img/props/bubbletea.webp",
"img/props/cake.webp",
"img/props/cat.webp",
"img/props/chair.webp",
"img/props/chest.webp",
"img/props/dog.webp",
"img/props/guitar.webp",
"img/props/plant.webp",
"img/props/sakura.webp",
"img/props/sofa.webp",
"img/props/table.webp",
"img/props/wand.webp",
"index.html",
"js/app.js",
"js/char.js",
"js/db.js",
"js/editor.js",
"js/montage.js",
"js/studio.js",
"manifest.webmanifest",
"snd/applause.mp3",
"snd/bell.mp3",
"snd/birds.mp3",
"snd/boing.mp3",
"snd/heart.mp3",
"snd/knock.mp3",
"snd/m_battle.mp3",
"snd/m_happy.mp3",
"snd/m_love.mp3",
"snd/magic.mp3",
"snd/phone.mp3",
"snd/poof.mp3",
"snd/pop.mp3",
"snd/punch.mp3",
"snd/rain.mp3",
"snd/steps.mp3",
"snd/whoosh.mp3"
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('animult-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// страница — из сети, если она есть (чтобы обновления приходили), иначе из кэша; картинки и звуки — из кэша
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./', cp)); return r; })
      .catch(() => caches.match('./', {ignoreSearch: true})));
    return;
  }
  e.respondWith(caches.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req).then(r => {
    if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return r;
  })));
});
