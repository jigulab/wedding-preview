// 편집기 본체 — 상태(config) · 섹션 목록 · 패널 · 미리보기 · 자동 저장 · 되돌리기 · 사진 · 백업.
import { migrate, moveSection, placeSection, toggleSection, SECTION_LABELS, FIXED_FIRST, FIXED_LAST, GALLERY_MAX } from '../lib/schema.js';
import { getPath, setPath } from '../lib/path.js';
import { formatDate, formatTime, todayKst } from '../lib/date.js';
import { processImage, checkAudio } from '../lib/image.js';
import { MOODS } from '../themes.js';
import { esc } from '../render.js';
import { createIdbStore, createMemoryStore, newId, usedAssetIds } from './store.js';
import { createHistory } from './history.js';
import { createBridge } from './bridge.js';
import { exportProject, parseBackup } from './export.js';
import { PANELS, SETTINGS, TEMPLATES, SAMPLE_SETS, renderPanel, icon, DATALISTS } from './panels.js';
import { runWizard } from './wizard.js';
import { renderKakao } from './kakao-mock.js';

const PROJECT_ID = 'current';
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const mq = matchMedia('(max-width: 899px)');

const S = {
  store: null,
  config: null,
  mode: 'guest',          // guest | parents | memorial | kakao
  panel: null,            // 열린 패널 id (null = 목록)
  reorder: false,         // 섹션 순서 바꾸기 모드
  sheet: 'half',          // 모바일 바텀시트: peek | half | full
  urls: new Map(),        // asset id → objectURL (편집기 썸네일용)
  blobs: new Map(),       // asset id → Blob (미리보기 재전송용)
  history: createHistory(50),
  lastEdit: { at: 0, path: '' },
  saveTimer: null,
  bridge: null,
};

/* ================= 시작 ================= */

export async function start() {
  document.body.insertAdjacentHTML('beforeend', DATALISTS);
  try {
    S.store = await createIdbStore();
  } catch {
    S.store = createMemoryStore();
    setStatus('error', '이 브라우저에서는 자동 저장이 안 돼요. 백업 파일로 저장해 주세요.');
  }
  const q = new URLSearchParams(location.search);
  const saved = await S.store.getProject(PROJECT_ID).catch(() => null);
  const startId = q.get('start');
  if (!saved?.config && startId && /^[A-Za-z0-9_-]+$/.test(startId)) {
    // ?start=sample(소개 페이지 "예시 둘러보기") 또는 ?start=<커플 id>(그 커플 청첩장을 편집기로) — 마법사 없이 시작
    const res = await fetch(`../couples/${startId}/config.json`);
    if (!res.ok) throw new Error('청첩장 데이터를 찾지 못했어요.');
    S.config = { ...migrate(await res.json()), assetBase: `../couples/${startId}/` };
    mount();
    await save();
  } else if (saved?.config) {
    S.config = migrate(saved.config);
    await loadAssets(S.config);
    mount();
    setStatus('saved', saved.updatedAt);
    if (startId) toast('만들던 청첩장을 열었어요. 예시를 보려면 메뉴 → "예시 청첩장으로 바꾸기"', 4200);
  } else {
    const result = await runWizard({ processPhoto: addPhotoFile });
    S.config = result.config;
    mount();
    await save();
    if (result.welcome) toast(result.welcome, 3200);
  }
  // 점검·바로가기용: ?panel=greeting · ?mode=parents · ?sheet=full
  if (q.get('mode')) setMode(q.get('mode'));
  if (q.get('panel')) openPanel(q.get('panel'));
  if (q.get('sheet')) setSheet(q.get('sheet'));
}

async function loadAssets(config) {
  for (const id of usedAssetIds(config)) {
    const a = await S.store.getAsset(id).catch(() => null);
    if (a) remember(id, a.blob);
  }
}

function remember(id, blob) {
  if (S.urls.has(id)) URL.revokeObjectURL(S.urls.get(id));
  S.urls.set(id, URL.createObjectURL(blob));
  S.blobs.set(id, blob);
  S.bridge?.asset(id, blob, true);
}

/** 저장소 오류를 사람 말로 */
const isQuota = (err) => err?.name === 'QuotaExceededError' || /quota/i.test(err?.message ?? '');
function friendly(err) {
  if (isQuota(err)) {
    S.quota = true;
    return '저장 공간이 부족해서 사진을 넣지 못했어요. 메뉴에서 백업 파일로 저장해 주세요.';
  }
  return /[가-힣]/.test(err?.message ?? '') ? err.message : '파일을 처리하지 못했어요.';
}

/** 사진 파일 → 압축 → 저장 → 'asset:<id>' */
async function addPhotoFile(file) {
  const out = await processImage(file);
  const id = newId();
  await S.store.putAsset({ id, ...out });
  S.quota = false;
  remember(id, out.blob);
  return `asset:${id}`;
}

const thumb = (ref) => {
  if (!ref) return '';
  if (ref.startsWith('asset:')) return S.urls.get(ref.slice(6)) ?? '';
  if (/^(https?:|data:|blob:)/.test(ref)) return ref;
  const base = /^\.\.\/couples\/[A-Za-z0-9_-]+\/$/.test(S.config?.assetBase ?? '') ? S.config.assetBase : '../couples/sample/';
  return `${base}${ref}`;
};

