// 디자인 무드 목록 — 무드 1개 = 색 토큰(themes.css) + 글꼴 2~3종 + 커버 배치 + 포인트색 프리셋.
// 무드·포인트색을 바꿔도 config(내용)는 그대로다. 근거: docs/research/03-design-ux.md ②
// 포인트색은 배경 위 글자로도 쓰이므로 대비 4.5:1 이상만 둔다 (tests/contrast.test.js 가 전수 검사).
const GF = 'https://fonts.googleapis.com/css2?display=swap&';
const PRETENDARD = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';

export const MOODS = {
  romantic: {
    name: '로맨틱 와인',
    desc: '사진 위 필기체, 와인 포인트',
    cover: 'script',
    fonts: [`${GF}family=Gowun+Batang:wght@400;700&family=Pinyon+Script&family=Cormorant+Garamond:ital,wght@0,500;1,500`],
    accents: [
      { key: 'wine', name: '와인', hex: '#890808' },
      { key: 'rose', name: '로즈', hex: '#9c3d54' },
      { key: 'navy', name: '네이비', hex: '#2c3e64' },
      { key: 'forest', name: '포레스트', hex: '#2f5d46' },
    ],
  },
  luxury: {
    name: '조용한 럭셔리',
    desc: '아이보리 여백, 이름으로 시작',
    cover: 'typo',
    fonts: [`${GF}family=Noto+Serif+KR:wght@300;500&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400`],
    accents: [
      { key: 'sage', name: '세이지', hex: '#56704b' },
      { key: 'taupe', name: '토프', hex: '#7a6650' },
      { key: 'dusty', name: '더스티 블루', hex: '#4d6478' },
    ],
  },
  editorial: {
    name: '에디토리얼',
    desc: '잡지 표지처럼 큰 날짜',
    cover: 'magazine',
    fonts: [PRETENDARD, `${GF}family=Playfair+Display:ital,wght@0,500;0,700;1,500`],
    accents: [
      { key: 'red', name: '레드', hex: '#9b2c2c' },
      { key: 'black', name: '블랙', hex: '#111111' },
      { key: 'cobalt', name: '코발트', hex: '#1f4fa3' },
      { key: 'green', name: '그린', hex: '#1f5c45' },
    ],
  },
  classic: {
    name: '모던 클래식',
    desc: '이니셜 문양, 아치형 사진',
    cover: 'monogram',
    fonts: [`${GF}family=Nanum+Myeongjo:wght@400;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500`],
    accents: [
      { key: 'gold', name: '골드', hex: '#7d6227' },
      { key: 'navy', name: '네이비', hex: '#1f2a44' },
      { key: 'burgundy', name: '버건디', hex: '#7a2335' },
      { key: 'emerald', name: '에메랄드', hex: '#245c4a' },
    ],
  },
  film: {
    name: '필름',
    desc: '폴라로이드, 날짜 각인',
    cover: 'polaroid',
    fonts: [`${GF}family=Gowun+Batang:wght@400;700&family=Cormorant+Garamond:ital,wght@0,500;1,500`],
    accents: [
      { key: 'terracotta', name: '테라코타', hex: '#9e4526' },
      { key: 'olive', name: '올리브', hex: '#5f6b3a' },
      { key: 'brown', name: '브라운', hex: '#6b4a32' },
      { key: 'teal', name: '틸', hex: '#2f6066' },
    ],
  },
};

export const DEFAULT_MOOD = 'romantic';

export function accentHex(mood, key) {
  return MOODS[mood]?.accents.find((a) => a.key === key)?.hex ?? null;
}

/** 무드·포인트색을 문서에 적용. 반환값 = 실제 적용된 무드 id */
export function applyTheme({ mood, accent } = {}, root = document.documentElement) {
  const id = MOODS[mood] ? mood : DEFAULT_MOOD;
  root.dataset.mood = id;
  const hex = accentHex(id, accent);
  if (hex) root.style.setProperty('--accent', hex);
  else root.style.removeProperty('--accent');

  const doc = root.ownerDocument;
  const want = MOODS[id].fonts;
  const have = [...doc.querySelectorAll('link[data-mood-font]')];
  if (have.map((l) => l.href).join() !== want.join()) {
    have.forEach((l) => l.remove());
    for (const href of want) {
      const l = doc.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      l.dataset.moodFont = '';
      doc.head.appendChild(l);
    }
  }
  return id;
}

/** 이전 이름 호환 */
export const applyMood = (mood) => applyTheme({ mood });
