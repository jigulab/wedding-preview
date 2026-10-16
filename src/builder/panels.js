// 편집 패널 정의표 + 폼 HTML 생성. 이벤트 처리는 editor.js 가 data-path / data-action 으로 위임받는다.
import { getPath } from '../lib/path.js';
import { MOODS } from '../themes.js';
import { GREETINGS, PARENT_GREETINGS, NOTICES, FLOWER, ROLES_GROOM, ROLES_BRIDE, BANKS } from '../lib/samples.js';
import { GALLERY_MAX } from '../lib/schema.js';
import { esc } from '../render.js';

export const SAMPLE_SETS = { greetings: GREETINGS, parentGreetings: PARENT_GREETINGS, notices: NOTICES };

/** 리스트 항목 새로 만들 때 기본값 */
export const TEMPLATES = {
  account: () => ({ label: '', name: '', bank: '', number: '', kakaopay: '', forParents: false }),
  route: () => ({ title: '', items: [] }),
  notice: () => ({ title: '', photo: '', lines: [] }),
};

const ICONS = {
  design: 'M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-.9-.6-1.4-.6-2.2 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3zM7.5 12a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z',
  cover: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4',
  greeting: 'M5 6h14M5 10h14M5 14h9M5 18h6',
  parents: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3 2.5-5 5-5s5 2 5 5M11 20c0-3 2.5-5 5-5s5 2 5 5',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  location: 'M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  flower: 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 13v8M12 7V3M9 10H5M19 10h-4',
  accounts: 'M3 7h18v12H3zM3 11h18M7 15h4',
  gallery: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  notices: 'M12 8v5M12 16h.01M4 20h16L12 4z',
  music: 'M9 18V6l11-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  guestbook: 'M5 4h11l3 3v13H5zM9 9h6M9 13h6M9 17h3',
  rsvp: 'M4 12l5 5L20 6',
  share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  safety: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',
  parentsMode: 'M12 5v14M5 12h14',
  memorial: 'M12 21C7 17 3 13.5 3 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 9 2.5c0 4-4 7.5-9 11.5z',
};
export const icon = (id) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[id] ?? ICONS.greeting}"/></svg>`;

