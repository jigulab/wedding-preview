// 하객 페이지 로더 — couples/<id>/config.json 을 읽어 v2 로 맞추고 렌더러에 넘긴다.
// ?c=<id> 커플 선택(기본 sample) · ?mood= 디자인 시안 비교 · ?v=parents 부모님용 · ?today=YYYY-MM-DD 날짜 흉내(점검용)
import { todayKst } from './lib/date.js';
import { migrate } from './lib/schema.js';
import { applyTheme } from './themes.js';
import { renderInvitation, bindInvitation, pickMode, esc } from './render.js';

const params = new URLSearchParams(location.search);
const id = params.get('c') || 'sample';
const base = `couples/${id}/`;
const PLACEHOLDER = 'src/assets/placeholder.svg';

async function load() {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('잘못된 청첩장 주소입니다.');
  const res = await fetch(`${base}config.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error('청첩장을 찾을 수 없습니다.');
  return migrate(await res.json());
}

function setMeta(c) {
  document.title = c.meta?.title || '모바일 청첩장';
  const set = (p, v) => { const m = document.querySelector(`meta[property="${p}"]`); if (m) m.content = v; };
  set('og:title', c.meta?.title ?? '');
  set('og:description', c.meta?.description ?? '');
  if (c.meta?.shareImage) set('og:image', new URL(base + c.meta.shareImage, location.href).href);
}

load()
  .then((c) => {
    setMeta(c);
    const mood = params.get('mood');
    if (mood) c.theme = { ...c.theme, mood, accent: null };
    applyTheme(c.theme);
    const today = /^\d{4}-\d{2}-\d{2}$/.test(params.get('today') ?? '') ? params.get('today') : todayKst();
    const mode = pickMode(c, today, params.get('v'));
    const app = document.getElementById('app');
    app.innerHTML = renderInvitation(c, {
      mode,
      today,
      ua: navigator.userAgent,
      resolveAsset: (ref) => (ref && !ref.startsWith('asset:') ? base + ref : PLACEHOLDER),
    });
    bindInvitation(app, c);
  })
  .catch((err) => {
    document.getElementById('app').innerHTML = `<p class="error">${esc(err.message)}</p>`;
  });
