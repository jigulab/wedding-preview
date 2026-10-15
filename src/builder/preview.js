// 미리보기 iframe 쪽. 부모(편집기)가 보낸 config 를 렌더러로 그린다.
// 프로토콜(정본 = bridge.js 주석): 부모→ asset·render·focus / iframe→ ready·section-click
// ?dev=1 이면 sample 을 직접 읽어 혼자 돈다(점검용).
import { migrate } from '../lib/schema.js';
import { todayKst } from '../lib/date.js';
import { applyTheme } from '../themes.js';
import { renderInvitation, bindInvitation } from '../render.js';

const app = document.getElementById('app');
const urls = new Map(); // asset id → objectURL
const PLACEHOLDER = '../src/assets/placeholder.svg';
let dispose = null;
let last = null;

let assetBase = '../couples/sample/';
const resolveAsset = (ref) => {
  if (!ref) return PLACEHOLDER;
  if (ref.startsWith('asset:')) return urls.get(ref.slice(6)) ?? PLACEHOLDER;
  if (/^(https?:|data:|blob:)/.test(ref)) return ref;
  return `${assetBase}${ref}`;
};

function render({ config, mode = 'guest', today = todayKst() }) {
  const c = migrate(config);
  // 상대 경로 사진의 기준 폴더: 같은 출처의 couples/<id>/ 만 허용
  assetBase = /^\.\.\/couples\/[A-Za-z0-9_-]+\/$/.test(c.assetBase ?? '') ? c.assetBase : '../couples/sample/';
  last = { config: c, mode, today };
  const y = window.scrollY;
  dispose?.();
  dispose = null;
  applyTheme(c.theme);
  try {
    app.innerHTML = renderInvitation(c, { mode, today, resolveAsset, ua: navigator.userAgent, privacyEnforced: true });
  } catch (err) {
    // 그리기에 실패해도 미리보기가 굳지 않게 — 다음 입력 때 다시 그린다
    console.error(err);
    app.innerHTML = '<p class="error">미리보기를 그리지 못했어요. 방금 고친 칸을 확인하거나 되돌리기를 눌러 주세요.</p>';
    return;
  }
  dispose = bindInvitation(app, c, {
    noReveal: true,
    shareUrl: 'https://example.com/미리보기',
    demoNote: '미리보기에서는 저장되지 않습니다.',
    onSectionClick: (id) => post({ type: 'section-click', id }),
  });
  window.scrollTo(0, y);
}

function focus(id) {
  app.querySelectorAll('.is-focus').forEach((el) => el.classList.remove('is-focus'));
  const el = app.querySelector(`[data-section="${CSS.escape(id)}"]`);
  if (!el) return;
  el.classList.add('is-focus');
  // scrollIntoView 는 부모(편집기) 화면까지 움직이므로 이 문서 안에서만 스크롤한다
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' });
}

// 미리보기 위에 파일을 놓아도 이 창이 파일로 바뀌지 않게
['dragover', 'drop'].forEach((ev) => window.addEventListener(ev, (e) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault(); }));

const post = (msg) => parent !== window && parent.postMessage(msg, location.origin);

window.addEventListener('message', (e) => {
  if (e.origin !== location.origin || e.source !== parent) return;
  const m = e.data ?? {};
  if (m.type === 'asset' && m.id && m.blob instanceof Blob) {
    if (urls.has(m.id)) URL.revokeObjectURL(urls.get(m.id));
    urls.set(m.id, URL.createObjectURL(m.blob));
    if (last) render(last);
  } else if (m.type === 'asset-remove' && urls.has(m.id)) {
    URL.revokeObjectURL(urls.get(m.id));
    urls.delete(m.id);
  } else if (m.type === 'render' && m.config) {
    render(m);
  } else if (m.type === 'focus' && m.id) {
    focus(m.id);
  }
});

if (new URLSearchParams(location.search).has('dev')) {
  fetch('../couples/sample/config.json').then((r) => r.json()).then((config) => render({ config }));
} else {
  document.documentElement.dataset.editing = '';
  post({ type: 'ready' });
}
