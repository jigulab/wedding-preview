// 저장소 어댑터 — IndexedDB(브라우저) / 메모리(테스트). 둘은 같은 인터페이스를 가진다.
//   getProject(id) · putProject({id, config, updatedAt}) · getAsset(id) · putAsset({id, blob, type, w, h})
//   deleteAsset(id) · listAssets()
const DB_NAME = 'wedding-builder';
const DB_VERSION = 1;

export function createMemoryStore() {
  const projects = new Map();
  const assets = new Map();
  return {
    kind: 'memory',
    async getProject(id) { const p = projects.get(id); return p ? structuredClone(p) : null; },
    async putProject(p) { projects.set(p.id, structuredClone(p)); },
    async getAsset(id) { return assets.get(id) ?? null; },
    async putAsset(a) { assets.set(a.id, a); },
    async deleteAsset(id) { assets.delete(id); },
    async listAssets() { return [...assets.values()]; },
  };
}

function req(r) {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function createIdbStore() {
  if (!('indexedDB' in globalThis)) throw new Error('이 브라우저는 저장소를 지원하지 않습니다.');
  const open = indexedDB.open(DB_NAME, DB_VERSION);
  open.onupgradeneeded = () => {
    const db = open.result;
    if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('assets')) db.createObjectStore('assets', { keyPath: 'id' });
  };
  const db = await req(open);
  const tx = (name, mode, fn) => new Promise((resolve, reject) => {
    const t = db.transaction(name, mode);
    let out;
    Promise.resolve(fn(t.objectStore(name))).then((v) => { out = v; });
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? new Error('저장이 취소되었습니다.'));
  });
  return {
    kind: 'idb',
    getProject: (id) => tx('projects', 'readonly', (s) => req(s.get(id))).then((v) => v ?? null),
    putProject: (p) => tx('projects', 'readwrite', (s) => { s.put(p); }),
    getAsset: (id) => tx('assets', 'readonly', (s) => req(s.get(id))).then((v) => v ?? null),
    putAsset: (a) => tx('assets', 'readwrite', (s) => { s.put(a); }),
    deleteAsset: (id) => tx('assets', 'readwrite', (s) => { s.delete(id); }),
    listAssets: () => tx('assets', 'readonly', (s) => req(s.getAll())),
  };
}

/** config 가 참조하는 asset:<id> 목록 */
export function usedAssetIds(config) {
  const ids = new Set();
  JSON.stringify(config, (k, v) => {
    if (typeof v === 'string' && v.startsWith('asset:')) ids.add(v.slice(6));
    return v;
  });
  return ids;
}

export const newId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`);
