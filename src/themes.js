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

// 2026-10-16 추가 8종 — 국내 업체 샘플의 "구성"만 참고(사진·글꼴·코드는 우리 것)
Object.assign(MOODS, {
  daylight: {
    name: '데이라이트',
    desc: '큰 날짜 아래로 번지는 사진',
    cover: 'daylight',
    fonts: [`${GF}family=Cormorant+Garamond:ital,wght@0,400;0,500;1,500&family=Noto+Serif+KR:wght@300;500`],
    accents: [
      { key: 'brown', name: '브라운', hex: '#7f6141' },
      { key: 'charcoal', name: '차콜', hex: '#3b3936' },
      { key: 'rose', name: '로즈', hex: '#924454' },
    ],
  },
  tone: {
    name: '톤온톤',
    desc: '사진 없이 글자로만',
    cover: 'tone',
    photoless: true,
    fonts: [`${GF}family=Cinzel:wght@400;500&family=Pinyon+Script&family=Gowun+Batang:wght@400;700&family=Cormorant+Garamond:ital,wght@0,500;1,500`],
    accents: [
      { key: 'mocha', name: '모카', hex: '#755c47' },
      { key: 'ink', name: '먹색', hex: '#3b3530' },
      { key: 'sage', name: '세이지', hex: '#506a4a' },
    ],
  },
  minimal: {
    name: '미니멀 초대장',
    desc: '사진 없이 단정하게, 혼주용에도',
    cover: 'minimal',
    photoless: true,
    fonts: [`${GF}family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,500&family=Nanum+Myeongjo:wght@400;700`],
    accents: [
      { key: 'black', name: '블랙', hex: '#1e1e1e' },
      { key: 'navy', name: '네이비', hex: '#22324d' },
      { key: 'wine', name: '와인', hex: '#7a2335' },
    ],
  },
  oval: {
    name: '다크 오벌',
    desc: '어두운 바탕, 타원 사진',
    cover: 'oval',
    dark: true,
    fonts: [`${GF}family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Gowun+Batang:wght@400;700`],
    accents: [
      { key: 'gold', name: '골드', hex: '#d8b98a' },
      { key: 'sage', name: '세이지', hex: '#a9c0a0' },
      { key: 'blush', name: '블러시', hex: '#e2b6b0' },
    ],
  },
  glass: {
    name: '글래스',
    desc: '꽉 찬 사진 위 유리 카드',
    cover: 'glass',
    fonts: [PRETENDARD, `${GF}family=Cormorant+Garamond:ital,wght@0,500;1,500`],
    accents: [
      { key: 'green', name: '그린', hex: '#3f6a52' },
      { key: 'slate', name: '슬레이트', hex: '#3e5266' },
      { key: 'plum', name: '플럼', hex: '#6a4060' },
    ],
  },
  line: {
    name: '라인 앤 네임',
    desc: '가는 선으로 이은 날짜와 이름',
    cover: 'line',
    fonts: [`${GF}family=Nanum+Myeongjo:wght@400;700&family=Cormorant+Garamond:ital,wght@0,500;1,500`],
    accents: [
      { key: 'walnut', name: '월넛', hex: '#5b4a3a' },
      { key: 'ink', name: '먹색', hex: '#262421' },
      { key: 'forest', name: '포레스트', hex: '#355541' },
    ],
  },
  hand: {
    name: '손글씨',
    desc: '테이프 붙인 사진, 손글씨 결혼합니다',
    cover: 'hand',
    fonts: [`${GF}family=Nanum+Pen+Script&family=Gowun+Dodum&family=Cormorant+Garamond:ital,wght@1,500`],
    accents: [
      { key: 'red', name: '레드', hex: '#a8402c' },
      { key: 'navy', name: '네이비', hex: '#2d4470' },
      { key: 'green', name: '그린', hex: '#3d6a46' },
    ],
  },
  vertical: {
    name: '세로 이름',
    desc: '한글 이름을 세로로',
    cover: 'vertical',
    fonts: [`${GF}family=Noto+Serif+KR:wght@400;600&family=Cormorant+Garamond:ital,wght@0,500;1,500`],
    accents: [
      { key: 'walnut', name: '월넛', hex: '#6d5a42' },
      { key: 'ink', name: '먹색', hex: '#2e2a25' },
      { key: 'plum', name: '플럼', hex: '#6a3f55' },
    ],
  },
});

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
