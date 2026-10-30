// Хранилище: IndexedDB. Сторы: chars, photos, films, uploads (свои фоны/картинки/звуки), kv.
'use strict';
const DB = (() => {
  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open('animult', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        for (const s of ['chars', 'photos', 'films', 'uploads']) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' });
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  function tx(store, mode, fn) {
    return open().then(d => new Promise((res, rej) => {
      const t = d.transaction(store, mode), s = t.objectStore(store);
      let out;
      const r = fn(s);
      if (r) r.onsuccess = () => { out = r.result; };
      t.oncomplete = () => res(out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    }));
  }
  return {
    get: (s, k) => tx(s, 'readonly', st => st.get(k)),
    all: (s) => tx(s, 'readonly', st => st.getAll()),
    put: (s, v, k) => tx(s, 'readwrite', st => k === undefined ? st.put(v) : st.put(v, k)),
    del: (s, k) => tx(s, 'readwrite', st => st.delete(k)),
  };
})();
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