/* ================= 화면 뼈대 ================= */

function mount() {
  const app = $('#builder');
  app.innerHTML = `
    <header class="top">
      <a class="brand" href="index.html" aria-label="소개 페이지로">청첩장 스튜디오<em>시제품</em></a>
      <div class="top__status" data-status aria-live="polite"></div>
      <div class="top__tools">
        <button class="ic" data-action="undo" aria-label="되돌리기" title="되돌리기 (Ctrl+Z)" disabled><svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3"/></svg></button>
        <button class="ic" data-action="redo" aria-label="다시하기" title="다시하기 (Ctrl+Shift+Z)" disabled><svg viewBox="0 0 24 24"><path d="M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3"/></svg></button>
        <div class="menu">
          <button class="ic" data-action="menu" aria-label="메뉴" aria-expanded="false"><svg viewBox="0 0 24 24"><path d="M5 12h.01M12 12h.01M19 12h.01"/></svg></button>
          <div class="menu__list" hidden>
            <button data-action="export">백업 파일로 저장</button>
            <button data-action="import">백업 파일 불러오기</button>
            <button data-action="load-sample">예시 청첩장으로 바꾸기</button>
            <hr>
            <button data-action="reset" class="danger">처음부터 다시 만들기</button>
          </div>
        </div>
        <button class="publish" data-action="publish">게시하기</button>
      </div>
    </header>
    <div class="body">
      <aside class="side" data-side>
        <div class="sheet-handle" data-sheet-handle role="button" tabindex="0" aria-label="편집판 크기 바꾸기"><span></span><em>눌러서 펼치기</em></div>
        <div class="side__inner" data-side-inner></div>
      </aside>
      <section class="stage" data-stage>
        <div class="modes" role="tablist" aria-label="미리보기 종류">
          ${[['guest', '하객'], ['parents', '부모님'], ['memorial', '예식 후'], ['kakao', '카톡']].map(([k, t]) => `<button role="tab" data-action="mode" data-mode="${k}" aria-selected="${k === S.mode}">${t}</button>`).join('')}
        </div>
        <div class="phone" data-phone>
          <iframe src="preview.html" title="청첩장 미리보기" data-frame></iframe>
          <div class="kakao" data-kakao hidden></div>
        </div>
      </section>
    </div>
    <input type="file" hidden data-file>
    <div class="toast-b" data-toast hidden></div>`;

  const iframe = $('[data-frame]');
  S.bridge = createBridge(iframe, {
    onReady: () => {
      for (const [id, blob] of S.blobs) S.bridge.asset(id, blob, true);
      refreshPreview(true);
    },
    onSectionClick: (id) => openPanel(id, { fromPreview: true }),
  });

  app.addEventListener('click', onClick);
  app.addEventListener('input', onInput);
  app.addEventListener('change', onChange);
  bindDrag(app);
  bindSheet();
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', fitPhone);
  mq.addEventListener('change', () => { renderSide(); fitPhone(); });

  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    toast('아이폰은 7일 넘게 열지 않으면 저장 내용이 지워질 수 있어요. 가끔 메뉴에서 "백업 파일로 저장"을 눌러 주세요.', 6000);
  }
  renderSide();
  fitPhone();
}

/* ================= 왼쪽(모바일: 아래) 영역 ================= */

function summary(id, c) {
  switch (id) {
    case 'cover': return MOODS[c.theme.mood]?.name ?? '';
    case 'greeting': return c.greeting?.lines?.[0] ?? '';
    case 'parents': return [c.groom.name, c.bride.name].filter(Boolean).join(' · ');
    case 'calendar': return c.wedding.date ? `${formatDate(c.wedding.date).short} ${c.wedding.time ? formatTime(c.wedding.time).ko : ''}` : '날짜를 넣어 주세요';
    case 'location': return [c.venue.name, c.venue.hall].filter(Boolean).join(' ') || '예식장을 넣어 주세요';
    case 'flower': return c.flowerNotice || '';
    case 'accounts': { const n = (c.accounts.groomSide?.length ?? 0) + (c.accounts.brideSide?.length ?? 0); return n ? `계좌 ${n}개` : '계좌 없음'; }
    case 'gallery': return `사진 ${c.gallery.length}장`;
    case 'notices': return c.notices.length ? c.notices.map((n) => n.title).filter(Boolean).join(', ') : '없음';
    case 'music': return c.music?.src ? (c.music.title || '음악 있음') : '음악 없음';
    case 'share': return c.meta?.title ?? '';
    default: return '';
  }
}

