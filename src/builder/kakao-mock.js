// 카톡에서 링크를 받았을 때 보이는 모양(흉내). 실제 모양은 게시 후 카카오 서버가 만든다.
import { esc } from '../render.js';
import { formatDate, formatTime } from '../lib/date.js';

export function renderKakao(c, thumb) {
  const img = thumb(c.meta?.shareImage || c.cover?.photo);
  const title = c.meta?.title || `${c.groom.name}♥${c.bride.name} 결혼합니다.`;
  let desc = c.meta?.description;
  if (!desc && c.wedding.date) desc = `${formatDate(c.wedding.date).short} ${c.wedding.time ? formatTime(c.wedding.time).ko : ''} · ${c.venue.name ?? ''}`;
  const warn = [];
  if (!/[가-힣]{2,}/.test(title)) warn.push('제목에 두 분 이름을 넣으면 하객이 안심하고 열어요.');
  if (!desc) warn.push('설명에 날짜·장소를 넣어 주세요.');
  return `
    <div class="kk">
      <div class="kk__bar"><span>‹</span><b>${esc(c.groom.name || '신랑')}</b><span>≡</span></div>
      <div class="kk__chat">
        <div class="kk__row">
          <span class="kk__avatar" aria-hidden="true"></span>
          <div>
            <p class="kk__name">${esc(c.groom.name || '신랑')}</p>
            <div class="kk__bubble">
              ${img ? `<img src="${esc(img)}" alt="">` : '<div class="kk__noimg">미리보기 사진 없음</div>'}
              <div class="kk__txt"><b>${esc(title)}</b><p>${esc(desc ?? '')}</p></div>
              <div class="kk__btn">청첩장 보기</div>
            </div>
          </div>
        </div>
      </div>
      <div class="kk__note">
        <p>카카오톡으로 보냈을 때 이런 모양으로 보여요.</p>
        ${warn.map((w) => `<p class="kk__warn">${esc(w)}</p>`).join('')}
        <button class="btn-s" data-action="open" data-id="share">제목·사진 바꾸기</button>
      </div>
    </div>`;
}
