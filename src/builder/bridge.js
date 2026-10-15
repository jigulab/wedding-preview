// 편집기(부모) ↔ 미리보기(iframe) 메시지 다리.
// 부모→iframe: {type:'asset', id, blob} · {type:'asset-remove', id} · {type:'render', config, mode, today} · {type:'focus', id}
// iframe→부모: {type:'ready'} · {type:'section-click', id}
// 같은 출처(origin)끼리만 주고받는다.

export function createBridge(iframe, { onReady, onSectionClick } = {}) {
  let ready = false;
  let pending = null;
  let pendingFocus = null;
  const sentAssets = new Set();
  let timer = null;

  const send = (msg) => iframe.contentWindow?.postMessage(msg, location.origin);

  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || e.source !== iframe.contentWindow) return;
    const m = e.data ?? {};
    if (m.type === 'ready') {
      ready = true;
      sentAssets.clear();
      pending = null; // 오래된 대기분은 버린다 — onReady 가 최신 상태를 바로 보낸다
      onReady?.();
      if (pendingFocus) { const id = pendingFocus; pendingFocus = null; setTimeout(() => send({ type: 'focus', id }), 150); }
    } else if (m.type === 'section-click') {
      onSectionClick?.(m.id);
    }
  });

  return {
    /** 사진 Blob 을 미리보기에 등록(같은 id 는 한 번만) */
    asset(id, blob, force = false) {
      if (!ready || (!force && sentAssets.has(id))) return;
      sentAssets.add(id);
      send({ type: 'asset', id, blob });
    },
    removeAsset(id) {
      sentAssets.delete(id);
      if (ready) send({ type: 'asset-remove', id });
    },
    hasAsset: (id) => sentAssets.has(id),
    /** 입력이 몰릴 때를 위해 120ms 모아서 그린다 */
    render(config, mode, today, immediate = false) {
      const msg = { type: 'render', config, mode, today };
      clearTimeout(timer);
      const go = () => (ready ? send(msg) : (pending = msg));
      if (immediate) go(); else timer = setTimeout(go, 120);
    },
    focus(id) { if (ready) send({ type: 'focus', id }); else pendingFocus = id; },
    get ready() { return ready; },
  };
}