/* ---------- 패널 정의 ---------- */
// 필드 type: text · lines · date · time · bool · number · select · photo · gallery · list · samples · note · mood · accent · audio · group · advanced
export const PANELS = {
  design: {
    title: '디자인',
    desc: '디자인을 바꿔도 써 둔 글과 사진은 그대로예요.',
    fields: [{ type: 'mood' }, { type: 'accent' }],
  },
  cover: {
    title: '커버',
    desc: '청첩장을 열면 가장 먼저 보이는 화면이에요.',
    fields: [
      { type: 'photo', path: 'cover.photo', label: '대표 사진', hint: '세로 사진이 잘 어울려요.' },
      { type: 'group', label: '영문 이름', hint: '이니셜 문양·잡지 커버에 쓰여요.', fields: [
        { type: 'text', path: 'groom.nameEn', label: '신랑', placeholder: 'Gildong', maxlength: 20, half: true },
        { type: 'text', path: 'bride.nameEn', label: '신부', placeholder: 'Haneul', maxlength: 20, half: true },
      ] },
      { type: 'lines', path: 'cover.script', label: '필기체 문구', hint: '로맨틱 와인 디자인에서 사진 위에 올라가요. 한 줄에 한 단어.', rows: 3, moods: ['romantic'] },
      { type: 'text', path: 'cover.tagline', label: '위쪽 문구', placeholder: 'WE’RE MARRIED', maxlength: 24, moods: ['romantic'] },
    ],
  },
  greeting: {
    title: '인사말',
    fields: [
      { type: 'text', path: 'greeting.title', label: '제목', placeholder: '소중한 분들을 초대합니다.', maxlength: 40 },
      { type: 'samples', set: 'greetings', path: 'greeting.lines', label: '예문에서 고르기' },
      { type: 'lines', path: 'greeting.lines', label: '본문', hint: '줄을 바꾸면 청첩장에서도 그 자리에서 바뀌어요.', rows: 6 },
      { type: 'photo', path: 'greeting.photo', label: '사진 (선택)' },
    ],
  },
  parents: {
    title: '신랑신부·혼주',
    desc: '연락처는 "축하 연락하기" 버튼 안에만 보여요.',
    fields: [
      { type: 'group', label: '신랑', fields: [
        { type: 'text', path: 'groom.name', label: '이름', placeholder: '홍길동', maxlength: 10, half: true },
        { type: 'select', path: 'groom.role', label: '관계', options: ROLES_GROOM, half: true },
        { type: 'text', path: 'groom.phone', label: '연락처', placeholder: '010-0000-0000', inputmode: 'tel' },
        { type: 'text', path: 'groom.father.name', label: '아버지', half: true },
        { type: 'text', path: 'groom.father.phone', label: '연락처', inputmode: 'tel', half: true },
        { type: 'bool', path: 'groom.father.deceased', label: '故 표기' },
        { type: 'text', path: 'groom.mother.name', label: '어머니', half: true },
        { type: 'text', path: 'groom.mother.phone', label: '연락처', inputmode: 'tel', half: true },
        { type: 'bool', path: 'groom.mother.deceased', label: '故 표기' },
      ] },
      { type: 'group', label: '신부', fields: [
        { type: 'text', path: 'bride.name', label: '이름', placeholder: '김하늘', maxlength: 10, half: true },
        { type: 'select', path: 'bride.role', label: '관계', options: ROLES_BRIDE, half: true },
        { type: 'text', path: 'bride.phone', label: '연락처', placeholder: '010-0000-0000', inputmode: 'tel' },
        { type: 'text', path: 'bride.father.name', label: '아버지', half: true },
        { type: 'text', path: 'bride.father.phone', label: '연락처', inputmode: 'tel', half: true },
        { type: 'bool', path: 'bride.father.deceased', label: '故 표기' },
        { type: 'text', path: 'bride.mother.name', label: '어머니', half: true },
        { type: 'text', path: 'bride.mother.phone', label: '연락처', inputmode: 'tel', half: true },
        { type: 'bool', path: 'bride.mother.deceased', label: '故 표기' },
      ] },
    ],
  },
  calendar: {
    title: '예식 일시',
    fields: [
      { type: 'date', path: 'wedding.date', label: '날짜', half: true },
      { type: 'time', path: 'wedding.time', label: '시간', half: true },
      { type: 'note', text: '달력과 D-day는 날짜에 맞춰 자동으로 만들어져요.' },
    ],
  },
  location: {
    title: '오시는 길',
    desc: '주차·식사 정보를 미리 적어 두면 예식 전날 문의 전화가 줄어요.',
    fields: [
      { type: 'text', path: 'venue.name', label: '예식장', placeholder: '예시웨딩홀', half: true },
      { type: 'text', path: 'venue.hall', label: '홀', placeholder: '3층 그랜드홀', half: true },
      { type: 'text', path: 'venue.address', label: '주소', placeholder: '서울 중구 세종대로 110' },
      { type: 'text', path: 'venue.tel', label: '예식장 전화', inputmode: 'tel', placeholder: '053-000-0000' },
      { type: 'photo', path: 'venue.mapImage', label: '약도 이미지 (선택)' },
      { type: 'lines', path: 'venue.guide.parking', label: '주차 안내', hint: '예) 지하 주차장 2시간 무료 · 한 줄에 하나', rows: 2 },
      { type: 'lines', path: 'venue.guide.meal', label: '식사 안내', hint: '예) 예식 후 2층 연회장 뷔페', rows: 2 },
      { type: 'lines', path: 'venue.guide.shuttle', label: '셔틀버스', hint: '없으면 비워 두세요.', rows: 2 },
      { type: 'list', path: 'venue.routes', label: '교통 안내', template: 'route', itemTitle: (r) => r.title || '새 안내', addLabel: '교통 안내 추가', fields: [
        { type: 'text', path: 'title', label: '제목', placeholder: '지하철' },
        { type: 'lines', path: 'items', label: '내용', rows: 2 },
      ] },
      { type: 'advanced', label: '지도 위치 직접 지정', fields: [
        { type: 'text', path: 'venue.kakaoPlaceId', label: '카카오맵 장소 번호', hint: '카카오맵 장소 주소 끝 숫자. 있으면 길찾기가 가장 정확해요.', inputmode: 'numeric' },
        { type: 'number', path: 'venue.lat', label: '위도', step: 'any', half: true },
        { type: 'number', path: 'venue.lng', label: '경도', step: 'any', half: true },
      ] },
    ],
  },
  flower: {
    title: '화환 안내',
    fields: [
      { type: 'chips', path: 'flowerNotice', label: '자주 쓰는 문구', options: FLOWER },
      { type: 'text', path: 'flowerNotice', label: '문구', maxlength: 60 },
    ],
  },
  accounts: {
    title: '마음 전하실 곳',
    desc: '계좌는 청첩장에서 기본으로 접혀 있어요. 부모님용 버전에 보일 계좌는 따로 고를 수 있어요.',
    fields: [
      { type: 'lines', path: 'accounts.message', label: '안내 문구', rows: 2 },
      { type: 'list', path: 'accounts.groomSide', label: '신랑측 계좌', template: 'account', itemTitle: (a) => [a.label, a.name].filter(Boolean).join(' · ') || '새 계좌', addLabel: '신랑측 계좌 추가', fields: ACCOUNT_FIELDS() },
      { type: 'list', path: 'accounts.brideSide', label: '신부측 계좌', template: 'account', itemTitle: (a) => [a.label, a.name].filter(Boolean).join(' · ') || '새 계좌', addLabel: '신부측 계좌 추가', fields: ACCOUNT_FIELDS() },
    ],
  },
  gallery: {
    title: '갤러리',
    desc: `사진은 자동으로 가볍게 줄여서 저장해요. 최대 ${GALLERY_MAX}장.`,
    fields: [{ type: 'gallery', path: 'gallery' }],
  },
  notices: {
    title: '안내사항',
    fields: [
      { type: 'samples', set: 'notices', path: 'notices', label: '예문 추가', append: true },
      { type: 'list', path: 'notices', label: '안내 탭', template: 'notice', itemTitle: (n) => n.title || '새 안내', addLabel: '안내 추가', fields: [
        { type: 'text', path: 'title', label: '탭 제목', maxlength: 12 },
        { type: 'lines', path: 'lines', label: '내용', rows: 3 },
        { type: 'photo', path: 'photo', label: '사진 (선택)' },
      ] },
    ],
  },
  music: {
    title: '배경음악',
    desc: '하객이 직접 눌러야 재생돼요. 접속하자마자 소리가 나지 않아요.',
    fields: [
      { type: 'audio', path: 'music.src', label: '음악 파일 (mp3·m4a)' },
      { type: 'text', path: 'music.title', label: '곡 제목 (선택)', maxlength: 40 },
      { type: 'note', text: '저작권이 있는 음악은 직접 권리를 확인해 주세요.' },
    ],
  },
  guestbook: {
    title: '방명록',
    fields: [{ type: 'note', text: '하객이 이름과 축하 메시지를 남겨요. 비밀번호는 받지 않아요. (시제품에서는 저장되지 않아요)' }],
  },
  rsvp: {
    title: '참석 여부',
    fields: [
      { type: 'bool', path: 'rsvp.askMeal', label: '식사 여부도 묻기' },
      { type: 'note', text: '참석 인원과 식사 인원을 미리 알 수 있어요. (시제품에서는 저장되지 않아요)' },
    ],
  },
  share: {
    title: '공유·안심',
    desc: '카톡으로 보낼 때 보이는 모습과, 하객을 안심시키는 장치예요.',
    fields: [
      { type: 'text', path: 'meta.title', label: '카톡 제목', placeholder: '길동♥하늘 결혼합니다.', maxlength: 40 },
      { type: 'text', path: 'meta.description', label: '카톡 설명', placeholder: '5월 1일(토) 오후 12시 · 예시웨딩홀', maxlength: 60 },
      { type: 'photo', path: 'meta.shareImage', label: '카톡 미리보기 사진', hint: '비워 두면 대표 사진을 써요.' },
      { type: 'note', text: '청첩장 사칭 문자가 많아요. 제목·설명에 두 사람 이름과 날짜·장소를 꼭 넣으면 하객이 안심하고 열어요.' },
      { type: 'group', label: '안심 설정', fields: [
        { type: 'bool', path: 'privacy.safeNotice', label: '청첩장 맨 아래에 안심 문구 보이기' },
        { type: 'note', text: '자동 삭제는 정식 버전(게시 기능)부터 실제로 동작해요. 미리보기는 그때의 모습이에요.' },
        { type: 'select', path: 'privacy.autoDeleteDays', label: '예식 후 계좌·연락처 자동 삭제', options: [{ v: 7, t: '7일 후' }, { v: 30, t: '30일 후' }, { v: 90, t: '90일 후' }, { v: 0, t: '삭제 안 함' }], number: true },
      ] },
    ],
  },
  parentsMode: {
    title: '부모님용 버전',
    desc: '부모님 지인께 보낼 청첩장이에요. 글씨가 크고, 혼주 이름이 먼저 나오고, 음악이 빠져요.',
    fields: [
      { type: 'samples', set: 'parentGreetings', path: 'parents.greetingLines', label: '혼주 인사말 예문' },
      { type: 'lines', path: 'parents.greetingLines', label: '혼주 인사말', hint: '비워 두면 원래 인사말을 써요.', rows: 5 },
      { type: 'select', path: 'parents.accountsFilter', label: '보여줄 계좌', options: [{ v: 'parentsOnly', t: '"부모님용"으로 체크한 계좌만' }, { v: 'all', t: '모든 계좌' }] },
      { type: 'note', text: '위쪽 "부모님" 보기로 바로 확인할 수 있어요.' },
    ],
  },
  memorial: {
    title: '예식 후 기념 페이지',
    desc: '예식이 끝나면 같은 주소가 감사 인사 페이지로 바뀌어요. 계좌·연락처는 숨겨져요.',
    fields: [
      { type: 'bool', path: 'memorial.enabled', label: '예식 후 기념 페이지로 바꾸기' },
      { type: 'number', path: 'memorial.afterDays', label: '예식 며칠 후부터', min: 1, max: 30 },
      { type: 'lines', path: 'memorial.lines', label: '감사 인사', rows: 3 },
      { type: 'note', text: '위쪽 "예식 후" 보기로 바로 확인할 수 있어요.' },
    ],
  },
};