function renderSide() {
  const inner = $('[data-side-inner]');
  if (!inner) return;
  const c = S.config;
  if (S.panel) {
    const p = PANELS[S.panel];
    const sec = c.sections.find((s) => s.id === S.panel);
    inner.innerHTML = `
      <div class="panel">
        <div class="panel__head">
          <button class="back" data-action="back" aria-label="목록으로"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
          <h2>${esc(p.title)}</h2>
          ${sec && sec.id !== FIXED_FIRST && sec.id !== FIXED_LAST ? `<label class="vis"><span>${sec.enabled ? '보임' : '숨김'}</span><input type="checkbox" class="switch" data-action="toggle" data-id="${sec.id}" ${sec.enabled ? 'checked' : ''}></label>` : ''}
        </div>
        ${sec && !sec.enabled ? `<div class="panel__off"><p>이 섹션은 지금 청첩장에서 숨겨져 있어요. 내용은 그대로 남아 있어요.</p><button class="btn-s" data-action="show-section" data-id="${sec.id}">청첩장에 보이게 하기</button></div>` : ''}
        <div class="panel__body" data-panel-body>${renderPanel(S.panel, c, { thumb, mood: c.theme.mood, galleryCount: c.gallery.length })}</div>
      </div>`;
    return;
  }
  const items = c.sections.map((s, i) => {
    const fixed = s.id === FIXED_FIRST || s.id === FIXED_LAST;
    return `
      <li class="sec-item ${s.enabled ? '' : 'is-off'}" data-id="${s.id}" ${S.reorder && !fixed ? 'draggable="true"' : ''}>
        ${S.reorder && !fixed ? '<span class="handle" aria-hidden="true">⠿</span>' : ''}
        <button class="sec-item__main" data-action="open" data-id="${s.id}">
          <span class="sec-item__ic">${icon(s.id)}</span>
          <span class="sec-item__txt"><b>${esc(SECTION_LABELS[s.id])}</b><small>${esc(s.enabled ? summary(s.id, c) : '숨김')}</small></span>
        </button>
        ${S.reorder && !fixed ? `
          <span class="sec-item__move">
            <button data-action="sec-move" data-id="${s.id}" data-d="-1" aria-label="위로" ${i <= 1 ? 'disabled' : ''}>↑</button>
            <button data-action="sec-move" data-id="${s.id}" data-d="1" aria-label="아래로" ${i >= c.sections.length - 2 ? 'disabled' : ''}>↓</button>
          </span>` : ''}
        ${!S.reorder && !fixed ? `<input type="checkbox" class="switch switch--sm" data-action="toggle" data-id="${s.id}" ${s.enabled ? 'checked' : ''} aria-label="${esc(SECTION_LABELS[s.id])} 보이기">` : ''}
      </li>`;
  }).join('');
  inner.innerHTML = `
    <div class="list">
      <button class="design-card" data-action="open" data-id="design">
        <span class="design-card__sw" style="--c:${esc(MOODS[c.theme.mood].accents.find((a) => a.key === c.theme.accent)?.hex ?? MOODS[c.theme.mood].accents[0].hex)}"></span>
        <span><small>디자인</small><b>${esc(MOODS[c.theme.mood].name)}</b></span>
        <span class="design-card__go">바꾸기</span>
      </button>
      <div class="list__head"><h2>구성</h2><button class="link" data-action="reorder">${S.reorder ? '완료' : '순서 바꾸기'}</button></div>
      <ol class="sec-list">${items}</ol>
      <div class="list__head"><h2>설정</h2></div>
      <ul class="sec-list">${SETTINGS.map((id) => `
        <li class="sec-item"><button class="sec-item__main" data-action="open" data-id="${id}">
          <span class="sec-item__ic">${icon(id === 'share' ? 'safety' : id)}</span>
          <span class="sec-item__txt"><b>${esc(PANELS[id].title)}</b><small>${esc(settingSummary(id, c))}</small></span>
        </button></li>`).join('')}</ul>
    </div>`;
}

function settingSummary(id, c) {
  if (id === 'share') return c.privacy.autoDeleteDays ? `예식 ${c.privacy.autoDeleteDays}일 후 개인정보 삭제` : '자동 삭제 안 함';
  if (id === 'parentsMode') return c.parents.greetingLines?.length ? '혼주 인사말 있음' : '큰 글씨·혼주 먼저';
  if (id === 'memorial') return c.memorial.enabled ? `예식 ${c.memorial.afterDays}일 후 전환` : '사용 안 함';
  return '';
}

function openPanel(id, { fromPreview = false } = {}) {
  if (!PANELS[id]) return;
  S.panel = id;
  renderSide();
  $('[data-side-inner]').scrollTop = 0;
  // 패널마다 그 결과가 가장 잘 보이는 보기·위치로 미리보기를 옮긴다
  if (id === 'parentsMode') { setMode('parents'); S.bridge.focus('parents'); }
  else if (id === 'memorial') { setMode('memorial'); S.bridge.focus('calendar'); }
  else if (id === 'share') setMode('kakao');
  else {
    if (S.mode === 'kakao' || (!fromPreview && S.mode !== 'guest')) setMode('guest');
    if (c_has_section(id)) S.bridge.focus(id);
  }
  if (mq.matches && (S.sheet === 'peek' || fromPreview)) setSheet('half');
}
const c_has_section = (id) => S.config.sections.some((s) => s.id === id);

/* ================= 상태 바꾸기 ================= */

/** 모든 변경은 여기로. record=true 면 되돌리기 기록 */
function commit(next, { record = true, side = 'keep', path = '' } = {}) {
  if (record) {
    const now = Date.now();
    // 같은 칸을 연달아 타이핑하면 한 번으로 묶는다
    if (!(path && path === S.lastEdit.path && now - S.lastEdit.at < 900)) S.history.record(S.config);
    S.lastEdit = { at: now, path };
  }
  S.config = next;
  if (side === 'full') renderSide();
  refreshPreview();
  refreshUndo();
  scheduleSave();
}

