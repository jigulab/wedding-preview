// 날짜 계산 순수 함수 — 브라우저(app.js)와 node 테스트가 같이 쓴다.
// 날짜는 전부 "YYYY-MM-DD" 문자열로 받고, 시간대 영향을 없애려고 UTC 자정 기준으로 계산한다.

const DAY_MS = 86400000;
const WEEK_KO = ['일', '월', '화', '수', '목', '금', '토'];
const WEEK_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function parseYmd(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) throw new Error(`날짜 형식 오류: ${ymd}`);
  return { y: +m[1], mo: +m[2], d: +m[3] };
}

function utc(ymd) {
  const { y, mo, d } = parseYmd(ymd);
  return Date.UTC(y, mo - 1, d);
}

/** 예식일까지 남은 일수. 당일 0, 지나면 음수. */
export function dday(todayYmd, weddingYmd) {
  return Math.round((utc(weddingYmd) - utc(todayYmd)) / DAY_MS);
}

/** 한국 시간 기준 오늘 날짜 "YYYY-MM-DD" */
export function todayKst(now = new Date()) {
  return new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
}

export function weekday(ymd) {
  return new Date(utc(ymd)).getUTCDay();
}

/** 달력 그리드: 일요일 시작, 빈칸은 null. 7칸씩 나눈 주 배열. */
export function calendarGrid(year, month) {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = Array(first).fill(null);
  for (let d = 1; d <= last; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** "12:20" → { ko: "오후 12시 20분", en: "12:20PM" } */
export function formatTime(hm) {
  const m = /^(\d{2}):(\d{2})$/.exec(hm);
  if (!m) throw new Error(`시간 형식 오류: ${hm}`);
  const h = +m[1], mi = +m[2];
  const pm = h >= 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return {
    ko: `${pm ? '오후' : '오전'} ${h12}시${mi ? ` ${mi}분` : ''}`,
    en: `${h12}:${m[2]}${pm ? 'PM' : 'AM'}`,
  };
}

/** "2027-02-27" → 표기 묶음 */
export function formatDate(ymd) {
  const { y, mo, d } = parseYmd(ymd);
  const w = weekday(ymd);
  return {
    dot: `${y}.${String(mo).padStart(2, '0')}.${String(d).padStart(2, '0')}`,
    ko: `${y}년 ${mo}월 ${d}일 ${WEEK_KO[w]}요일`,
    short: `${mo}월 ${d}일(${WEEK_KO[w]})`,
    weekEn: WEEK_EN[w],
    weekKo: WEEK_KO[w],
  };
}

export { WEEK_KO };