function ACCOUNT_FIELDS() {
  return [
    { type: 'text', path: 'label', label: '구분', placeholder: '신랑 / 신랑 아버지', half: true, list: 'acc-labels' },
    { type: 'text', path: 'name', label: '예금주', half: true },
    { type: 'text', path: 'bank', label: '은행', list: 'banks', half: true },
    { type: 'text', path: 'number', label: '계좌번호', inputmode: 'numeric', half: true },
    { type: 'text', path: 'kakaopay', label: '카카오페이 송금 링크 (선택)', placeholder: 'https://qr.kakaopay.com/...', inputmode: 'url', hint: 'https:// 로 시작하는 링크만 버튼으로 보여요.' },
    { type: 'bool', path: 'forParents', label: '부모님용 버전에 보이기' },
  ];
}

/** 왼쪽 목록의 설정 묶음(섹션이 아닌 패널) */
export const SETTINGS = ['share', 'parentsMode', 'memorial'];

/* ---------- 폼 HTML ---------- */

const attrs = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== false).map(([k, v]) => (v === true ? k : `${k}="${esc(v)}"`)).join(' ');
let uid = 0;
const fid = () => `f${++uid}`;

/**
 * 패널 하나를 HTML 로.
 * h: { thumb(ref) → url|'' , mood }
 */