function refreshUndo() {
  const u = $('[data-action="undo"]'), r = $('[data-action="redo"]');
  if (u) u.disabled = !S.history.canUndo;
  if (r) r.disabled = !S.history.canRedo;
}

function undo(dir) {
  const prev = dir < 0 ? S.history.undo(S.config) : S.history.redo(S.config);
  if (!prev) return;
  S.config = migrate(prev);
  S.lastEdit = { at: 0, path: '' };
  renderSide();
  refreshPreview(true);
  refreshUndo();
  scheduleSave();
  toast(dir < 0 ? '되돌렸어요' : '다시 적용했어요');
}

function previewToday() {
  const c = S.config;
  if (S.mode !== 'memorial' || !c.wedding.date) return todayKst();
  const d = new Date(`${c.wedding.date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + (c.memorial.afterDays ?? 1));
  return d.toISOString().slice(0, 10);
}

function refreshPreview(immediate = false) {
  if (S.mode === 'kakao') {
    $('[data-kakao]').innerHTML = renderKakao(S.config, thumb);
    return;
  }
  const c = S.mode === 'memorial' ? { ...S.config, memorial: { ...S.config.memorial, enabled: true } } : S.config;
  S.bridge.render(c, S.mode, previewToday(), immediate);
}

function setMode(mode) {
  S.mode = mode;
  $$('[data-action="mode"]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === mode)));
  const kakao = mode === 'kakao';
  $('[data-kakao]').hidden = !kakao;
  $('[data-frame]').hidden = kakao;
  refreshPreview(true);
}

/* ================= 저장 ================= */

function scheduleSave() {
  setStatus('saving');
  clearTimeout(S.saveTimer);
  S.saveTimer = setTimeout(save, 500);
}

async function save() {
  try {
    const updatedAt = Date.now();
    await S.store.putProject({ id: PROJECT_ID, config: S.config, updatedAt });
    if (S.quota) setStatus('error', '저장 공간 부족 · 메뉴에서 백업 파일로 저장해 주세요');
    else setStatus(S.store.kind === 'memory' ? 'error' : 'saved', updatedAt);
  } catch {
    setStatus('error');
  }
}

function setStatus(kind, at) {
  const el = $('[data-status]');
  if (!el) return;
  el.dataset.kind = kind;
  if (kind === 'saving') el.textContent = '저장 중…';
  else if (kind === 'saved') {
    const t = new Date(at ?? Date.now());
    el.textContent = `저장됨 · ${t.getHours() < 12 ? '오전' : '오후'} ${t.getHours() % 12 || 12}:${String(t.getMinutes()).padStart(2, '0')}`;
  } else el.textContent = typeof at === 'string' ? at : '저장 실패 · 메뉴에서 백업 파일로 저장해 주세요';
}

/* ================= 입력 ================= */

function readValue(el) {
  const k = el.dataset.kind;
  if (k === 'bool') return el.checked;
  if (k === 'number') return el.value === '' ? null : Number(el.value);
  if (k === 'lines') return el.value.split('\n').map((l) => l.replace(/\s+$/, '')).filter((l, i, a) => l !== '' || i < a.length - 1);
  return el.value;
}

const isField = (el) => el.matches?.('input[data-path], textarea[data-path], select[data-path]');

function onInput(e) {
  const el = e.target;
  if (!isField(el) || el.dataset.kind === 'bool') return;
  if (el.tagName === 'SELECT') return; // change 에서
  commit(setPath(S.config, el.dataset.path, readValue(el)), { path: el.dataset.path });
  updateListTitles(el);
}

function onChange(e) {
  const el = e.target;
  if (el.matches('[data-file]')) return onFile(el);
  if (el.dataset.action === 'toggle') {
    commit(toggleSection(S.config, el.dataset.id, el.checked), { side: S.panel ? 'full' : 'keep' });
    if (!S.panel) el.closest('.sec-item')?.classList.toggle('is-off', !el.checked);
    if (!S.panel) el.closest('.sec-item').querySelector('small').textContent = el.checked ? summary(el.dataset.id, S.config) : '숨김';
    return;
  }
  if (!isField(el)) return;
  if (el.dataset.kind === 'bool' || el.tagName === 'SELECT') {
    commit(setPath(S.config, el.dataset.path, readValue(el)), { path: el.dataset.path });
  }
  // 날짜·시간 입력 끝나면 lines 정리(빈 줄 제거) 반영
  if (el.dataset.kind === 'lines') {
    const clean = readValue(el).filter((l) => l.trim() !== '');
    commit(setPath(S.config, el.dataset.path, clean), { record: false });
  }
}

/** 리스트 항목 제목(예: "신랑 · 홍길동")을 타이핑하는 동안 바로 갱신 */
function updateListTitles(el) {
  const item = el.closest('.item');
  if (!item) return;
  const m = /^(.*)\.(\d+)\.[^.]+$/.exec(el.dataset.path);
  if (!m) return;
  const obj = getPath(S.config, `${m[1]}.${m[2]}`);
  const b = item.querySelector('.item__head b');
  if (!b || !obj) return;
  if ('label' in obj) b.textContent = [obj.label, obj.name].filter(Boolean).join(' · ') || '새 계좌';
  else b.textContent = obj.title || '새 안내';
}

/* ================= 버튼 ================= */

let pendingFile = null; // { action, path }

async function onClick(e) {
  const el = e.target.closest('[data-action]');
  if (!el || el.tagName === 'INPUT') {
    if (!e.target.closest('.menu')) closeMenu();
    return;
  }
  const a = el.dataset.action;
  if (a !== 'menu') closeMenu();
  const c = S.config;

  switch (a) {
    case 'open': return openPanel(el.dataset.id);
    case 'back': S.panel = null; renderSide(); if (S.mode !== 'guest') setMode('guest'); return;
    case 'reorder': S.reorder = !S.reorder; return renderSide();
    case 'show-section': commit(toggleSection(c, el.dataset.id, true), { side: 'full' }); S.bridge.focus(el.dataset.id); toast('청첩장에 보이게 했어요'); return;
    case 'sec-move': commit(moveSection(c, el.dataset.id, Number(el.dataset.d))); renderSide(); $(`.sec-item[data-id="${el.dataset.id}"] [data-d="${el.dataset.d}"]`)?.focus(); return;
    case 'mode': return setMode(el.dataset.mode);
    case 'undo': return undo(-1);
    case 'redo': return undo(1);
    case 'menu': return toggleMenu();
    case 'mood': commit({ ...c, theme: { mood: el.dataset.id, accent: null } }, { side: 'full' }); return;
    case 'accent': commit({ ...c, theme: { ...c.theme, accent: el.dataset.key } }, { side: 'full' }); return;
    case 'set': if (el.dataset.value === '') S.quota = false; commit(setPath(c, el.dataset.path, el.dataset.value), { side: 'full' }); return;
    case 'sample': {
      const s = SAMPLE_SETS[el.dataset.set][Number(el.dataset.i)];
      if (el.hasAttribute('data-append')) {
        const list = getPath(c, el.dataset.path) ?? [];
        commit(setPath(c, el.dataset.path, [...list, { photo: '', ...structuredClone(s) }]), { side: 'full' });
        toast(`"${s.title}" 안내를 추가했어요`);
      } else {
        commit(setPath(c, el.dataset.path, [...s.lines]), { side: 'full' });
      }
      return;
    }
    case 'list-add': {
      const list = getPath(c, el.dataset.path) ?? [];
      commit(setPath(c, el.dataset.path, [...list, TEMPLATES[el.dataset.template]()]), { side: 'full' });
      const items = $$('.item', $('[data-panel-body]'));
      const last = items.filter((it) => it.querySelector(`[data-path^="${el.dataset.path}.${list.length}."]`)).pop();
      last?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      last?.querySelector('input')?.focus({ preventScroll: true });
      return;
    }
    case 'list-remove': {
      const list = [...(getPath(c, el.dataset.path) ?? [])];
      list.splice(Number(el.dataset.i), 1);
      commit(setPath(c, el.dataset.path, list), { side: 'full' });
      toast('삭제했어요 · 되돌리기로 살릴 수 있어요');
      return;
    }
    case 'list-move': {
      const list = [...(getPath(c, el.dataset.path) ?? [])];
      const i = Number(el.dataset.i), j = i + Number(el.dataset.d);
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      return commit(setPath(c, el.dataset.path, list), { side: 'full' });
    }
    case 'photo-upload': return pickFile({ action: 'photo', path: el.dataset.path }, 'image/*', false);
    case 'audio-upload': return pickFile({ action: 'audio', path: el.dataset.path }, 'audio/*,.mp3,.m4a', false);
    case 'gallery-add': return pickFile({ action: 'gallery', path: 'gallery' }, 'image/*', true);
    case 'photo-pick': return pickFromGallery(el.dataset.path);
    case 'gallery-move': {
      const g = [...c.gallery];
      const i = Number(el.dataset.i), j = i + Number(el.dataset.d);
      if (j < 0 || j >= g.length) return;
      [g[i], g[j]] = [g[j], g[i]];
      return commit({ ...c, gallery: g }, { side: 'full' });
    }
    case 'gallery-cover': commit({ ...c, cover: { ...c.cover, photo: c.gallery[Number(el.dataset.i)] } }, { side: 'full' }); toast('대표 사진으로 정했어요'); return;
    case 'gallery-remove': {
      const g = [...c.gallery];
      g.splice(Number(el.dataset.i), 1);
      S.quota = false; // 공간을 비웠으니 경고를 내리고, 다음 저장 실패 때 다시 판단한다
      commit({ ...c, gallery: g }, { side: 'full' });
      toast('사진을 뺐어요 · 되돌리기로 살릴 수 있어요');
      return;
    }
    case 'export': return doExport();
    case 'import': return pickFile({ action: 'import' }, '.json,application/json', false);
    case 'load-sample': return loadSample();
    case 'reset': return doReset();
    case 'publish': return showPublish();
    case 'pick-close': return el.closest('.picker')?.remove();
    case 'pick': {
      commit(setPath(c, el.dataset.path, el.dataset.ref), { side: 'full' });
      el.closest('.picker')?.remove();
      return;
    }
    default:
  }
}

/* 메뉴 */
function toggleMenu() {
  const btn = $('[data-action="menu"]'), list = $('.menu__list');
  list.hidden = !list.hidden;
  btn.setAttribute('aria-expanded', String(!list.hidden));
}
function closeMenu() {
  const list = $('.menu__list');
  if (list && !list.hidden) { list.hidden = true; $('[data-action="menu"]').setAttribute('aria-expanded', 'false'); }
}

/* 파일 */
function pickFile(target, accept, multiple) {
  pendingFile = target;
  const input = $('[data-file]');
  input.value = '';
  input.accept = accept;
  input.multiple = multiple;
  input.click();
}

async function onFile(input) {
  const t = pendingFile;
  pendingFile = null;
  return handleFiles([...input.files], t);
}

async function handleFiles(files, t) {
  if (!files.length || !t) return;
  try {
    if (t.action === 'photo') {
      setStatus('saving');
      const ref = await addPhotoFile(files[0]);
      commit(setPath(S.config, t.path, ref), { side: 'full' });
    } else if (t.action === 'audio') {
      const out = checkAudio(files[0]);
      const id = newId();
      await S.store.putAsset({ id, ...out });
      remember(id, out.blob);
      commit(setPath(S.config, t.path, `asset:${id}`), { side: 'full' });
      if (!S.config.music.title) commit(setPath(S.config, 'music.title', files[0].name.replace(/\.[^.]+$/, '')), { record: false, side: 'full' });
      if (!S.config.sections.find((s) => s.id === 'music').enabled) commit(toggleSection(S.config, 'music', true), { record: false, side: 'full' });
    } else if (t.action === 'gallery') {
      const room = GALLERY_MAX - S.config.gallery.length;
      const take = files.slice(0, room);
      if (files.length > room) toast(`최대 ${GALLERY_MAX}장이라 ${take.length}장만 올렸어요`);
      const refs = [];
      for (const [i, f] of take.entries()) {
        setStatus('error', `사진 처리 중… ${i + 1}/${take.length}`);
        try { refs.push(await addPhotoFile(f)); } catch (err) { toast(friendly(err), 4000); if (isQuota(err)) break; }
      }
      const first = !S.config.gallery.length;
      let next = { ...S.config, gallery: [...S.config.gallery, ...refs] };
      if (first && !next.cover.photo && refs[0]) next = { ...next, cover: { ...next.cover, photo: refs[0] } };
      commit(next, { side: 'full' });
    } else if (t.action === 'import') {
      const { config, assets } = parseBackup(await files[0].text());
      for (const a of assets) { await S.store.putAsset(a); remember(a.id, a.blob); }
      S.history.record(S.config);
      S.config = config;
      S.panel = null;
      renderSide();
      refreshPreview(true);
      refreshUndo();
      await save();
      toast('백업 파일을 불러왔어요');
    }
  } catch (err) {
    toast(friendly(err), 4000);
    scheduleSave();
  }
}

function pickFromGallery(path) {
  const g = S.config.gallery;
  const html = `
    <div class="picker" role="dialog" aria-modal="true" aria-label="갤러리에서 고르기">
      <div class="picker__panel">
        <div class="picker__head"><b>갤러리에서 고르기</b><button class="ic" data-action="pick-close" aria-label="닫기">×</button></div>
        <div class="picker__grid">${g.map((ref, i) => `<button data-action="pick" data-path="${esc(path)}" data-ref="${esc(ref)}"><img src="${esc(thumb(ref))}" alt="${i + 1}번 사진"></button>`).join('')}</div>
      </div>
    </div>`;
  $('#builder').insertAdjacentHTML('beforeend', html);
}

async function doExport() {
  try {
    const text = await exportProject(S.config, S.store);
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a');
    const names = [S.config.groom.name, S.config.bride.name].filter(Boolean).join('-') || '청첩장';
    a.href = URL.createObjectURL(blob);
    a.download = `${names}-백업-${todayKst()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('백업 파일을 저장했어요');
  } catch {
    toast('백업 파일을 만들지 못했어요');
  }
}

async function loadSample() {
  if (!confirm('지금 내용을 예시 청첩장으로 바꿀까요?\n되돌리기로 다시 돌아올 수 있어요.')) return;
  const res = await fetch('../couples/sample/config.json');
  const sample = migrate(await res.json());
  S.history.record(S.config);
  S.config = { ...sample, theme: S.config.theme, assetBase: '../couples/sample/' };
  S.panel = null;
  renderSide();
  refreshPreview(true);
  refreshUndo();
  scheduleSave();
}

async function doReset() {
  if (!confirm('지금까지 만든 내용을 지우고 처음부터 다시 만들까요?\n(지우기 전에 백업 파일로 저장해 두는 걸 권해요)')) return;
  for (const id of usedAssetIds(S.config)) await S.store.deleteAsset(id).catch(() => {});
  await S.store.putProject({ id: PROJECT_ID, config: null, updatedAt: Date.now() });
  location.reload();
}

function showPublish() {
  const html = `
    <div class="picker" role="dialog" aria-modal="true" aria-label="게시하기">
      <div class="picker__panel picker__panel--msg">
        <div class="picker__head"><b>게시하기</b><button class="ic" data-action="pick-close" aria-label="닫기">×</button></div>
        <p>지금은 <b>시제품</b>이라 실제 링크를 만들지는 않아요.</p>
        <p>정식 버전에서는 이 버튼을 누르면 하객용 링크와 부모님용 링크가 함께 만들어지고, 카톡으로 바로 보낼 수 있어요.</p>
        <p class="muted-s">만든 내용은 이 브라우저에 자동 저장돼 있어요. 다른 기기로 옮기려면 메뉴 → 백업 파일로 저장.</p>
        <button class="publish publish--block" data-action="pick-close">확인</button>
      </div>
    </div>`;
  $('#builder').insertAdjacentHTML('beforeend', html);
}

/* ================= 끌어서 순서 바꾸기 (PC) ================= */

function bindDrag(app) {
  // 파일을 엉뚱한 곳에 놓아도 브라우저가 그 파일로 이동하지 않게 막는다
  const isFiles = (e) => e.dataTransfer?.types?.includes('Files');
  window.addEventListener('dragover', (e) => { if (isFiles(e)) e.preventDefault(); });
  window.addEventListener('drop', (e) => { if (isFiles(e)) e.preventDefault(); });
  let drag = null; // { kind:'sec'|'gal', id|i }
  app.addEventListener('dragstart', (e) => {
    const sec = e.target.closest('.sec-item[draggable="true"]');
    const gal = e.target.closest('.gal-item');
    if (sec) drag = { kind: 'sec', id: sec.dataset.id };
    else if (gal) drag = { kind: 'gal', i: Number(gal.dataset.i) };
    else return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    (sec ?? gal).classList.add('is-drag');
  });
  // 폴더에서 사진을 끌어다 놓기: 사진 칸이면 그 칸에, 아니면 갤러리에
  const fileTarget = (e) => {
    const box = e.target.closest('.photo:not(.photo--audio)');
    if (box) return { action: 'photo', path: box.querySelector('[data-action="photo-upload"]').dataset.path, el: box };
    const side = e.target.closest('[data-side]');
    if (side && S.panel === 'gallery') return { action: 'gallery', path: 'gallery', el: side.querySelector('.gal-grid, .drop') ?? side };
    return null;
  };
  app.addEventListener('dragover', (e) => {
    if (!drag && e.dataTransfer?.types?.includes('Files')) {
      const t = fileTarget(e);
      if (!t) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      $$('.is-over').forEach((x) => x.classList.remove('is-over'));
      t.el.classList.add('is-over');
      return;
    }
    if (!drag) return;
    const over = drag.kind === 'sec' ? e.target.closest('.sec-item[data-id]') : e.target.closest('.gal-item');
    if (!over) return;
    e.preventDefault();
    $$('.is-over').forEach((x) => x.classList.remove('is-over'));
    over.classList.add('is-over');
  });
  app.addEventListener('drop', (e) => {
    if (!drag && e.dataTransfer?.files?.length) {
      const t = fileTarget(e);
      $$('.is-over').forEach((x) => x.classList.remove('is-over'));
      if (!t) return;
      e.preventDefault();
      const imgs = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
      if (!imgs.length) return toast('사진 파일만 올릴 수 있어요');
      handleFiles(t.action === 'photo' ? imgs.slice(0, 1) : imgs, t);
      return;
    }
    if (!drag) return;
    e.preventDefault();
    if (drag.kind === 'sec') {
      const over = e.target.closest('.sec-item[data-id]');
      if (over) {
        const to = S.config.sections.findIndex((s) => s.id === over.dataset.id);
        commit(placeSection(S.config, drag.id, to));
        renderSide();
      }
    } else {
      const over = e.target.closest('.gal-item');
      if (over) {
        const g = [...S.config.gallery];
        const [x] = g.splice(drag.i, 1);
        g.splice(Number(over.dataset.i), 0, x);
        commit({ ...S.config, gallery: g }, { side: 'full' });
      }
    }
  });
  app.addEventListener('dragend', () => {
    drag = null;
    $$('.is-drag, .is-over').forEach((x) => x.classList.remove('is-drag', 'is-over'));
  });
}

/* ================= 모바일 바텀시트 ================= */

function setSheet(state) {
  S.sheet = state;
  const root = document.documentElement;
  root.style.removeProperty('--sheet-h');
  root.dataset.sheet = state;
  fitPhone();
}

const SHEET_ORDER = ['peek', 'half', 'full'];
/** 각 단계의 실제 높이(px) — CSS 변수에서 읽는다 */
function sheetHeights() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  const out = SHEET_ORDER.map((st) => {
    probe.style.height = `var(--sheet-${st})`;
    return probe.getBoundingClientRect().height;
  });
  probe.remove();
  return out;
}

