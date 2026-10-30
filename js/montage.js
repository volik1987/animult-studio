// Монтаж: кадры из студии → покадровый мультик со звуками, музыкой и экспортом видео.
'use strict';

const SFX = [
  ['boing', '🌀 Пружинка'], ['pop', '🫧 Пуф-поп'], ['whoosh', '💨 Вжух'], ['magic', '✨ Волшебство'], ['punch', '👊 Удар'], ['poof', '💥 Бах-дым'],
  ['steps', '👣 Шаги'], ['knock', '🚪 Стук'], ['applause', '👏 Аплодисменты'], ['bell', '🔔 Школьный звонок'], ['heart', '💓 Сердцебиение'],
  ['phone', '📱 Звонок телефона'], ['rain', '🌧 Дождь'], ['birds', '🐦 Птички'],
];
const MUSIC = [['m_happy', '☀️ Весёлая'], ['m_battle', '⚔️ Битва'], ['m_love', '💗 Нежная']];
const FPS_PRESETS = [1, 2, 3, 4, 6, 8, 12];

const Montage = {
  films: [], film: null, pps: 110, t: 0, playing: false, selF: null, selC: null, tab: 'frames',
  imgs: {}, bufs: {}, srcs: [], ac: null,
  async init() {
    this.films = (await DB.all('films')).sort((a, b) => a.created - b.created);
    if (!this.films.length) this.films.push(this.newFilm('Мой мультик'));
    const last = await DB.get('kv', 'film');
    this.film = this.films.find(f => f.id === last) || this.films[0];
    if (!Studio.inited) await Studio.init();
    this.inited = true;
  },
  newFilm(name) { return { id: uid(), name, frames: [], clips: [], music: null, fade: false, defDur: 0.5, created: Date.now() }; },
  async enter() {
    if (!this.inited) await this.init();
    await Studio.loadPhotos();
    this.renderFilms(); this.render(); this.renderPanel();
  },
  leave() { this.stop(); },
  save() { clearTimeout(this._st); const f = this.film; this._st = setTimeout(() => { DB.put('films', clone(f)); DB.put('kv', f.id, 'film'); }, 250); },
  photo(pid) { return Studio.photos.find(p => p.id === pid); },
  total() { return this.film.frames.reduce((s, f) => s + f.dur, 0); },
  fmt(t) { t = Math.max(0, t); const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`; },
  aspectWH() {
    const p = this.film.frames.map(f => this.photo(f.pid)).find(Boolean);
    const a = p ? p.aspect : '16:9';
    return a === '9:16' ? [720, 1280] : a === '1:1' ? [1080, 1080] : [1280, 720];
  },

  // ---------- кадры ----------
  async addPhotoToFilm(pid, at) {
    if (!this.inited) await this.init();
    const fr = { id: uid(), pid, dur: this.film.defDur || 0.5 };
    if (at === undefined) this.film.frames.push(fr); else this.film.frames.splice(at, 0, fr);
    this.save();
    if (curScreen === 'montage') { this.render(); }
    return fr;
  },
  img(pid) {
    if (this.imgs[pid]) return this.imgs[pid];
    const ph = this.photo(pid); if (!ph) return null;
    const im = new Image(); im.src = Studio.photoURL(ph); this.imgs[pid] = im;
    im.onload = () => { if (!this.playing) this.draw(this.t); };
    return im;
  },
  frameAt(t) {
    let acc = 0; const fr = this.film.frames;
    for (let i = 0; i < fr.length; i++) { if (t < acc + fr[i].dur || i === fr.length - 1) return { i, start: acc }; acc += fr[i].dur; }
    return null;
  },
  draw(t) {
    const cv = $('#mCanvas'), [W, H] = this.aspectWH();
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const ctx = cv.getContext('2d');
    ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const fa = this.frameAt(t);
    $('#mEmpty').hidden = !!this.film.frames.length;
    if (!fa) return;
    const put = (fr, a) => {
      const im = this.img(fr.pid); if (!im || !im.complete || !im.naturalWidth) return;
      const k = Math.max(W / im.naturalWidth, H / im.naturalHeight), dw = im.naturalWidth * k, dh = im.naturalHeight * k;
      ctx.globalAlpha = a; ctx.drawImage(im, (W - dw) / 2, (H - dh) / 2, dw, dh); ctx.globalAlpha = 1;
    };
    const fr = this.film.frames[fa.i];
    put(fr, 1);
    if (this.film.fade && fa.i < this.film.frames.length - 1) {
      const fd = Math.min(0.3, fr.dur * 0.4), rem = fa.start + fr.dur - t;
      if (rem < fd) put(this.film.frames[fa.i + 1], 1 - rem / fd);
    }
  },

  // ---------- звук ----------
  audio() {
    if (!this.ac) { const AC = window.AudioContext || window.webkitAudioContext; this.ac = new AC(); this.master = this.ac.createGain(); this.master.connect(this.ac.destination); }
    if (this.ac.state === 'suspended') this.ac.resume();
    return this.ac;
  },
  srcKey(src) { return src.type === 'b' ? 'b:' + src.k : 'u:' + src.id; },
  async buffer(src) {
    const key = this.srcKey(src);
    if (this.bufs[key]) return this.bufs[key];
    const ac = this.audio();
    let ab;
    if (src.type === 'b') ab = await (await fetch(`snd/${src.k}.mp3`)).arrayBuffer();
    else { const u = await DB.get('uploads', src.id); if (!u) return null; ab = await u.blob.arrayBuffer(); }
    const buf = await new Promise((res, rej) => { const p = ac.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); });
    this.bufs[key] = buf;
    return buf;
  },
  async preview(src) {
    try { const b = await this.buffer(src); const s = this.ac.createBufferSource(); s.buffer = b; s.connect(this.master); s.start(); setTimeout(() => { try { s.stop(); } catch (_) { } }, 6000); } catch (e) { toast('Не получилось проиграть звук'); }
  },
  async loadAllAudio() {
    const list = this.film.clips.map(c => c.src); if (this.film.music) list.push(this.film.music.src);
    await Promise.all(list.map(s => this.buffer(s).catch(() => null)));
  },
  startAudio(t0, out) {
    const ac = this.ac, now = ac.currentTime + 0.05, total = this.total();
    for (const c of this.film.clips) {
      const b = this.bufs[this.srcKey(c.src)]; if (!b) continue;
      const when = c.at - t0; if (when + b.duration <= 0 || c.at >= total) continue;
      const s = ac.createBufferSource(); s.buffer = b;
      const g = ac.createGain(); g.gain.value = c.vol ?? 1;
      s.connect(g); g.connect(out);
      s.start(now + Math.max(0, when), Math.max(0, -when));
      s.stop(now + (total - t0) + 0.05);
      this.srcs.push(s);
    }
    const m = this.film.music;
    if (m) {
      const b = this.bufs[this.srcKey(m.src)];
      if (b) {
        const s = ac.createBufferSource(); s.buffer = b; s.loop = true;
        const g = ac.createGain(); g.gain.value = m.vol ?? 0.6;
        const end = now + (total - t0);
        g.gain.setValueAtTime(m.vol ?? 0.6, Math.max(now, end - 0.6)); g.gain.linearRampToValueAtTime(0, end);
        s.connect(g); g.connect(out);
        s.start(now, t0 % b.duration); s.stop(end + 0.05);
        this.srcs.push(s);
      }
    }
    return now;
  },
  stopAudio() { this.srcs.forEach(s => { try { s.stop(); } catch (_) { } }); this.srcs = []; },

  // ---------- воспроизведение ----------
  async play(fromStart, out, onEnd) {
    if (!this.film.frames.length) return toast('Сначала добавь кадры');
    this.audio();
    await this.loadAllAudio();
    this.film.frames.forEach(f => this.img(f.pid));
    if (fromStart || this.t >= this.total() - 0.01) this.t = 0;
    this.playing = true; $('#mPlay').textContent = '⏸';
    const t0 = this.t, c0 = this.startAudio(t0, out || this.master);
    const loop = () => {
      if (!this.playing) return;
      const t = t0 + Math.max(0, this.ac.currentTime - c0), total = this.total();
      if (t >= total) {
        if (!onEnd && $('#mLoop').checked) { this.stopAudio(); this.t = 0; this.playing = false; this.play(true); return; }
        this.t = total; this.draw(total - 0.001); this.stop(); if (onEnd) onEnd(); return;
      }
      this.t = t; this.draw(t); this.updHead();
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  },
  stop() {
    this.playing = false; cancelAnimationFrame(this.raf); this.stopAudio();
    const b = $('#mPlay'); if (b) b.textContent = '▶';
    this.updHead();
  },
  seek(t) { const was = this.playing; this.stop(); this.t = clamp(t, 0, this.total()); this.draw(this.t); this.updHead(); if (was) this.play(); },
  updHead() {
    $('#tlHead').style.left = (this.t * this.pps + 8) + 'px';
    $('#mTime').textContent = `${this.fmt(this.t)} / ${this.fmt(this.total())}`;
    if (this.playing) { const tl = $('#tl'), x = this.t * this.pps; if (x < tl.scrollLeft || x > tl.scrollLeft + tl.clientWidth - 40) tl.scrollLeft = x - 40; }
  },

  // ---------- отрисовка ----------
  renderFilms() {
    $('#mFilm').innerHTML = this.films.map(f => `<option value="${f.id}"${f === this.film ? ' selected' : ''}>${esc(f.name)}</option>`).join('');
    $('#mFade').checked = !!this.film.fade;
  },
  render() {
    const f = this.film, pps = this.pps, total = this.total();
    const width = Math.max($('#tl').clientWidth, (total + 6) * pps + 40);
    $('#tlIn').style.width = width + 'px';
    // линейка
    let r = '';
    const step = pps >= 80 ? 0.5 : pps >= 30 ? 1 : 2;
    for (let s = 0; s * pps < width; s += step) r += `<span style="left:${s * pps + 8}px">${Number.isInteger(s) ? s + 'с' : ''}</span>`;
    $('#tlRuler').innerHTML = r;
    // кадры
    let acc = 0;
    $('#tlFrames').dataset.label = '';
    $('#tlFrames').innerHTML = f.frames.map((fr, i) => {
      const ph = this.photo(fr.pid);
      const x = acc * pps + 8, w = Math.max(14, fr.dur * pps - 2); acc += fr.dur;
      return `<div class="fr${fr.id === this.selF ? ' on' : ''}" data-f="${fr.id}" style="left:${x}px;width:${w}px;background-image:url(${ph ? Studio.thumbURL(ph) : ''})"><span class="n">${i + 1}</span>${w > 34 ? `<span class="d">${fr.dur.toFixed(1)}</span>` : ''}</div>`;
    }).join('');
    // музыка
    const m = f.music;
    $('#tlMusic').innerHTML = m ? `<div class="clip mus${this.selC === 'music' ? ' on' : ''}" data-c="music" style="left:8px;width:${Math.max(60, total * pps)}px">🎵 ${esc(m.name)} · ${Math.round((m.vol ?? 0.6) * 100)}%</div>` : '';
    // звуки: раскладка по дорожкам, чтобы не перекрывались
    const lanes = [];
    $('#tlSounds').innerHTML = f.clips.slice().sort((a, b) => a.at - b.at).map(c => {
      const b = this.bufs[this.srcKey(c.src)], dur = b ? b.duration : 1.5;
      let lane = lanes.findIndex(end => end <= c.at); if (lane < 0) { lane = lanes.length; lanes.push(0); }
      lanes[lane] = c.at + dur;
      return `<div class="clip${c.id === this.selC ? ' on' : ''}" data-c="${c.id}" style="left:${c.at * pps + 8}px;width:${Math.max(40, dur * pps)}px;top:${(lane % 2) * 34}px">🔊 ${esc(c.name)}</div>`;
    }).join('');
    this.draw(Math.min(this.t, Math.max(0, total - 0.001)));
    this.updHead();
  },
  renderPanel() {
    $$('#mTabs button').forEach(b => b.classList.toggle('on', b.dataset.t === this.tab));
    const f = this.film; let h = '';
    if (this.tab === 'frames') {
      const used = new Set(f.frames.map(x => x.pid));
      h += `<div class="row" style="margin-bottom:10px"><button class="btn sm" data-a="addall">＋ Все кадры по порядку</button><button class="btn alt sm" data-a="addnew">＋ Только новые</button><button class="btn alt sm" data-a="title">📝 Титр</button></div>`;
      h += `<p class="hint">Нажми на кадр, чтобы вставить его после выбранного. Кадры делаются в Студии кнопкой 📸.</p>`;
      h += Studio.photos.length ? `<div class="lib">${Studio.photos.map((p, i) => `<div class="ph${used.has(p.id) ? ' used' : ''}" data-p="${p.id}" style="background-image:url(${Studio.thumbURL(p)})" title="Кадр ${i + 1}"></div>`).join('')}</div>` : '<p class="hint">Кадров пока нет. <button class="btn sm" data-go="studio">📸 В студию</button></p>';
    } else if (this.tab === 'sel') {
      const fr = f.frames.find(x => x.id === this.selF), c = this.selC === 'music' ? f.music : f.clips.find(x => x.id === this.selC);
      if (fr) {
        const i = f.frames.indexOf(fr);
        h += `<h4 style="margin:0 0 8px">Кадр №${i + 1}</h4>`;
        h += slider('Длительность', 'f.dur', fr.dur, 0.05, 5, 0.05, v => (+v).toFixed(2) + ' с');
        h += `<div class="row" style="margin:6px 0 12px">${[0.1, 0.2, 0.3, 0.5, 1, 2, 3].map(d => `<button class="chip" data-dur="${d}">${d} с</button>`).join('')}</div>`;
        h += `<div class="row"><button class="chip" data-a="fl">◀ Раньше</button><button class="chip" data-a="fr">Позже ▶</button><button class="chip" data-a="fdup">⧉ Повторить</button><button class="chip" data-a="fdel">🗑 Убрать</button><button class="chip" data-a="fall">⏱ Эту длительность — всем</button></div>`;
        h += `<p class="hint">Кадры можно переставлять, перетаскивая по таймлайну (на телефоне — подержи палец).</p>`;
      } else if (c) {
        const b = this.bufs[this.srcKey(c.src)];
        h += `<h4 style="margin:0 0 8px">${this.selC === 'music' ? '🎵' : '🔊'} ${esc(c.name)}</h4>`;
        h += slider('Громкость', 'c.vol', c.vol ?? (this.selC === 'music' ? 0.6 : 1), 0, 1.5, 0.05, v => Math.round(v * 100) + '%');
        if (this.selC !== 'music') h += slider('Начало', 'c.at', c.at, 0, Math.max(1, this.total()), 0.05, v => (+v).toFixed(2) + ' с');
        h += `<div class="row"><button class="chip" data-a="cplay">▶ Послушать</button>${this.selC !== 'music' ? '<button class="chip" data-a="chere">📍 На позицию курсора</button><button class="chip" data-a="cdup">⧉ Копия</button>' : ''}<button class="chip" data-a="cdel">🗑 Удалить</button></div>`;
        if (b) h += `<p class="hint">Длина звука: ${b.duration.toFixed(1)} с. Звуки можно двигать по таймлайну пальцем.</p>`;
      } else h = '<p class="hint">Выбери кадр или звук на таймлайне.</p>';
    } else if (this.tab === 'sounds') {
      h += `<p class="hint">＋ добавляет звук туда, где стоит жёлтый курсор (${this.fmt(this.t)}).</p>`;
      h += `<div class="row" style="margin-bottom:10px"><button class="btn sm" data-a="upsnd">⬆ Загрузить свой звук</button><button class="btn alt sm" data-a="rec">🎤 Записать голос</button></div>`;
      const ups = this._ups || [];
      if (ups.length) h += secHTML('Мои звуки', ups.map(u => `<div class="snd"><b>${esc(u.name)}</b><button data-pu="${u.id}">▶</button><button class="add" data-au="${u.id}">＋</button><button data-du="${u.id}">🗑</button></div>`).join(''));
      h += secHTML('Набор звуков', SFX.map(([k, n]) => `<div class="snd"><b>${n}</b><button data-pb="${k}">▶</button><button class="add" data-ab="${k}">＋</button></div>`).join(''));
    } else if (this.tab === 'music') {
      const m = f.music;
      h += `<p class="hint">Музыка играет фоном весь мультик и плавно затихает в конце.</p>`;
      h += `<div class="snd${!m ? ' on' : ''}"><b>Без музыки</b><button class="add" data-mnone>✓</button></div>`;
      h += MUSIC.map(([k, n]) => `<div class="snd${m && m.src.k === k ? ' on' : ''}"><b>${n}</b><button data-pb="${k}">▶</button><button class="add" data-mb="${k}">✓</button></div>`).join('');
      (this._ups || []).forEach(u => { h += `<div class="snd${m && m.src.id === u.id ? ' on' : ''}"><b>${esc(u.name)}</b><button data-pu="${u.id}">▶</button><button class="add" data-mu="${u.id}">✓</button></div>`; });
      h += `<div class="row" style="margin:10px 0"><button class="btn sm" data-a="upmus">⬆ Загрузить свою музыку</button><button class="chip" data-a="stopprev">⏹ Стоп</button></div>`;
      if (m) h += slider('Громкость музыки', 'm.vol', m.vol ?? 0.6, 0, 1.2, 0.05, v => Math.round(v * 100) + '%');
    } else if (this.tab === 'set') {
      h += secHTML('Скорость мультика (кадров в секунду)', `<div class="row">${FPS_PRESETS.map(n => `<button class="chip" data-fps="${n}">${n}</button>`).join('')}</div><p class="hint">Меняет длительность всех кадров сразу. Для плавной анимации — 6–12 кадров в секунду и много похожих кадров.</p>`);
      h += slider('Новый кадр, сек', 'film.defDur', f.defDur || 0.5, 0.05, 3, 0.05, v => (+v).toFixed(2));
      h += secHTML('Фильм', `<div class="row"><button class="chip" data-a="rename">✏️ Переименовать</button><button class="chip" data-a="newfilm">＋ Новый фильм</button><button class="chip" data-a="delfilm">🗑 Удалить фильм</button><button class="chip" data-a="clearf">Очистить таймлайн</button></div>`);
      h += `<p class="hint">Кадров: ${f.frames.length}, звуков: ${f.clips.length}, длина: ${this.fmt(this.total())}.</p>`;
    }
    $('#mSecs').innerHTML = h;
  },
  async loadUps() { this._ups = (await DB.all('uploads')).filter(u => u.kind === 'snd').sort((a, b) => a.created - b.created); },

  // ---------- экспорт ----------
  pickMime() {
    if (!window.MediaRecorder) return null;
    const list = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs="avc1.42E01E, mp4a.40.2"', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    return list.find(t => { try { return MediaRecorder.isTypeSupported(t); } catch (_) { return false; } }) || '';
  },
  async exportVideo() {
    if (!this.film.frames.length) return toast('Добавь кадры, чтобы сделать видео');
    const mime = this.pickMime();
    const cv = $('#mCanvas');
    if (mime === null || !cv.captureStream) return modal('<h3>Этот браузер не умеет записывать видео</h3><p>Открой приложение в свежем Chrome, Edge, Firefox или Safari.</p><div class="row"><button class="btn" data-close>Ок</button></div>');
    this.stop();
    this.audio();
    await this.loadAllAudio();
    await Promise.all(this.film.frames.map(f => new Promise(r => { const im = this.img(f.pid); if (!im || im.complete) r(); else { im.onload = r; im.onerror = r; } })));
    const total = this.total();
    let cancelled = false;
    modal(`<h3>🎬 Записываю мультик…</h3><p class="hint">Запись идёт в реальном времени (${this.fmt(total)}). Не сворачивай приложение.</p><div class="prog"><i id="expBar"></i></div><div class="row"><button class="btn ghost" id="expCancel">Отмена</button></div>`, box => { $('#expCancel', box).onclick = () => { cancelled = true; this.stop(); rec.state !== 'inactive' && rec.stop(); }; });
    const dest = this.ac.createMediaStreamDestination();
    // тихий тон, чтобы аудиодорожка не пустовала
    const osc = this.ac.createOscillator(), og = this.ac.createGain(); og.gain.value = 0.00001; osc.connect(og); og.connect(dest); osc.start();
    const vs = cv.captureStream(30);
    const stream = new MediaStream([...vs.getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const chunks = [];
    var rec = new MediaRecorder(stream, Object.assign({ videoBitsPerSecond: 6_000_000, audioBitsPerSecond: 160_000 }, mime ? { mimeType: mime } : {}));
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const done = new Promise(r => rec.onstop = r);
    rec.start(250);
    const bar = setInterval(() => { const b = $('#expBar'); if (b) b.style.width = Math.min(100, this.t / total * 100) + '%'; }, 200);
    this.t = 0;
    await new Promise(r => this.play(true, dest, r));
    await new Promise(r => setTimeout(r, 120));
    if (rec.state !== 'inactive') rec.stop();
    await done;
    clearInterval(bar); osc.stop(); vs.getTracks().forEach(t => t.stop());
    if (cancelled) { closeModal(); return; }
    const type = (rec.mimeType || mime || 'video/webm').split(';')[0];
    const blob = new Blob(chunks, { type });
    const ext = type.includes('mp4') ? 'mp4' : 'webm';
    const name = (this.film.name || 'мультик').replace(/[\\/:*?"<>|]+/g, '_') + '.' + ext;
    const url = URL.createObjectURL(blob);
    const file = new File([blob], name, { type });
    const canShare = navigator.canShare && navigator.canShare({ files: [file] });
    modal(`<h3>Готово! 🎉</h3><video src="${url}" controls playsinline></video>
      <div class="row"><button class="btn" id="expDl">⬇ Скачать ${ext.toUpperCase()}</button>${canShare ? '<button class="btn alt" id="expShare">📤 Поделиться</button>' : ''}<button class="btn ghost" data-close>Закрыть</button></div>
      <p class="hint">${(blob.size / 1048576).toFixed(1)} МБ. ${ext === 'webm' ? 'Формат WebM открывается в браузере, Telegram и VLC.' : ''}</p>`, box => {
      $('#expDl', box).onclick = () => downloadBlob(blob, name);
      const sh = $('#expShare', box); if (sh) sh.onclick = () => navigator.share({ files: [file], title: this.film.name }).catch(() => { });
    });
  },
  makeTitle() {
    modal(`<h3>📝 Титр-кадр</h3><textarea class="textarea" id="ttText">Эпизод 1</textarea>
      <div class="sec" style="margin-top:10px"><h4>Фон</h4>${swatches(['#2a1640', '#000000', '#ffffff', '#ff8cc6', '#8a5cff', '#48c0ff', '#ffd84a'], '#2a1640', 'ttbg')}</div>
      <div class="row"><button class="btn" id="ttOk">Создать</button><button class="btn ghost" data-close>Отмена</button></div>`, box => {
      let bg = '#2a1640';
      box.addEventListener('click', e => { const b = e.target.closest('button[data-col]'); if (b) { bg = b.dataset.v; $$('button[data-col]', box).forEach(x => x.classList.toggle('on', x === b)); } });
      box.addEventListener('input', e => { if (e.target.matches('input[data-col]')) bg = e.target.value; });
      $('#ttOk', box).onclick = async () => {
        const [W, H] = this.aspectWH().map(v => v * 1.25);
        const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        const g = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.7); g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(0,0,0,.25)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        const light = hex2rgb(bg).reduce((a, b) => a + b) > 500;
        const fs = Math.round(H / 9);
        ctx.font = `900 ${fs}px Nunito, "Segoe UI", Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const lines = wrapText($('#ttText', box).value, ctx.font, W * 0.8);
        lines.forEach((l, i) => {
          const y = H / 2 + (i - (lines.length - 1) / 2) * fs * 1.25;
          ctx.lineWidth = fs * 0.16; ctx.strokeStyle = light ? '#ffffff' : '#000000'; ctx.lineJoin = 'round'; ctx.strokeText(l, W / 2, y);
          ctx.fillStyle = light ? '#2a1640' : '#ffffff'; ctx.fillText(l, W / 2, y);
        });
        const blob = await canvasBlob(cv, 'image/jpeg', 0.9);
        const tc = document.createElement('canvas'); tc.width = 320; tc.height = Math.round(320 * H / W); tc.getContext('2d').drawImage(cv, 0, 0, tc.width, tc.height);
        const p = { id: uid(), blob, thumb: await canvasBlob(tc, 'image/jpeg', 0.75), w: W, h: H, aspect: W > H ? '16:9' : W < H ? '9:16' : '1:1', created: Date.now(), title: true };
        await DB.put('photos', p); Studio.photos.push(p);
        const at = this.selF ? this.film.frames.findIndex(x => x.id === this.selF) + 1 : this.film.frames.length;
        const fr = await this.addPhotoToFilm(p.id, at); fr.dur = 2; this.selF = fr.id; this.save();
        closeModal(); this.render(); this.renderPanel(); Studio.renderStrip();
      };
    });
  },
  async recordVoice() {
    if (!navigator.mediaDevices || !window.MediaRecorder) return toast('Запись голоса не поддерживается');
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { return toast('Нет доступа к микрофону'); }
    const mt = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported(t)) || '';
    const rec = new MediaRecorder(stream, mt ? { mimeType: mt } : {}); const ch = [];
    rec.ondataavailable = e => e.data.size && ch.push(e.data);
    let t0 = Date.now(), iv;
    modal(`<h3>🎤 Запись голоса</h3><p style="font-size:28px;text-align:center" id="recT">0.0 с</p><div class="row"><button class="btn red" id="recStop">⏹ Стоп и сохранить</button><button class="btn ghost" id="recCancel">Отмена</button></div>`, box => {
      let cancel = false;
      $('#recCancel', box).onclick = () => { cancel = true; rec.stop(); };
      $('#recStop', box).onclick = () => rec.stop();
      rec.onstop = async () => {
        clearInterval(iv); stream.getTracks().forEach(t => t.stop());
        closeModal(); if (cancel || !ch.length) return;
        const n = (this._ups || []).length + 1;
        const u = { id: uid(), kind: 'snd', name: `Голос ${n}`, blob: new Blob(ch, { type: rec.mimeType || mt }), created: Date.now() };
        await DB.put('uploads', u); await this.loadUps();
        await this.addClip({ type: 'u', id: u.id }, u.name);
      };
    });
    iv = setInterval(() => { const e = $('#recT'); if (e) e.textContent = ((Date.now() - t0) / 1000).toFixed(1) + ' с'; }, 100);
    rec.start();
  },
  async addClip(src, name) {
    try { await this.buffer(src); } catch (e) { return toast('Этот файл не получилось открыть как звук'); }
    const c = { id: uid(), src, name, at: +this.t.toFixed(2), vol: 1 };
    this.film.clips.push(c); this.selC = c.id; this.selF = null; this.save(); this.render();
    toast(`＋ ${name} на ${this.fmt(c.at)}`);
  },
  async uploadAudio(asMusic) {
    const f = await pickFile('#fileAudio'); if (!f) return;
    const u = { id: uid(), kind: 'snd', name: f.name.replace(/\.[^.]+$/, '').slice(0, 40), blob: f, created: Date.now() };
    await DB.put('uploads', u);
    try { await this.buffer({ type: 'u', id: u.id }); } catch (e) { await DB.del('uploads', u.id); return toast('Этот файл не получилось открыть как звук'); }
    await this.loadUps();
    if (asMusic) { this.film.music = { src: { type: 'u', id: u.id }, name: u.name, vol: 0.6 }; this.save(); this.render(); }
    else await this.addClip({ type: 'u', id: u.id }, u.name);
    this.renderPanel();
  },
};
Screens.montage = Montage;

