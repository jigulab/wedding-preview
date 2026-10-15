// config 스키마 v2 — 기본값·v1→v2 변환·검사·섹션 유틸. 순수 함수(브라우저·node 공용).
// 계획서: docs/plans/2026-10-14-builder-v1.md "config 스키마 v2"

import { MOODS, DEFAULT_MOOD } from '../themes.js';

export const SCHEMA_VERSION = 2;

/** 섹션 고정 목록. cover 는 맨 앞, share 는 맨 뒤 고정. */
export const SECTION_IDS = [
  'cover', 'greeting', 'parents', 'calendar', 'location', 'flower',
  'accounts', 'gallery', 'notices', 'music', 'guestbook', 'rsvp', 'share',
];
export const FIXED_FIRST = 'cover';
export const FIXED_LAST = 'share';

export const SECTION_LABELS = {
  cover: '커버', greeting: '인사말', parents: '신랑신부·혼주', calendar: '예식 일시',
  location: '오시는 길', flower: '화환 안내', accounts: '마음 전하실 곳', gallery: '갤러리',
  notices: '안내사항', music: '배경음악', guestbook: '방명록', rsvp: '참석 여부', share: '공유',
};

export const GALLERY_MAX = 20;

const clone = (o) => JSON.parse(JSON.stringify(o));
const isParentLabel = (label = '') => /아버지|어머니|아버님|어머님|혼주/.test(label);

function defaultEnabled(c, id) {
  switch (id) {
    case 'flower': return !!c.flowerNotice;
    case 'notices': return (c.notices ?? []).length > 0;
    case 'music': return !!c.music?.src;
    case 'guestbook': return !!c.guestbook?.enabled;
    case 'rsvp': return !!c.rsvp?.enabled;
    default: return true;
  }
}

/** v1(또는 일부 키가 빠진 v2) → 완전한 v2. 입력은 건드리지 않는다. 두 번 해도 같다. */
export function migrate(input) {
  const c = clone(input ?? {});
  c.theme = { mood: DEFAULT_MOOD, accent: null, ...(c.theme ?? {}) };
  if (!MOODS[c.theme.mood]) c.theme = { mood: DEFAULT_MOOD, accent: null };
  if (c.theme.accent && !MOODS[c.theme.mood].accents.some((a) => a.key === c.theme.accent)) c.theme.accent = null;
  c.venue = c.venue ?? {};
  c.venue.guide = { parking: [], meal: [], shuttle: [], ...(c.venue.guide ?? {}) };
  c.venue.routes = c.venue.routes ?? [];
  c.music = { src: '', title: '', ...(c.music ?? {}) };
  c.guestbook = { enabled: false, ...(c.guestbook ?? {}) };
  c.rsvp = { enabled: false, askMeal: true, ...(c.rsvp ?? {}) };
  c.privacy = { autoDeleteDays: 30, safeNotice: true, ...(c.privacy ?? {}) };
  c.parents = { greetingLines: [], accountsFilter: 'parentsOnly', ...(c.parents ?? {}) };
  c.memorial = { enabled: true, afterDays: 1, lines: ['저희 결혼식에 와주셔서 감사합니다.'], ...(c.memorial ?? {}) };
  c.accounts = c.accounts ?? { message: [], groomSide: [], brideSide: [] };
  for (const side of ['groomSide', 'brideSide']) {
    c.accounts[side] = (c.accounts[side] ?? []).map((a) => ({
      kakaopay: '', ...a, forParents: a.forParents ?? isParentLabel(a.label),
    }));
  }
  c.gallery = c.gallery ?? [];
  c.notices = c.notices ?? [];

  // 섹션: 기존 순서·켜짐을 살리고, 빠진 섹션은 기본 위치에 끼워 넣는다.
  const known = new Map((c.sections ?? []).filter((s) => SECTION_IDS.includes(s.id)).map((s) => [s.id, !!s.enabled]));
  let order = (c.sections ?? []).map((s) => s.id).filter((id, i, a) => SECTION_IDS.includes(id) && a.indexOf(id) === i);
  for (const id of SECTION_IDS) {
    if (order.includes(id)) continue;
    const at = SECTION_IDS.indexOf(id);
    const after = SECTION_IDS.slice(0, at).reverse().find((x) => order.includes(x));
    order.splice(after ? order.indexOf(after) + 1 : 0, 0, id);
  }
  order = [FIXED_FIRST, ...order.filter((id) => id !== FIXED_FIRST && id !== FIXED_LAST), FIXED_LAST];
  c.sections = order.map((id) => ({
    id,
    enabled: id === FIXED_FIRST || id === FIXED_LAST ? true : (known.has(id) ? known.get(id) : defaultEnabled(c, id)),
  }));

  // 줄 목록 칸은 항상 글자 배열 — 손상된 백업·옛 데이터가 글자 하나로 들고 와도 줄로 나눠 바로잡는다
  const asLines = (v) => (Array.isArray(v) ? v.map((x) => String(x ?? '')) : typeof v === 'string' ? v.split('\n') : []);
  const fix = (obj, key) => { if (obj && key in obj) obj[key] = asLines(obj[key]); };
  fix(c.greeting, 'lines'); fix(c.cover, 'script'); fix(c.accounts, 'message');
  fix(c.parents, 'greetingLines'); fix(c.memorial, 'lines');
  for (const k of ['parking', 'meal', 'shuttle']) fix(c.venue.guide, k);
  c.venue.routes = (Array.isArray(c.venue.routes) ? c.venue.routes : []).map((r) => ({ title: '', ...r, items: asLines(r?.items) }));
  c.notices = (Array.isArray(c.notices) ? c.notices : []).map((n) => ({ title: '', photo: '', ...n, lines: asLines(n?.lines) }));
  if (!Array.isArray(c.gallery)) c.gallery = [];

  c.schemaVersion = SCHEMA_VERSION;
  return c;
}

