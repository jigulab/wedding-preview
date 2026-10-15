// 시작 마법사 — 이름 → 날짜 → 예식장 → 사진 → 분위기. 빈 화면 공포 없이 바로 완성본을 보여 준다.
import { createProject, migrate } from '../lib/schema.js';
import { MOODS } from '../themes.js';
import { formatTime } from '../lib/date.js';
import { esc } from '../render.js';

const STEPS = ['names', 'date', 'venue', 'photo', 'mood'];

export function runWizard({ processPhoto }) {
  return new Promise((resolve) => {
    const data = { groom: '', bride: '', date: '', time: '12:00', venueName: '', venueAddress: '', photo: '', photoUrl: '', mood: 'romantic' };
    let step = -1;
    const root = document.createElement('div');
    root.className = 'wiz';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', '청첩장 시작하기');
    document.body.appendChild(root);

    const progress = () => (step < 0 ? '' : `
      <div class="wiz__progress" aria-label="${step + 1} / ${STEPS.length} 단계">
        ${STEPS.map((_, i) => `<span class="${i <= step ? 'on' : ''}"></span>`).join('')}
      </div>`);

    function view() {
      const s = STEPS[step];
      if (step < 0) {
        return `
          <div class="wiz__intro">
            <p class="wiz__kicker">청첩장 스튜디오</p>
            <h1>두 사람의 청첩장을<br>5분 만에 만들어 볼까요?</h1>
            <p class="wiz__lead">몇 가지만 알려 주시면 바로 완성된 청첩장을 보여 드릴게요.<br>나머지는 미리보기를 보면서 천천히 고치면 돼요.</p>
            <div class="wiz__cta">
              <button class="wbtn wbtn--primary" data-w="next">직접 만들기</button>
              <button class="wbtn" data-w="sample">예시로 먼저 둘러보기</button>
            </div>
            <p class="wiz__fine">가입 없이 시작해요. 만든 내용은 이 브라우저에만 저장돼요.</p>
          </div>`;
      }
      if (s === 'names') {
        return `<h2>두 분의 이름을 알려 주세요</h2>
          <div class="wiz__grid">
            <label class="wf"><span>신랑</span><input name="groom" value="${esc(data.groom)}" placeholder="홍길동" maxlength="10" autocomplete="off" required></label>
            <label class="wf"><span>신부</span><input name="bride" value="${esc(data.bride)}" placeholder="김하늘" maxlength="10" autocomplete="off" required></label>
          </div>`;
      }
      if (s === 'date') {
        return `<h2>예식은 언제인가요?</h2>
          <div class="wiz__grid">
            <label class="wf"><span>날짜</span><input name="date" type="date" value="${esc(data.date)}" required></label>
            <label class="wf"><span>시간</span><input name="time" type="time" step="300" value="${esc(data.time)}"></label>
          </div>
          <p class="wiz__hint">아직 시간이 정확하지 않으면 나중에 바꿔도 돼요.</p>`;
      }
      if (s === 'venue') {
        return `<h2>어디에서 하나요?</h2>
          <label class="wf"><span>예식장 이름</span><input name="venueName" value="${esc(data.venueName)}" placeholder="예시웨딩홀" autocomplete="off"></label>
          <label class="wf"><span>주소</span><input name="venueAddress" value="${esc(data.venueAddress)}" placeholder="서울 중구 세종대로 110" autocomplete="off"></label>
          <p class="wiz__hint">주차·식사 안내는 다음 화면에서 더 넣을 수 있어요.</p>`;
      }
      if (s === 'photo') {
        return `<h2>대표 사진을 골라 주세요</h2>
          <button class="wiz__photo ${data.photoUrl ? 'has' : ''}" data-w="photo" type="button">
            ${data.photoUrl ? `<img src="${esc(data.photoUrl)}" alt="고른 사진">` : '<span>눌러서 사진 고르기</span>'}
          </button>
          <p class="wiz__hint">세로 사진이 잘 어울려요. 사진은 자동으로 가볍게 줄여서 저장해요.</p>
          <input type="file" accept="image/*" hidden data-w-file>`;
      }
      return `<h2>어떤 분위기가 좋으세요?</h2>
        <div class="wiz__moods">${Object.entries(MOODS).map(([id, m]) => `
          <button type="button" class="wmood ${id === data.mood ? 'on' : ''}" data-w="mood" data-id="${id}" aria-pressed="${id === data.mood}">
            <span class="mood__sw" data-mood-swatch="${id}"></span><b>${esc(m.name)}</b><small>${esc(m.desc)}</small>
          </button>`).join('')}</div>
        <p class="wiz__hint">언제든 바꿀 수 있고, 바꿔도 내용은 그대로예요.</p>`;
    }

    function paint() {
      const s = STEPS[step];
      root.innerHTML = `
        <div class="wiz__card ${step < 0 ? 'wiz__card--intro' : ''}">
          ${progress()}
          <form class="wiz__form" novalidate>
            ${view()}
            <p class="wiz__err" role="alert" hidden></p>
            ${step >= 0 ? `<div class="wiz__nav">
              <button type="button" class="wbtn wbtn--ghost" data-w="prev">이전</button>
              ${s === 'photo' && !data.photo ? '<button type="button" class="wbtn wbtn--ghost" data-w="next">나중에</button>' : ''}
              <button type="submit" class="wbtn wbtn--primary">${step === STEPS.length - 1 ? '청첩장 만들기' : '다음'}</button>
            </div>` : ''}
          </form>
        </div>`;
      root.querySelector('input:not([type=file])')?.focus();
    }

    function collect() {
      root.querySelectorAll('.wiz__form input[name]').forEach((i) => { data[i.name] = i.value.trim(); });
    }

    function error(msg) {
      const e = root.querySelector('.wiz__err');
      e.textContent = msg;
      e.hidden = false;
    }

    function next() {
      collect();
      const s = STEPS[step];
      if (s === 'names' && (!data.groom || !data.bride)) return error('두 분의 이름을 모두 넣어 주세요.');
      if (s === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return error('예식 날짜를 골라 주세요.');
      if (step === STEPS.length - 1) return finish();
      step += 1;
      paint();
    }

    function finish() {
      const config = createProject(data);
      config.theme = { mood: data.mood, accent: null };
      const md = data.date.split('-');
      config.meta.description = [`${+md[1]}월 ${+md[2]}일 ${data.time ? formatTime(data.time).ko : ''}`.trim(), data.venueName].filter(Boolean).join(' · ');
      root.remove();
      resolve({ config, welcome: '청첩장이 만들어졌어요. 미리보기에서 고치고 싶은 곳을 눌러 보세요.' });
    }

    root.addEventListener('submit', (e) => { e.preventDefault(); next(); });
    root.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-w]');
      if (!b) return;
      const w = b.dataset.w;
      if (w === 'next') { if (step < 0) { step = 0; paint(); } else { step += 1; paint(); } }
      else if (w === 'prev') { collect(); step -= 1; paint(); }
      else if (w === 'photo') root.querySelector('[data-w-file]').click();
      else if (w === 'mood') {
        data.mood = b.dataset.id;
        root.querySelectorAll('.wmood').forEach((m) => { m.classList.toggle('on', m === b); m.setAttribute('aria-pressed', String(m === b)); });
      } else if (w === 'sample') {
        const res = await fetch('../couples/sample/config.json');
        const config = migrate(await res.json());
        root.remove();
        resolve({ config, welcome: '예시 청첩장이에요. 마음껏 눌러 보고 고쳐 보세요.' });
      }
    });
    root.addEventListener('change', async (e) => {
      if (!e.target.matches('[data-w-file]') || !e.target.files[0]) return;
      const btn = root.querySelector('.wiz__photo');
      btn.innerHTML = '<span>사진을 정리하는 중…</span>';
      try {
        data.photo = await processPhoto(e.target.files[0]);
        data.photoUrl = URL.createObjectURL(e.target.files[0]);
        paint();
      } catch (err) {
        paint();
        error(err.message);
      }
    });

    paint();
  });
}