// ---------- события ----------
$('#mPlay').onclick = () => Montage.playing ? Montage.stop() : Montage.play();
$('#mExport').onclick = () => Montage.exportVideo();
$('#mFade').onchange = e => { Montage.film.fade = e.target.checked; Montage.save(); Montage.draw(Montage.t); };
$('#mZoomIn').onclick = () => { Montage.pps = Math.min(400, Montage.pps * 1.4); Montage.render(); };
$('#mZoomOut').onclick = () => { Montage.pps = Math.max(10, Montage.pps / 1.4); Montage.render(); };
$('#mFilm').onchange = e => { Montage.stop(); Montage.film = Montage.films.find(f => f.id === e.target.value); Montage.t = 0; Montage.selF = Montage.selC = null; DB.put('kv', Montage.film.id, 'film'); Montage.renderFilms(); Montage.render(); Montage.renderPanel(); };
$('#mFilmMenu').onclick = () => { Montage.tab = 'set'; Montage.renderPanel(); };
$('#mTabs').onclick = async e => {
  const b = e.target.closest('[data-t]'); if (!b) return; Montage.tab = b.dataset.t;
  if (Montage.tab === 'sounds' || Montage.tab === 'music') await Montage.loadUps();
  Montage.renderPanel();
};
$('#tlRuler').addEventListener('pointerdown', e => { const r = $('#tlIn').getBoundingClientRect(); Montage.seek((e.clientX - r.left - 8) / Montage.pps); });