// 모바일 바텀시트: 손잡이 띠·입력판 제목줄을 끌면 손가락을 따라 움직이고, 놓으면 가까운 높이(작게/반/크게)에 붙는다.
// 그냥 누르면 작게↔반 전환. 브라우저가 동작을 가로채면(pointercancel) 원래 높이로 돌아간다.
function bindSheet() {
  const side = $('[data-side]');
  const root = document.documentElement;
  setSheet(S.sheet);
  let drag = null; // { id, y0, h0, hs, moved, lastY, lastT, vY }
  let blockClickUntil = 0;
  // 끌기 직후 따라오는 클릭만 막는다(마우스는 클릭이 생기고, 터치는 안 생기므로 시간으로 판단)
  side.addEventListener('click', (ev) => {
    if (performance.now() < blockClickUntil) { ev.stopPropagation(); ev.preventDefault(); }
  }, { capture: true });

  const zone = (e) => mq.matches && e.target.closest('[data-sheet-handle], .panel__head');
  side.addEventListener('pointerdown', (e) => {
    if (!zone(e) || e.button > 0) return;
    drag = { id: e.pointerId, y0: e.clientY, h0: side.getBoundingClientRect().height, hs: sheetHeights(), moved: false, lastY: e.clientY, lastT: e.timeStamp, vY: 0, el: e.target };
    // 손가락이 위쪽 미리보기(iframe) 위로 올라가도 신호를 빼앗기지 않게: 누르는 동안 iframe 은 신호를 안 받는다
    root.classList.add('is-sheet-press');
    // 손잡이 띠는 버튼이 없으니 바로 붙잡는다(제목줄은 버튼 탭을 살리려고 움직인 뒤에 붙잡는다)
    if (e.target.closest('[data-sheet-handle]')) side.setPointerCapture(e.pointerId);
  });
  // 손가락이 편집판 밖으로 나가도 놓치지 않게 화면 전체에서 받는다
  window.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y0;
    if (!drag.moved) {
      if (Math.abs(dy) < 6) return;
      drag.moved = true;
      if (!side.hasPointerCapture(e.pointerId)) side.setPointerCapture(e.pointerId);
      root.classList.add('is-sheet-drag');
    }
    const [hp, , hf] = drag.hs;
    const h = Math.max(hp * 0.8, Math.min(hf * 1.03, drag.h0 - dy));
    root.style.setProperty('--sheet-h', `${h}px`);
    drag.vY = (e.clientY - drag.lastY) / Math.max(1, e.timeStamp - drag.lastT);
    drag.lastY = e.clientY;
    drag.lastT = e.timeStamp;
    e.preventDefault();
  }, { passive: false });
  const end = (e, cancelled) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    root.classList.remove('is-sheet-drag', 'is-sheet-press');
    if (!d.moved) {
      // 단순 탭: 손잡이 띠만 전환(제목줄의 버튼 누르기는 그대로 둔다)
      if (!cancelled && d.el.closest('[data-sheet-handle]')) setSheet(S.sheet === 'peek' ? 'half' : S.sheet === 'half' ? 'peek' : 'half');
      return;
    }
    if (cancelled) return setSheet(S.sheet);
    const hs = d.hs;
    const cur = side.getBoundingClientRect().height;
    // 놓기 직전까지 움직이고 있었을 때만 "튕김"으로 본다(멈췄다 놓으면 위치로 판단)
    const flick = Math.abs(d.vY) > 0.6 && e.timeStamp - d.lastT < 120;
    let i;
    if (flick && d.vY < 0) i = hs.findIndex((h) => h > cur + 4); // 위로 튕김 → 지금 위치보다 높은 다음 칸
    else if (flick) i = hs.map((h, k) => (h < cur - 4 ? k : -1)).filter((k) => k >= 0).pop() ?? -1; // 아래로 → 낮은 다음 칸
    else i = -1;
    if (i < 0) i = flick ? (d.vY < 0 ? 2 : 0) : hs.reduce((bi, h, k) => (Math.abs(h - cur) < Math.abs(hs[bi] - cur) ? k : bi), 0);
    setSheet(SHEET_ORDER[i]);
    blockClickUntil = performance.now() + 400;
  };
  window.addEventListener('pointerup', (e) => end(e, false));
  window.addEventListener('pointercancel', (e) => end(e, true));

  $('[data-sheet-handle]').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    setSheet(SHEET_ORDER[(SHEET_ORDER.indexOf(S.sheet) + 1) % 3]);
  });

  // 휴대폰에서 입력칸을 누르면(키보드가 올라오면) 판을 크게 펼친다
  side.addEventListener('focusin', (e) => {
    if (mq.matches && e.target.matches('input:not([type=checkbox]):not([type=file]), textarea, select') && S.sheet !== 'full') setSheet('full');
  });
}

/* ================= 미리보기 크기 ================= */

function fitPhone() {
  const stage = $('[data-stage]'), phone = $('[data-phone]');
  if (!stage || !phone) return;
  if (mq.matches) { phone.style.removeProperty('--k'); return; }
  const k = Math.min(1, (stage.clientHeight - 96) / 844, (stage.clientWidth - 48) / 400);
  phone.style.setProperty('--k', Math.max(0.5, k).toFixed(3));
}

/* ================= 키보드 ================= */

function onKey(e) {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z') {
    if (e.target.matches('input, textarea') && !e.shiftKey && S.lastEdit.path && Date.now() - S.lastEdit.at < 900) return; // 입력칸 자체 되돌리기 우선
    e.preventDefault();
    undo(e.shiftKey ? 1 : -1);
  } else if (e.key === 'Escape') {
    const p = $('.picker');
    if (p) p.remove();
    else closeMenu();
  }
}

/* ================= 토스트 ================= */

function toast(msg, ms = 2200) {
  const t = $('[data-toast]');
  if (!t) return;
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, ms);
}