export function renderPanel(id, config, h) {
  const p = PANELS[id];
  if (!p) return '';
  return `
    ${p.desc ? `<p class="panel__desc">${esc(p.desc)}</p>` : ''}
    <div class="fields">${p.fields.map((f) => field(f, config, '', h)).join('')}</div>`;
}

function field(f, c, prefix, h) {
  if (f.moods && !f.moods.includes(h.mood)) return '';
  const path = f.path ? prefix + f.path : '';
  const val = path ? getPath(c, path) : undefined;
  const id = fid();
  const label = f.label ? `<label class="f__label" for="${id}">${esc(f.label)}</label>` : '';
  const hint = f.hint ? `<p class="f__hint">${esc(f.hint)}</p>` : '';
  const wrap = (inner, cls = '') => `<div class="f ${f.half ? 'f--half' : ''} ${cls}">${label}${inner}${hint}</div>`;

  switch (f.type) {
    case 'text':
      return wrap(`<input id="${id}" class="input" ${attrs({ type: 'text', 'data-path': path, 'data-kind': 'text', value: val ?? '', placeholder: f.placeholder, maxlength: f.maxlength, inputmode: f.inputmode, list: f.list, autocomplete: 'off' })}>`);
    case 'number':
      return wrap(`<input id="${id}" class="input" ${attrs({ type: 'number', 'data-path': path, 'data-kind': 'number', value: val ?? '', min: f.min, max: f.max, step: f.step ?? 1, inputmode: 'decimal' })}>`);
    case 'date':
      return wrap(`<input id="${id}" class="input" type="date" data-path="${esc(path)}" data-kind="text" value="${esc(val ?? '')}">`);
    case 'time':
      return wrap(`<input id="${id}" class="input" type="time" step="300" data-path="${esc(path)}" data-kind="text" value="${esc(val ?? '')}">`);
    case 'lines':
      return wrap(`<textarea id="${id}" class="input input--area" rows="${f.rows ?? 3}" data-path="${esc(path)}" data-kind="lines">${esc((val ?? []).join('\n'))}</textarea>`);
    case 'select': {
      const opts = f.options.map((o) => (typeof o === 'object' ? o : { v: o, t: o }));
      const cur = val ?? opts[0]?.v;
      return wrap(`<div class="select"><select id="${id}" class="input" data-path="${esc(path)}" data-kind="${f.number ? 'number' : 'text'}">
        ${opts.map((o) => `<option value="${esc(o.v)}" ${String(o.v) === String(cur) ? 'selected' : ''}>${esc(o.t)}</option>`).join('')}
      </select></div>`);
    }
    case 'bool':
      return `<label class="f f--switch"><span>${esc(f.label)}</span><input type="checkbox" class="switch" data-path="${esc(path)}" data-kind="bool" ${val ? 'checked' : ''}></label>`;
    case 'note':
      return `<p class="f__note">${esc(f.text)}</p>`;
    case 'group':
      return `<fieldset class="group"><legend>${esc(f.label)}</legend>${f.hint ? `<p class="f__hint">${esc(f.hint)}</p>` : ''}<div class="fields">${f.fields.map((x) => field(x, c, prefix, h)).join('')}</div></fieldset>`;
    case 'advanced':
      return `<details class="adv"><summary>${esc(f.label)}</summary><div class="fields">${f.fields.map((x) => field(x, c, prefix, h)).join('')}</div></details>`;
    case 'chips':
      return `<div class="f"><span class="f__label">${esc(f.label)}</span><div class="chips">${f.options.map((o) => `<button type="button" class="chip-btn ${val === o ? 'is-on' : ''}" data-action="set" data-path="${esc(path)}" data-value="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>`;
    case 'samples': {
      const set = SAMPLE_SETS[f.set];
      return `<div class="f"><span class="f__label">${esc(f.label)}</span><div class="chips">${set.map((s, i) => `<button type="button" class="chip-btn" data-action="sample" data-set="${esc(f.set)}" data-i="${i}" data-path="${esc(path)}" ${f.append ? 'data-append' : ''}>${esc(s.name ?? s.title)}</button>`).join('')}</div></div>`;
    }
    case 'photo': {
      const url = val ? h.thumb(val) : '';
      return `<div class="f"><span class="f__label">${esc(f.label)}</span>
        <div class="photo ${url ? 'has' : ''}">
          ${url ? `<img src="${esc(url)}" alt="">` : '<span class="photo__empty">사진 없음</span>'}
          <div class="photo__acts">
            <button type="button" class="btn-s" data-action="photo-upload" data-path="${esc(path)}">${url ? '바꾸기' : '사진 올리기'}</button>
            ${h.galleryCount ? `<button type="button" class="btn-s btn-s--ghost" data-action="photo-pick" data-path="${esc(path)}">갤러리에서 고르기</button>` : ''}
            ${url ? `<button type="button" class="btn-s btn-s--ghost" data-action="set" data-path="${esc(path)}" data-value="">빼기</button>` : ''}
          </div>
        </div>${hint}</div>`;
    }
    case 'audio': {
      const has = !!val;
      return `<div class="f"><span class="f__label">${esc(f.label)}</span>
        <div class="photo photo--audio ${has ? 'has' : ''}">
          <span class="photo__empty">${has ? '음악이 들어 있어요' : '음악 없음'}</span>
          <div class="photo__acts">
            <button type="button" class="btn-s" data-action="audio-upload" data-path="${esc(path)}">${has ? '바꾸기' : '파일 올리기'}</button>
            ${has ? `<button type="button" class="btn-s btn-s--ghost" data-action="set" data-path="${esc(path)}" data-value="">빼기</button>` : ''}
          </div>
        </div></div>`;
    }
    case 'gallery': {
      const list = val ?? [];
      const cover = c.cover?.photo;
      return `<div class="f">
        <div class="gal-head"><span class="f__label">사진 ${list.length} / ${GALLERY_MAX}</span>
          <button type="button" class="btn-s" data-action="gallery-add" ${list.length >= GALLERY_MAX ? 'disabled' : ''}>사진 추가</button></div>
        ${list.length ? `<ol class="gal-grid" data-gallery>${list.map((ref, i) => `
          <li class="gal-item" draggable="true" data-i="${i}">
            <img src="${esc(h.thumb(ref))}" alt="${i + 1}번 사진" draggable="false">
            <span class="gal-item__no">${i + 1}</span>
            ${ref === cover ? '<span class="gal-item__badge">대표</span>' : ''}
            <div class="gal-item__acts">
              <button type="button" data-action="gallery-move" data-i="${i}" data-d="-1" aria-label="앞으로" ${i === 0 ? 'disabled' : ''}>‹</button>
              <button type="button" data-action="gallery-cover" data-i="${i}" aria-label="대표 사진으로">★</button>
              <button type="button" data-action="gallery-remove" data-i="${i}" aria-label="삭제">×</button>
              <button type="button" data-action="gallery-move" data-i="${i}" data-d="1" aria-label="뒤로" ${i === list.length - 1 ? 'disabled' : ''}>›</button>
            </div>
          </li>`).join('')}</ol>
          <p class="f__hint">끌어서 순서를 바꾸거나 ‹ › 버튼을 눌러요. ★는 대표 사진.</p>` : '<button type="button" class="drop" data-action="gallery-add">여기를 눌러 사진을 여러 장 한 번에 올려요</button>'}
      </div>`;
    }
    case 'list': {
      const list = val ?? [];
      return `<fieldset class="group"><legend>${esc(f.label)}</legend>
        ${list.map((item, i) => `
          <div class="item">
            <div class="item__head"><b>${esc(f.itemTitle(item))}</b>
              <span class="item__acts">
                <button type="button" data-action="list-move" data-path="${esc(path)}" data-i="${i}" data-d="-1" aria-label="위로" ${i === 0 ? 'disabled' : ''}>↑</button>
                <button type="button" data-action="list-move" data-path="${esc(path)}" data-i="${i}" data-d="1" aria-label="아래로" ${i === list.length - 1 ? 'disabled' : ''}>↓</button>
                <button type="button" data-action="list-remove" data-path="${esc(path)}" data-i="${i}" aria-label="삭제">삭제</button>
              </span></div>
            <div class="fields">${f.fields.map((x) => field(x, c, `${path}.${i}.`, h)).join('')}</div>
          </div>`).join('')}
        <button type="button" class="btn-add" data-action="list-add" data-path="${esc(path)}" data-template="${esc(f.template)}">+ ${esc(f.addLabel)}</button>
      </fieldset>`;
    }
    case 'mood':
      return `<div class="f"><span class="f__label">디자인</span><div class="moods">${Object.entries(MOODS).map(([mid, m]) => `
        <button type="button" class="mood ${mid === h.mood ? 'is-on' : ''}" data-action="mood" data-id="${mid}" aria-pressed="${mid === h.mood}">
          <span class="mood__sw"><img src="../src/assets/moods/${mid}.jpg" alt="" loading="lazy">${m.photoless ? '<em>사진 없어도 OK</em>' : ''}</span><b>${esc(m.name)}</b><small>${esc(m.desc)}</small>
        </button>`).join('')}</div></div>`;
    case 'accent': {
      const m = MOODS[h.mood];
      const cur = c.theme?.accent ?? m.accents[0].key;
      return `<div class="f"><span class="f__label">포인트 색</span><div class="swatches">${m.accents.map((a) => `
        <button type="button" class="sw ${a.key === cur ? 'is-on' : ''}" data-action="accent" data-key="${a.key}" style="--c:${a.hex}" aria-pressed="${a.key === cur}"><i></i>${esc(a.name)}</button>`).join('')}</div>
        <p class="f__hint">어떤 색을 골라도 글씨가 잘 읽히는 색만 모았어요.</p></div>`;
    }
    default:
      return '';
  }
}

export const DATALISTS = `
  <datalist id="banks">${BANKS.map((b) => `<option value="${esc(b)}">`).join('')}</datalist>
  <datalist id="acc-labels">${['신랑', '신랑 아버지', '신랑 어머니', '신부', '신부 아버지', '신부 어머니'].map((b) => `<option value="${esc(b)}">`).join('')}</datalist>`;