$('#mSecs').addEventListener('click', async e => {
  const M = Montage, f = M.film;
  const ph = e.target.closest('[data-p]');
  if (ph) {
    const at = M.selF ? f.frames.findIndex(x => x.id === M.selF) + 1 : f.frames.length;
    const fr = await M.addPhotoToFilm(ph.dataset.p, at); M.selF = fr.id; M.selC = null; M.render(); M.renderPanel();
    return;
  }
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.pb) return M.preview({ type: 'b', k: b.dataset.pb });
  if (b.dataset.pu) return M.preview({ type: 'u', id: b.dataset.pu });
  if (b.dataset.ab) { const s = SFX.find(x => x[0] === b.dataset.ab); return M.addClip({ type: 'b', k: s[0] }, s[1].replace(/^\S+\s/, '')); }
  if (b.dataset.au) { const u = M._ups.find(x => x.id === b.dataset.au); return M.addClip({ type: 'u', id: u.id }, u.name); }
  if (b.dataset.du) { if (await confirmBox('Удалить этот звук?', 'Удалить')) { await DB.del('uploads', b.dataset.du); M.films.forEach(fl => { fl.clips = fl.clips.filter(c => c.src.id !== b.dataset.du); if (fl.music && fl.music.src.id === b.dataset.du) fl.music = null; }); M.save(); await M.loadUps(); M.render(); M.renderPanel(); } return; }
  if (b.hasAttribute('data-mnone')) { f.music = null; M.save(); M.render(); M.renderPanel(); return; }
  if (b.dataset.mb) { const m = MUSIC.find(x => x[0] === b.dataset.mb); f.music = { src: { type: 'b', k: m[0] }, name: m[1].replace(/^\S+\s/, ''), vol: 0.6 }; M.buffer(f.music.src); M.save(); M.render(); M.renderPanel(); return; }
  if (b.dataset.mu) { const u = M._ups.find(x => x.id === b.dataset.mu); f.music = { src: { type: 'u', id: u.id }, name: u.name, vol: 0.6 }; M.save(); M.render(); M.renderPanel(); return; }
  if (b.dataset.fps) { const d = +(1 / +b.dataset.fps).toFixed(3); f.frames.forEach(x => x.dur = d); f.defDur = d; M.save(); M.render(); M.renderPanel(); toast(`${b.dataset.fps} кадр/с`); return; }
  if (b.dataset.dur) { const fr = f.frames.find(x => x.id === M.selF); if (fr) { fr.dur = +b.dataset.dur; M.save(); M.render(); M.renderPanel(); } return; }
  const a = b.dataset.a; if (!a) return;
  const fr = f.frames.find(x => x.id === M.selF), i = fr ? f.frames.indexOf(fr) : -1;
  const clip = f.clips.find(x => x.id === M.selC);
  switch (a) {
    case 'addall': f.frames.push(...Studio.photos.filter(p => !p.title).map(p => ({ id: uid(), pid: p.id, dur: f.defDur || 0.5 }))); break;
    case 'addnew': { const used = new Set(f.frames.map(x => x.pid)); const n = Studio.photos.filter(p => !used.has(p.id)); f.frames.push(...n.map(p => ({ id: uid(), pid: p.id, dur: f.defDur || 0.5 }))); toast(`Добавлено кадров: ${n.length}`); break; }
    case 'title': return M.makeTitle();
    case 'fl': if (i > 0) { f.frames.splice(i, 1); f.frames.splice(i - 1, 0, fr); } break;
    case 'fr': if (i >= 0 && i < f.frames.length - 1) { f.frames.splice(i, 1); f.frames.splice(i + 1, 0, fr); } break;
    case 'fdup': if (fr) { const n = { id: uid(), pid: fr.pid, dur: fr.dur }; f.frames.splice(i + 1, 0, n); M.selF = n.id; } break;
    case 'fdel': if (fr) { f.frames.splice(i, 1); M.selF = (f.frames[i] || f.frames[i - 1] || {}).id || null; } break;
    case 'fall': if (fr) { f.frames.forEach(x => x.dur = fr.dur); f.defDur = fr.dur; } break;
    case 'cplay': { const c = M.selC === 'music' ? f.music : clip; if (c) M.preview(c.src); return; }
    case 'chere': if (clip) clip.at = +M.t.toFixed(2); break;
    case 'cdup': if (clip) { const n = clone(clip); n.id = uid(); n.at = +(clip.at + 0.5).toFixed(2); f.clips.push(n); M.selC = n.id; } break;
    case 'cdel': if (M.selC === 'music') f.music = null; else f.clips = f.clips.filter(x => x !== clip); M.selC = null; break;
    case 'upsnd': return M.uploadAudio(false);
    case 'upmus': return M.uploadAudio(true);
    case 'rec': return M.recordVoice();
    case 'stopprev': M.stopAudio(); return;
    case 'rename': { const n = prompt('Название фильма', f.name); if (n) { f.name = n.trim().slice(0, 40) || f.name; M.renderFilms(); } break; }
    case 'newfilm': { const n = M.newFilm('Мультик ' + (M.films.length + 1)); M.films.push(n); M.film = n; M.t = 0; M.selF = M.selC = null; M.renderFilms(); break; }
    case 'delfilm': if (await confirmBox(`Удалить фильм «${f.name}»? Кадры в студии останутся.`, 'Удалить')) { await DB.del('films', f.id); M.films = M.films.filter(x => x !== f); if (!M.films.length) M.films.push(M.newFilm('Мой мультик')); M.film = M.films[0]; M.renderFilms(); } break;
    case 'clearf': if (await confirmBox('Убрать все кадры и звуки с таймлайна?', 'Очистить')) { f.frames = []; f.clips = []; f.music = null; } break;
  }
  M.save(); M.render(); M.renderPanel();
});
$('#mSecs').addEventListener('input', e => {
  const M = Montage, f = M.film, sl = e.target.closest('[data-sl]'); if (!sl) return;
  const [g, k] = sl.dataset.sl.split('.'), v = +sl.value;
  const lab = sl.nextElementSibling;
  if (g === 'f') { const fr = f.frames.find(x => x.id === M.selF); if (fr) { fr.dur = v; lab.textContent = v.toFixed(2) + ' с'; } }
  if (g === 'c') { const c = M.selC === 'music' ? f.music : f.clips.find(x => x.id === M.selC); if (c) { c[k] = v; lab.textContent = k === 'vol' ? Math.round(v * 100) + '%' : v.toFixed(2) + ' с'; } }
  if (g === 'm' && f.music) { f.music.vol = v; lab.textContent = Math.round(v * 100) + '%'; }
  if (g === 'film') { f[k] = v; lab.textContent = v.toFixed(2); }
  M.save(); M.render();
});

