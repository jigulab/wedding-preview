// 사진 자동 처리(브라우저 전용): 방향 바로잡기(EXIF) → 긴 변 maxSide 로 축소(확대는 안 함) → WebP(안 되면 JPEG) 압축.
// 결과: { blob, type, w, h }

async function decode(file) {
  // createImageBitmap 의 imageOrientation:'from-image' 가 EXIF 회전을 적용한다.
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* 아래로 */ }
  }
  // 대체 경로: <img> 디코드 (최신 브라우저는 image-orientation:from-image 가 기본)
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const toBlob = (canvas, type, q) => new Promise((resolve) => canvas.toBlob(resolve, type, q));

export function fitSize(w, h, maxSide) {
  const k = Math.min(1, maxSide / Math.max(w, h));
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

export async function processImage(file, { maxSide = 1600, quality = 0.82, prefer = 'image/webp' } = {}) {
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) throw new Error('사진 파일만 올릴 수 있습니다.');
  let src;
  try { src = await decode(file); } catch {
    throw new Error(/heic|heif/i.test(file.type + file.name)
      ? 'HEIC 사진은 이 브라우저에서 열 수 없습니다. 사진 앱에서 JPG로 내보내 주세요.'
      : '사진을 열 수 없습니다.');
  }
  const sw = src.width ?? src.naturalWidth, sh = src.height ?? src.naturalHeight;
  const { w, h } = fitSize(sw, sh, maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, w, h);
  src.close?.();
  let blob = await toBlob(canvas, prefer, quality);
  // 일부 Safari 는 webp 인코딩을 못 하고 png 를 돌려준다 → JPEG 로
  if (!blob || blob.type !== prefer) blob = await toBlob(canvas, 'image/jpeg', quality);
  if (!blob) throw new Error('사진 압축에 실패했습니다.');
  return { blob, type: blob.type, w, h };
}

/** 오디오는 손대지 않고 크기만 확인 */
export function checkAudio(file, maxBytes = 15 * 1024 * 1024) {
  if (!/^audio\//.test(file.type) && !/\.(mp3|m4a|aac|ogg|wav)$/i.test(file.name)) throw new Error('음악 파일(mp3·m4a)만 올릴 수 있습니다.');
  if (file.size > maxBytes) throw new Error('음악 파일이 너무 큽니다(15MB 이하).');
  return { blob: file, type: file.type || 'audio/mpeg', w: 0, h: 0 };
}