/** 섹션을 한 칸 위(-1)/아래(+1)로. cover·share 와 그 너머로는 못 간다. */
export function moveSection(c, id, delta) {
  const s = [...c.sections];
  const i = s.findIndex((x) => x.id === id);
  const j = i + delta;
  if (i < 0 || id === FIXED_FIRST || id === FIXED_LAST) return c;
  if (j <= 0 || j >= s.length - 1) return c;
  [s[i], s[j]] = [s[j], s[i]];
  return { ...c, sections: s };
}

/** 섹션 위치를 to 번째로(드래그). 고정 섹션은 무시. */
export function placeSection(c, id, to) {
  if (id === FIXED_FIRST || id === FIXED_LAST) return c;
  const s = c.sections.filter((x) => x.id !== id);
  const item = c.sections.find((x) => x.id === id);
  if (!item) return c;
  const k = Math.max(1, Math.min(s.length - 1, to));
  s.splice(k, 0, item);
  return { ...c, sections: s };
}

export function toggleSection(c, id, enabled) {
  if (id === FIXED_FIRST || id === FIXED_LAST) return c;
  return { ...c, sections: c.sections.map((x) => (x.id === id ? { ...x, enabled } : x)) };
}

export const isEnabled = (c, id) => !!c.sections?.find((s) => s.id === id)?.enabled;

/** 필수 키·형식 검사. 사진 파일 존재 여부는 호출하는 쪽(check-config)이 본다. */
export function validate(c) {
  const errors = [];
  const get = (path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), c);
  const REQUIRED = [
    'wedding.date', 'wedding.time',
    'groom.name', 'groom.role', 'groom.father.name', 'groom.mother.name',
    'bride.name', 'bride.role', 'bride.father.name', 'bride.mother.name',
    'venue.name', 'venue.address',
  ];
  for (const k of REQUIRED) {
    const v = get(k);
    if (v === undefined || v === null || v === '') errors.push(`필수 키 없음: ${k}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.wedding?.date ?? '')) errors.push(`wedding.date 형식은 YYYY-MM-DD: ${c.wedding?.date}`);
  if (!/^\d{2}:\d{2}$/.test(c.wedding?.time ?? '')) errors.push(`wedding.time 형식은 HH:MM: ${c.wedding?.time}`);
  if (c.venue?.lat != null && typeof c.venue.lat !== 'number') errors.push('venue.lat 는 숫자');
  if (c.venue?.lng != null && typeof c.venue.lng !== 'number') errors.push('venue.lng 는 숫자');
  if ((c.gallery ?? []).length > GALLERY_MAX) errors.push(`gallery 는 최대 ${GALLERY_MAX}장`);
  for (const side of ['groomSide', 'brideSide']) {
    (c.accounts?.[side] ?? []).forEach((a, i) => {
      for (const k of ['label', 'name', 'bank', 'number']) {
        if (!a[k]) errors.push(`accounts.${side}[${i}].${k} 없음`);
      }
    });
  }
  if (c.sections) {
    if (c.sections[0]?.id !== FIXED_FIRST) errors.push('sections 첫 칸은 cover');
    if (c.sections.at(-1)?.id !== FIXED_LAST) errors.push('sections 마지막 칸은 share');
  }
  return errors;
}

/** 사진 참조 목록(check-config·내보내기용) */
export function assetRefs(c) {
  return [
    c.meta?.shareImage, c.cover?.photo, c.greeting?.photo, c.venue?.mapImage, c.music?.src,
    ...(c.gallery ?? []), ...(c.notices ?? []).map((n) => n.photo),
  ].filter(Boolean);
}

/** 마법사 결과로 빈 프로젝트 만들기 */
export function createProject({ groom = '', bride = '', date = '', time = '12:00', venueName = '', venueAddress = '', photo = '' } = {}) {
  return migrate({
    id: 'draft',
    meta: { title: `${groom.slice(1) || groom}♥${bride.slice(1) || bride} 결혼합니다.`, description: '', shareImage: photo },
    wedding: { date, time },
    cover: { photo, script: ['Happy', 'Wedding', 'Day'], tagline: 'WE’RE MARRIED' },
    greeting: {
      eyebrow: 'our wedding day',
      title: '소중한 분들을 초대합니다.',
      lines: ['서로가 마주보며 다져온 사랑을', '이제 함께 한 곳을 바라보며', '걸어가고자 합니다.', '저희의 첫걸음에 함께해 주세요.'],
      photo: '',
    },
    groom: { name: groom, nameEn: '', role: '아들', phone: '', father: { name: '', phone: '' }, mother: { name: '', phone: '' } },
    bride: { name: bride, nameEn: '', role: '딸', phone: '', father: { name: '', phone: '' }, mother: { name: '', phone: '' } },
    venue: { name: venueName, hall: '', address: venueAddress, tel: '', lat: null, lng: null, kakaoPlaceId: '', mapImage: '', routes: [] },
    flowerNotice: '',
    accounts: { message: ['전해주시는 축하의 마음은 소중하게 간직하여', '좋은 부부의 모습으로 보답하겠습니다.'], groomSide: [], brideSide: [] },
    gallery: photo ? [photo] : [],
    notices: [],
  });
}
