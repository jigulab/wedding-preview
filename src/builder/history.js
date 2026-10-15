// 되돌리기/다시하기 스택. 상태는 JSON 직렬화 가능한 값(config)만. 순수 모듈(node 테스트).
export function createHistory(limit = 50) {
  const past = [];
  const future = [];
  const snap = (s) => JSON.stringify(s);
  return {
    /** 변경 "직전" 상태를 기록한다. 같은 상태 연속 기록은 무시. */
    record(state) {
      const s = snap(state);
      if (past.at(-1) === s) return;
      past.push(s);
      if (past.length > limit) past.shift();
      future.length = 0;
    },
    undo(current) {
      if (!past.length) return null;
      future.push(snap(current));
      return JSON.parse(past.pop());
    },
    redo(current) {
      if (!future.length) return null;
      past.push(snap(current));
      return JSON.parse(future.pop());
    },
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
    get size() { return past.length; },
  };
}
