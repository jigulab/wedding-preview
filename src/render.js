// 청첩장 렌더러 — config(v2) 를 받아 HTML 문자열을 만들고(renderInvitation), 동작을 붙인다(bindInvitation).
// 하객 페이지(src/app.js)와 편집기 미리보기(builder/preview.html)가 같은 코드를 쓴다.
// renderInvitation 은 document 를 건드리지 않는다(node 테스트 가능). 커플 고유값은 전부 config 에서만 온다(CLAUDE.md R-1).
import { dday, calendarGrid, formatDate, formatTime, WEEK_KO } from './lib/date.js';
import { MOODS, DEFAULT_MOOD } from './themes.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const lines = (arr) => (arr ?? []).filter((l) => l !== undefined).map((l) => `<p>${esc(l)}</p>`).join('');
const firstName = (full = '') => (full.length >= 3 ? full.slice(1) : full);
const enName = (p) => p.nameEn || firstName(p.name);
const initial = (p) => (p.nameEn ? p.nameEn[0].toUpperCase() : (firstName(p.name)[0] ?? ''));
/** 받침에 따라 와/과 */
const wa = (word = '') => {
  const ch = word.charCodeAt(word.length - 1) - 0xac00;
  return ch >= 0 && ch <= 11171 && ch % 28 ? '과' : '와';
};
/** 외부 링크는 http(s)만 — javascript: 같은 주소가 href 로 들어가지 않게 */
export const safeUrl = (u) => (/^https?:\/\//i.test(String(u ?? '').trim()) ? String(u).trim() : '');
const has = (arr) => Array.isArray(arr) && arr.some((x) => String(x ?? '').trim());

const ICON = {
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  sms: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
  car: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16h14v-4l-2-5H7l-2 5zM7 19v-3M17 19v-3M5 12h14"/></svg>',
  meal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v18M4 3v5a3 3 0 0 0 6 0V3M17 3c-2 2-3 5-3 8h3v10"/></svg>',
  bus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v12H5zM5 11h14M8 19v-3M16 19v-3"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
};

/* =============== 모드 =============== */

/** 하객 페이지가 쓸 모드 판정. 편집기 미리보기는 모드를 직접 지정한다. */
export function pickMode(c, today, requested) {
  if (requested === 'parents' || requested === 'memorial' || requested === 'guest') return requested;
  if (c.memorial?.enabled && c.wedding?.date && dday(today, c.wedding.date) <= -(c.memorial.afterDays ?? 1)) return 'memorial';
  return 'guest';
}

/* =============== 섹션 =============== */

function cover(c, ctx) {
  const type = MOODS[c.theme?.mood]?.cover ?? MOODS[DEFAULT_MOOD].cover;
  const d = c.wedding.date ? formatDate(c.wedding.date) : null;
  const t = c.wedding.time ? formatTime(c.wedding.time) : null;
  const [, mm = '', dd = ''] = (c.wedding.date ?? '').split('-');
  const photo = `<img class="cover__photo" src="${esc(ctx.asset(c.cover?.photo, 'cover'))}" alt="${esc(c.groom.name)}${wa(c.groom.name)} ${esc(c.bride.name)}의 웨딩 사진" fetchpriority="high">`;
  const place = `${esc(c.venue.name)} ${esc(c.venue.hall ?? '')}`.trim();
  const whenKo = d ? `${esc(d.ko)} ${esc(t?.ko ?? '')}` : '';

  if (type === 'typo') {
    return `
    <section class="cover cover--typo" data-section="cover">
      <p class="cover__kicker">The Wedding of</p>
      <h1 class="cover__names-lg"><span>${esc(c.groom.name)}</span><i>&amp;</i><span>${esc(c.bride.name)}</span></h1>
      <hr class="cover__rule">
      <p class="cover__when">${d ? `${esc(d.dot)} ${esc(d.weekEn)} ${esc(t?.en ?? '')}` : ''}</p>
      <p class="cover__where">${place}</p>
      <figure class="cover__frame">${photo}</figure>
    </section>`;
  }
  if (type === 'magazine') {
    return `
    <section class="cover cover--magazine" data-section="cover">
      ${photo}
      <div class="cover__mast"><span>THE WEDDING</span><span>${d ? `VOL. ${esc(d.dot.slice(0, 4))}` : ''}</span></div>
      <p class="cover__bigdate"><span>${esc(mm)}</span><span>${esc(dd)}</span></p>
      <div class="cover__credit">
        <p class="cover__en">${esc(enName(c.groom))} <i>and</i> ${esc(enName(c.bride))}</p>
        <p>${whenKo}</p>
        <p>${place}</p>
      </div>
    </section>`;
  }
  if (type === 'monogram') {
    return `
    <section class="cover cover--monogram" data-section="cover">
      <div class="cover__mono" aria-hidden="true"><span>${esc(initial(c.groom))}</span><i>&amp;</i><span>${esc(initial(c.bride))}</span></div>
      <p class="cover__kicker">Together with their families</p>
      <figure class="cover__arch">${photo}</figure>
      <h1 class="cover__names-md">${esc(c.groom.name)} <i>·</i> ${esc(c.bride.name)}</h1>
      <p class="cover__when">${whenKo}</p>
      <p class="cover__where">${place}</p>
    </section>`;
  }
  if (type === 'polaroid') {
    return `
    <section class="cover cover--polaroid" data-section="cover">
      <figure class="cover__pol">
        ${photo}
        ${d ? `<span class="cover__stamp">'${esc(d.dot.slice(2, 4))} ${esc(String(+mm))} ${esc(String(+dd))}</span>` : ''}
        <figcaption>${esc(firstName(c.groom.name))} &amp; ${esc(firstName(c.bride.name))}, our wedding day</figcaption>
      </figure>
      <h1 class="cover__names-md">${esc(c.groom.name)} 그리고 ${esc(c.bride.name)}</h1>
      <p class="cover__when">${whenKo}</p>
      <p class="cover__where">${place}</p>
    </section>`;
  }
  return `
  <section class="cover cover--script" data-section="cover">
    ${photo}
    <div class="cover__bar"><span>${d ? esc(d.dot) : ''}</span><span>${esc(c.cover?.tagline ?? '')}</span><span>${d ? `${esc(d.weekEn)} ${esc(t?.en ?? '')}` : ''}</span></div>
    <p class="cover__script">${(has(c.cover?.script) ? c.cover.script : ['Happy', 'Wedding', 'Day']).map((w) => `<span>${esc(w)}</span>`).join('')}</p>
    <h1 class="cover__names">${esc(c.groom.name)} · ${esc(c.bride.name)}</h1>
  </section>`;
}

function greeting(c, ctx) {
  const g = c.greeting ?? {};
  const body = ctx.mode === 'parents' && has(c.parents?.greetingLines) ? c.parents.greetingLines : g.lines;
  return `
  <section class="sec reveal" data-section="greeting">
    <p class="eyebrow eyebrow--script">${esc(g.eyebrow || 'our wedding day')}</p>
    <h2 class="sec__title">${esc(g.title)}</h2>
    <div class="greeting__lines">${lines(body)}</div>
    ${g.photo ? `<figure class="greeting__photo"><img src="${esc(ctx.asset(g.photo))}" alt="" loading="lazy"></figure>` : ''}
  </section>`;
}

const parentName = (p) => (p?.name ? `<span class="${p.deceased ? 'deceased' : ''}">${esc(p.name)}</span>` : '');

function parents(c, ctx) {
  const row = (x) => {
    const ps = [parentName(x.father), parentName(x.mother)].filter(Boolean);
    return `
    <div class="parents__row">
      ${ps.length ? `${ps.join('<span class="parents__of">·</span>')}<span class="parents__of">의 ${esc(x.role)}</span>` : ''}
      <span class="parents__name">${esc(ps.length ? firstName(x.name) : x.name)}</span>
    </div>`;
  };
  const canCall = ctx.mode !== 'memorial' && [c.groom, c.bride].some((x) => x.phone || x.father?.phone || x.mother?.phone);
  return `
  <section class="sec sec--alt reveal" data-section="parents">
    <div class="parents">${row(c.groom)}${row(c.bride)}</div>
    ${canCall ? '<button class="btn btn--accent mt" data-open="sheet-call">축하 연락하기</button>' : ''}
  </section>`;
}

function contactSheet(c) {
  const person = (who, p) => (p?.name ? `
    <div class="contact">
      <span class="contact__who"><small>${esc(who)}</small>${esc(p.name)}</span>
      ${p.phone && !p.deceased ? `<span class="contact__acts">
        <a class="icon-btn" href="tel:${esc(p.phone)}" aria-label="${esc(p.name)}에게 전화">${ICON.phone}</a>
        <a class="icon-btn" href="sms:${esc(p.phone)}" aria-label="${esc(p.name)}에게 문자">${ICON.sms}</a>
      </span>` : ''}
    </div>` : '');
  const group = (title, x, self) => `
    <div class="contact-group">
      <h3>${esc(title)}</h3>
      ${person(self, x)}${person('아버지', x.father)}${person('어머니', x.mother)}
    </div>`;
  return `
  <div class="sheet" id="sheet-call" hidden>
    <div class="sheet__backdrop" data-close></div>
    <div class="sheet__panel" role="dialog" aria-modal="true" aria-labelledby="call-title">
      <button class="sheet__x" data-close aria-label="닫기">×</button>
      <p class="eyebrow">Contact Us</p>
      <h2 id="call-title" class="sheet__title">축하 연락하기</h2>
      ${group('신랑측', c.groom, '신랑')}${group('신부측', c.bride, '신부')}
    </div>
  </div>`;
}

function calendar(c, ctx) {
  if (!c.wedding.date) return '';
  const [y, m, d] = c.wedding.date.split('-').map(Number);
  const f = formatDate(c.wedding.date);
  const t = c.wedding.time ? formatTime(c.wedding.time) : null;
  const rows = calendarGrid(y, m).map((w) => `<tr>${w.map((n) => (n === d
    ? `<td class="is-day"><span>${n}</span></td>`
    : `<td>${n ?? ''}</td>`)).join('')}</tr>`).join('');
  const left = dday(ctx.today, c.wedding.date);
  const g = esc(firstName(c.groom.name)), b = esc(firstName(c.bride.name));
  let text;
  if (ctx.mode === 'memorial') text = lines(c.memorial?.lines);
  else if (left > 0) text = `<p>${g} ♥ ${b}의 결혼식이 <b>${left}일</b> 남았습니다.</p>`;
  else if (left === 0) text = '<p>오늘, 저희 결혼합니다.</p>';
  else text = '<p>저희 두 사람, 행복하게 잘 살겠습니다.</p>';
  const showCountdown = ctx.mode !== 'memorial' && left >= 0;
  return `
  <section class="sec reveal" data-section="calendar">
    <p class="cal__date">${esc(f.dot)}</p>
    <p class="muted">${esc(f.weekKo)}요일 ${esc(t?.ko ?? '')}</p>
    <div class="cal__box">
      <table class="cal__grid" aria-label="${y}년 ${m}월 달력">
        <thead><tr>${WEEK_KO.map((w) => `<th>${w}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${showCountdown ? `<div class="countdown" data-countdown="${esc(c.wedding.date)}T${esc(c.wedding.time || '00:00')}:00+09:00" aria-hidden="true">
      ${['DAYS', 'HOUR', 'MIN', 'SEC'].map((k) => `<div class="countdown__cell"><div class="countdown__num" data-k="${k}">-</div><div class="countdown__label">${k}</div></div>`).join('')}
    </div>` : ''}
    <div class="dday-text">${text}</div>
  </section>`;
}

/** 길찾기 링크. 좌표가 없으면 이름 검색으로 대신한다. */
export function naviLinks(v, ua = '') {
  const name = encodeURIComponent(v.name || v.address || '');
  const hasXY = typeof v.lat === 'number' && typeof v.lng === 'number';
  const kakao = v.kakaoPlaceId
    ? `https://map.kakao.com/link/to/${encodeURIComponent(v.kakaoPlaceId)}`
    : hasXY ? `https://map.kakao.com/link/to/${name},${v.lat},${v.lng}` : `https://map.kakao.com/link/search/${name}`;
  return {
    kakao,
    naverApp: hasXY ? `nmap://route/public?dlat=${v.lat}&dlng=${v.lng}&dname=${name}&appname=kr.jigulab.wedding` : `nmap://search?query=${name}&appname=kr.jigulab.wedding`,
    naverWeb: `https://map.naver.com/p/search/${name}`,
    tmapApp: hasXY ? `tmap://route?goalname=${name}&goalx=${v.lng}&goaly=${v.lat}` : `tmap://search?name=${name}`,
    tmapStore: /iPhone|iPad|iPod/.test(ua) ? 'https://apps.apple.com/kr/app/id431589174' : 'https://play.google.com/store/apps/details?id=com.skt.tmap.ku',
  };
}

function locationSec(c, ctx) {
  const v = c.venue;
  const n = naviLinks(v, ctx.ua);
  const guide = v.guide ?? {};
  const card = (icon, title, arr) => (has(arr) ? `
    <div class="guide"><span class="guide__icon">${icon}</span><div><h3>${esc(title)}</h3><ul>${arr.filter((x) => String(x).trim()).map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div></div>` : '');
  const guides = card(ICON.car, '주차 안내', guide.parking) + card(ICON.meal, '식사 안내', guide.meal) + card(ICON.bus, '셔틀버스', guide.shuttle);
  const routes = (v.routes ?? []).filter((r) => r.title || has(r.items)).map((r) => `
    <div class="route"><h3>${esc(r.title)}</h3><ul>${(r.items ?? []).map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('');
  return `
  <section class="sec sec--alt reveal" data-section="location">
    <p class="eyebrow">Location</p>
    <h2 class="sec__title">오시는 길</h2>
    <p class="venue__name">${esc(v.name)} ${esc(v.hall ?? '')}</p>
    <p class="muted">${esc(v.address)}</p>
    <div class="venue__acts">
      ${v.address ? `<button class="chip" data-copy="${esc(v.address)}" data-copy-msg="주소가 복사되었습니다.">주소 복사</button>` : ''}
      ${v.tel && ctx.mode !== 'memorial' ? `<a class="chip" href="tel:${esc(v.tel)}">식장 전화</a>` : ''}
    </div>
    ${v.mapImage ? `<div class="venue__map">
      <img src="${esc(ctx.asset(v.mapImage))}" alt="${esc(v.name)} 약도" loading="lazy" data-zoom="${esc(ctx.asset(v.mapImage))}">
      <button class="btn venue__map-btn" data-zoom="${esc(ctx.asset(v.mapImage))}">약도 크게 보기</button>
    </div>` : ''}
    <nav class="navi" aria-label="길찾기">
      <a href="${esc(n.kakao)}" target="_blank" rel="noopener">카카오맵</a>
      <a href="${esc(n.tmapApp)}" data-app-fallback="${esc(n.tmapStore)}">티맵</a>
      <a href="${esc(n.naverApp)}" data-app-fallback="${esc(n.naverWeb)}">네이버 지도</a>
    </nav>
    ${guides ? `<div class="guides">${guides}</div>` : ''}
    ${routes ? `<div class="routes">${routes}</div>` : ''}
  </section>`;
}

function flower(c) {
  return c.flowerNotice ? `<section class="flower reveal" data-section="flower"><p>${esc(c.flowerNotice)}</p></section>` : '';
}

function accounts(c, ctx) {
  const a = c.accounts ?? {};
  let g = a.groomSide ?? [], b = a.brideSide ?? [];
  if (ctx.mode === 'parents' && c.parents?.accountsFilter === 'parentsOnly') {
    const fg = g.filter((x) => x.forParents), fb = b.filter((x) => x.forParents);
    if (fg.length + fb.length > 0) { g = fg; b = fb; }
  }
  if (!g.length && !b.length) return '';
  const item = (x) => `
    <div class="acc__item">
      <p class="acc__who">${esc(x.label)}<b>${esc(x.name)}</b></p>
      <p class="acc__num">${esc(x.bank)} ${esc(x.number)}</p>
      <div class="acc__acts">
        <button class="btn" data-copy="${esc(x.number)}" data-copy-msg="계좌번호가 복사되었습니다.">계좌번호 복사</button>
        ${safeUrl(x.kakaopay) ? `<a class="btn btn--pay" href="${esc(safeUrl(x.kakaopay))}" target="_blank" rel="noopener">카카오페이</a>` : ''}
      </div>
    </div>`;
  const group = (title, list) => (list.length ? `
    <div class="acc__group">
      <button class="acc__head" aria-expanded="false">${esc(title)}</button>
      <div class="acc__body">${list.map(item).join('')}</div>
    </div>` : '');
  return `
  <section class="sec reveal" data-section="accounts">
    <p class="eyebrow">Account</p>
    <h2 class="sec__title">마음 전하실 곳</h2>
    <div class="muted">${lines(a.message)}</div>
    <div class="acc mt">${group('신랑측', g)}${group('신부측', b)}</div>
  </section>`;
}

function gallery(c, ctx) {
  const g = (c.gallery ?? []).filter(Boolean);
  if (!g.length) return '';
  const src = g.map((p) => ctx.asset(p));
  return `
  <section class="sec sec--alt reveal" data-section="gallery">
    <p class="eyebrow">Wedding Gallery</p>
    <h2 class="sec__title">웨딩 갤러리</h2>
    <div class="gal">
      <div class="gal__track" data-gal-track>
        ${src.map((s, i) => `<div class="gal__slide"><img src="${esc(s)}" alt="웨딩 사진 ${i + 1}" loading="lazy" data-index="${i}"></div>`).join('')}
      </div>
      ${g.length > 1 ? `<button class="gal__arrow gal__arrow--prev" data-gal="-1" aria-label="이전 사진">‹</button>
      <button class="gal__arrow gal__arrow--next" data-gal="1" aria-label="다음 사진">›</button>` : ''}
    </div>
    <p class="gal__count" data-gal-count>1 / ${g.length}</p>
    ${g.length > 1 ? `<div class="gal__thumbs">
      ${src.map((s, i) => `<button data-thumb="${i}" class="${i === 0 ? 'is-active' : ''}" aria-label="${i + 1}번 사진"><img src="${esc(s)}" alt="" loading="lazy"></button>`).join('')}
    </div>` : ''}
  </section>`;
}

function notices(c, ctx) {
  const list = (c.notices ?? []).filter((n) => n.title || has(n.lines));
  if (!list.length) return '';
  return `
  <section class="sec reveal" data-section="notices">
    <p class="eyebrow">Notice</p>
    <h2 class="sec__title">안내사항</h2>
    ${list.length > 1 ? `<div class="tabs" role="tablist">${list.map((n, i) => `<button role="tab" aria-selected="${i === 0}" data-tab="${i}">${esc(n.title)}</button>`).join('')}</div>` : ''}
    ${list.map((n, i) => `
      <div class="notice" data-panel="${i}" ${i ? 'hidden' : ''}>
        ${list.length === 1 && n.title ? `<h3 class="notice__title">${esc(n.title)}</h3>` : ''}
        ${n.photo ? `<figure class="notice__photo"><img src="${esc(ctx.asset(n.photo))}" alt="" loading="lazy"></figure>` : ''}
        <div>${lines(n.lines)}</div>
      </div>`).join('')}
  </section>`;
}

function music(c, ctx) {
  if (!c.music?.src || ctx.mode === 'parents') return '';
  return `
  <section class="music" data-section="music">
    <button class="music__btn" data-music aria-pressed="false">
      <span class="music__icon">${ICON.play}</span>
      <span><b>배경음악 듣기</b>${c.music.title ? `<small>${esc(c.music.title)}</small>` : ''}</span>
    </button>
    <audio preload="none" src="${esc(ctx.asset(c.music.src))}" loop></audio>
  </section>`;
}

function guestbook(c, ctx) {
  if (ctx.mode === 'memorial') return '';
  return `
  <section class="sec sec--alt reveal" data-section="guestbook">
    <p class="eyebrow">Guestbook</p>
    <h2 class="sec__title">축하 메시지</h2>
    <form class="form" data-demo-form>
      <label class="field"><span>이름</span><input name="name" autocomplete="name" required maxlength="20"></label>
      <label class="field"><span>메시지</span><textarea name="msg" rows="3" required maxlength="300"></textarea></label>
      <button class="btn btn--accent btn--block" type="submit">남기기</button>
      <p class="form__note">비밀번호는 받지 않습니다.</p>
    </form>
  </section>`;
}

function rsvp(c, ctx) {
  if (ctx.mode === 'memorial') return '';
  return `
  <section class="sec reveal" data-section="rsvp">
    <p class="eyebrow">RSVP</p>
    <h2 class="sec__title">참석 여부 전달</h2>
    <p class="muted">원활한 예식 준비를 위해<br>참석 여부를 알려주세요.</p>
    <form class="form mt" data-demo-form>
      <div class="seg" role="radiogroup" aria-label="구분">
        <label><input type="radio" name="side" value="groom" checked><span>신랑측</span></label>
        <label><input type="radio" name="side" value="bride"><span>신부측</span></label>
      </div>
      <div class="seg" role="radiogroup" aria-label="참석 여부">
        <label><input type="radio" name="attend" value="yes" checked><span>참석</span></label>
        <label><input type="radio" name="attend" value="no"><span>불참</span></label>
      </div>
      <label class="field"><span>성함</span><input name="name" autocomplete="name" required maxlength="20"></label>
      <label class="field"><span>동행 인원 (본인 포함)</span><input name="count" type="number" inputmode="numeric" min="1" max="10" value="1"></label>
      ${c.rsvp?.askMeal !== false ? `<div class="seg" role="radiogroup" aria-label="식사 여부">
        <label><input type="radio" name="meal" value="yes" checked><span>식사 예정</span></label>
        <label><input type="radio" name="meal" value="no"><span>식사 안 함</span></label>
      </div>` : ''}
      <button class="btn btn--accent btn--block" type="submit">전달하기</button>
    </form>
  </section>`;
}

function share(c, ctx) {
  const p = c.privacy ?? {};
  let safe = '';
  if (ctx.mode === 'memorial') {
    // 실제 삭제 장치(서버)가 있을 때만 '삭제되었습니다'라고 말한다
    safe = `<p class="safe"><span>${ICON.shield}</span>${ctx.privacyEnforced ? '계좌·연락처 정보는 삭제되었습니다.' : '예식이 끝나 계좌·연락처는 표시하지 않습니다.'}</p>`;
  } else if (p.safeNotice !== false) {
    safe = `<div class="safe"><span>${ICON.shield}</span><div>
      <p>이 청첩장은 앱 설치·파일 다운로드·개인정보 입력을 요구하지 않습니다.</p>
      ${p.autoDeleteDays && ctx.privacyEnforced ? `<p>예식 ${esc(p.autoDeleteDays)}일 후 계좌·연락처는 자동으로 삭제됩니다.</p>` : ''}
    </div></div>`;
  }
  return `
  <section class="sec sec--alt" data-section="share">
    <div class="share">
      <button class="btn btn--block" data-share>청첩장 공유하기</button>
      <button class="btn btn--block" data-copy-link>링크 복사하기</button>
    </div>
    ${safe}
  </section>
  <footer class="footer">THANK YOU</footer>`;
}

const RENDER = { cover, greeting, parents, calendar, location: locationSec, flower, accounts, gallery, notices, music, guestbook, rsvp, share };

/**
 * config(v2) → HTML.
 * opts: { mode:'guest'|'parents'|'memorial', today:'YYYY-MM-DD', resolveAsset(ref, kind) → url, ua }
 */
export function renderInvitation(c, opts = {}) {
  const mode = opts.mode ?? 'guest';
  const ctx = {
    mode,
    today: opts.today,
    ua: opts.ua ?? '',
    // 예식 후 자동 삭제가 실제로 동작할 때만 true (서버 게시 기능 전까지 하객 페이지는 false)
    privacyEnforced: !!opts.privacyEnforced,
    asset: (ref, kind) => (opts.resolveAsset ? opts.resolveAsset(ref, kind) : ref ?? ''),
  };
  let order = (c.sections ?? []).filter((s) => s.enabled).map((s) => s.id);
  if (mode === 'parents' && order.includes('parents')) {
    order = ['cover', 'parents', ...order.filter((id) => id !== 'cover' && id !== 'parents')];
  }
  if (mode === 'memorial') order = order.filter((id) => id !== 'accounts');
  const body = order.map((id) => RENDER[id]?.(c, ctx) ?? '').join('');
  return `<div class="inv" data-mode="${esc(mode)}">${body}</div>
  ${mode !== 'memorial' ? contactSheet(c) : ''}
  <div class="lightbox" data-lightbox hidden>
    <button class="lightbox__x" data-close aria-label="닫기">×</button>
    <div class="lightbox__track" data-lightbox-track></div>
    <p class="lightbox__count" data-lightbox-count></p>
  </div>
  <div class="toast" data-toast role="status" hidden></div>`;
}

/* =============== 동작 =============== */

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

// 앱 스킴을 열고, 앱이 안 열렸을 때만 대체 주소로 보낸다.
// iOS 는 "앱에서 열까요?" 확인창이 떠도 페이지가 hidden 이 아니라서 blur 까지 감지해 취소한다.
function openApp(scheme, fallback) {
  let t;
  const cancel = () => clearTimeout(t);
  ['visibilitychange', 'pagehide', 'blur'].forEach((ev) => window.addEventListener(ev, cancel, { once: true }));
  t = setTimeout(() => { if (!document.hidden && document.hasFocus()) location.href = fallback; }, 2500);
  location.href = scheme;
}

/**
 * 렌더 결과에 동작을 붙인다. 다시 그리기 전에 반환된 dispose() 를 호출할 것.
 * opts: { shareUrl, onSectionClick(id), demoNote }
 */
export function bindInvitation(root, c, opts = {}) {
  const $ = (sel) => root.querySelector(sel);
  const timers = [];
  const offs = [];
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); offs.push(() => el.removeEventListener(ev, fn, o)); };
  const shareUrl = () => opts.shareUrl ?? location.href;

  // iOS Safari 는 body overflow:hidden 으로 뒤 화면 스크롤이 안 막혀서 body 를 고정시킨다.
  let lockedY = 0;
  const openLayer = (el) => {
    el.hidden = false;
    lockedY = window.scrollY;
    document.body.style.top = `-${lockedY}px`;
    document.body.classList.add('is-locked');
  };
  const closeLayer = (el) => {
    if (!el || el.hidden) return;
    el.hidden = true;
    document.body.classList.remove('is-locked');
    document.body.style.top = '';
    window.scrollTo(0, lockedY);
  };

  const toast = (msg) => {
    const t = $('[data-toast]');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { t.hidden = true; }, 1800);
  };

  const openLightbox = (srcs, index) => {
    const lb = $('[data-lightbox]'), track = $('[data-lightbox-track]'), count = $('[data-lightbox-count]');
    track.innerHTML = srcs.map((s) => `<img src="${esc(s)}" alt="">`).join('');
    openLayer(lb);
    track.scrollLeft = track.clientWidth * index;
    const upd = () => { count.textContent = srcs.length > 1 ? `${Math.round(track.scrollLeft / track.clientWidth) + 1} / ${srcs.length}` : ''; };
    track.onscroll = upd;
    upd();
  };

  // 갤러리
  const track = $('[data-gal-track]');
  const galSrcs = track ? [...track.querySelectorAll('img')].map((i) => i.getAttribute('src')) : [];
  const thumbs = [...root.querySelectorAll('[data-thumb]')];
  const current = () => (track ? Math.round(track.scrollLeft / Math.max(1, track.clientWidth)) : 0);
  const mark = (i) => {
    const cnt = $('[data-gal-count]');
    if (cnt) cnt.textContent = `${i + 1} / ${galSrcs.length}`;
    thumbs.forEach((b, k) => b.classList.toggle('is-active', k === i));
  };
  const go = (i) => {
    const k = Math.max(0, Math.min(galSrcs.length - 1, i));
    track.scrollTo({ left: track.clientWidth * k, behavior: 'smooth' });
    mark(k);
  };
  if (track) on(track, 'scroll', () => mark(current()), { passive: true });

  // 음악: 자동재생 없음. 하객이 눌러야 재생.
  const audio = $('audio');
  const musicBtn = $('[data-music]');
  const setMusic = (playing) => {
    if (!musicBtn) return;
    musicBtn.setAttribute('aria-pressed', String(playing));
    musicBtn.querySelector('.music__icon').innerHTML = playing ? ICON.pause : ICON.play;
    musicBtn.querySelector('b').textContent = playing ? '배경음악 끄기' : '배경음악 듣기';
  };

  on(root, 'click', async (e) => {
    const el = e.target.closest('button, a, img[data-index], img[data-zoom], [data-close]');
    if (!el) {
      const sec = e.target.closest('[data-section]');
      if (sec && opts.onSectionClick) opts.onSectionClick(sec.dataset.section);
      return;
    }
    const d = el.dataset;

    if (d.open) return openLayer(root.querySelector(`#${d.open}`));
    if (d.close !== undefined) return closeLayer(el.closest('.sheet, .lightbox'));
    if (d.gal) return go(current() + Number(d.gal));
    if (d.thumb) return go(Number(d.thumb));
    if (d.index) return openLightbox(galSrcs, Number(d.index));
    if (d.zoom) return openLightbox([d.zoom], 0);
    if (d.appFallback) { e.preventDefault(); return openApp(el.getAttribute('href'), d.appFallback); }
    if (d.copy) return toast((await copyText(d.copy)) ? d.copyMsg : '복사에 실패했습니다. 길게 눌러 복사해 주세요.');
    if (d.copyLink !== undefined) return toast((await copyText(shareUrl())) ? '링크가 복사되었습니다.' : '복사에 실패했습니다.');
    if (d.share !== undefined) {
      if (navigator.share) {
        try { await navigator.share({ title: c.meta?.title, text: c.meta?.description, url: shareUrl() }); } catch { /* 사용자가 취소 */ }
      } else {
        toast((await copyText(shareUrl())) ? '링크가 복사되었습니다.' : '복사에 실패했습니다.');
      }
      return;
    }
    if (d.music !== undefined && audio) {
      if (audio.paused) { audio.play().then(() => setMusic(true)).catch(() => toast('음악을 재생할 수 없습니다.')); } else { audio.pause(); setMusic(false); }
      return;
    }
    if (d.tab) {
      root.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b === el)));
      root.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== d.tab; });
      return;
    }
    if (el.classList.contains('acc__head')) {
      const g = el.parentElement;
      g.classList.toggle('is-open');
      el.setAttribute('aria-expanded', String(g.classList.contains('is-open')));
    }
  });

  on(root, 'submit', (e) => {
    if (!e.target.matches('[data-demo-form]')) return;
    e.preventDefault();
    toast(opts.demoNote ?? '시제품에서는 저장되지 않습니다.');
  });

  on(document, 'keydown', (e) => {
    if (e.key !== 'Escape') return;
    root.querySelectorAll('.sheet:not([hidden]), .lightbox:not([hidden])').forEach(closeLayer);
  });

  // 카운트다운
  const cd = $('[data-countdown]');
  if (cd) {
    const target = new Date(cd.dataset.countdown).getTime();
    const set = (k, v) => { cd.querySelector(`[data-k="${k}"]`).textContent = String(v).padStart(2, '0'); };
    const tick = () => {
      const s = Math.floor(Math.max(0, target - Date.now()) / 1000);
      set('DAYS', Math.floor(s / 86400));
      set('HOUR', Math.floor((s % 86400) / 3600));
      set('MIN', Math.floor((s % 3600) / 60));
      set('SEC', s % 60);
    };
    tick();
    timers.push(setInterval(tick, 1000));
  }

  // 스크롤 등장
  let io;
  const reveals = root.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !opts.noReveal) {
    io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  return function dispose() {
    offs.forEach((f) => f());
    timers.forEach(clearInterval);
    io?.disconnect();
    audio?.pause();
    if (document.body.classList.contains('is-locked')) {
      document.body.classList.remove('is-locked');
      document.body.style.top = '';
    }
  };
}
