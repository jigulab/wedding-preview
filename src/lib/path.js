// 'groom.father.name' · 'accounts.groomSide.0.number' 같은 경로로 값 읽기/쓰기. 쓰기는 원본을 안 건드린다.
export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function setPath(obj, path, value) {
  const keys = path.split('.');
  const walk = (o, i) => {
    const k = keys[i];
    const isIdx = /^\d+$/.test(k);
    const base = Array.isArray(o) ? [...o] : { ...(o ?? (isIdx ? [] : {})) };
    if (i === keys.length - 1) {
      base[k] = value;
      return base;
    }
    const next = o?.[k] ?? (/^\d+$/.test(keys[i + 1]) ? [] : {});
    base[k] = walk(next, i + 1);
    return base;
  };
  return walk(obj, 0);
}