// таймлайн: выбор, перестановка кадров, перетаскивание звуков
(() => {
  const tl = $('#tl');
  let d = null;
  tl.addEventListener('pointerdown', e => {
    const fr = e.target.closest('.fr'), cl = e.target.closest('.clip');
    if (!fr && !cl) return;
    const M = Montage;
    if (fr) { M.selF = fr.dataset.f; M.selC = null; } else { M.selC = cl.dataset.c; M.selF = null; }
    $$('.fr,.clip', tl).forEach(x => x.classList.toggle('on', x === (fr || cl)));
    M.tab = 'sel'; M.renderPanel();
    if (fr) { const f = M.film.frames, i = f.findIndex(x => x.id === fr.dataset.f); let acc = 0; for (let j = 0; j < i; j++) acc += f[j].dur; if (!M.playing) { M.t = acc; M.draw(acc + 0.001); M.updHead(); } }
    d = { el: fr || cl, kind: fr ? 'f' : (cl.dataset.c === 'music' ? null : 'c'), id: (fr || cl).dataset[fr ? 'f' : 'c'], x0: e.clientX, sl0: tl.scrollLeft, active: e.pointerType !== 'touch', moved: false, pid: e.pointerId };
    if (!d.kind) { d = null; return; }
    if (e.pointerType === 'touch') d.hold = setTimeout(() => { if (d && !d.moved) { d.active = true; d.el.classList.add('ghost'); navigator.vibrate && navigator.vibrate(20); } }, 280);
    if (d.kind === 'c') { const c = M.film.clips.find(x => x.id === d.id); d.at0 = c.at; }
    try { tl.setPointerCapture(e.pointerId); } catch (_) { }
  });
  tl.addEventListener('pointermove', e => {
    if (!d || e.pointerId !== d.pid) return;
    const dx = e.clientX - d.x0;
    if (!d.active) { if (Math.abs(dx) > 6) { d.moved = true; clearTimeout(d.hold); } if (d.moved) tl.scrollLeft = d.sl0 - dx; return; }
    if (Math.abs(dx) < 4 && !d.dragging) return;
    d.dragging = true;
    const M = Montage, f = M.film;
    if (d.kind === 'c') {
      const c = f.clips.find(x => x.id === d.id);
      let at = Math.max(0, d.at0 + dx / M.pps);
      // прилипание к началу кадров
      let acc = 0; for (const fr of f.frames) { if (Math.abs((acc - at) * M.pps) < 8) { at = acc; break; } acc += fr.dur; }
      c.at = +at.toFixed(2); d.el.style.left = (c.at * M.pps + 8) + 'px';
    } else {
      const r = $('#tlIn').getBoundingClientRect(), x = (e.clientX - r.left - 8) / M.pps;
      const i = f.frames.findIndex(q => q.id === d.id);
      let acc = 0, target = f.frames.length - 1;
      for (let j = 0; j < f.frames.length; j++) { if (x < acc + f.frames[j].dur) { target = j; break; } acc += f.frames[j].dur; }
      if (target !== i) { const [m] = f.frames.splice(i, 1); f.frames.splice(target, 0, m); M.render(); d.el = $(`.fr[data-f="${d.id}"]`); d.el && d.el.classList.add('ghost'); }
    }
  });
  const end = e => {
    if (!d || e.pointerId !== d.pid) return;
    clearTimeout(d.hold);
    if (d.dragging) { Montage.save(); Montage.render(); if (Montage.tab === 'sel') Montage.renderPanel(); }
    d.el && d.el.classList.remove('ghost');
    d = null;
  };
  tl.addEventListener('pointerup', end); tl.addEventListener('pointercancel', end);
})();
document.addEventListener('keydown', e => {
  if (curScreen !== 'montage' || e.target.matches('input,textarea,select')) return;
  if (e.key === ' ') { e.preventDefault(); $('#mPlay').click(); }
  if (e.key === 'Delete' || e.key === 'Backspace') { const b = $(Montage.selF ? '[data-a="fdel"]' : '[data-a="cdel"]'); if (b) b.click(); }
});
window.addEventListener('resize', () => { if (curScreen === 'montage') Montage.render(); });
