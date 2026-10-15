// 백업 파일 — config + 사진(base64)을 JSON 하나로. 브라우저 저장소가 지워져도 이 파일로 복원한다.
import { migrate } from '../lib/schema.js';
import { usedAssetIds } from './store.js';

export const FORMAT = 'wedding-builder-backup';

async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function base64ToBlob(b64, type) {
  const bin = typeof Buffer !== 'undefined' ? Buffer.from(b64, 'base64') : Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
  return new Blob([bin], { type });
}

/** store 에서 config 가 쓰는 사진만 골라 백업 JSON 문자열을 만든다 */
export async function exportProject(config, store) {
  const assets = [];
  for (const id of usedAssetIds(config)) {
    const a = await store.getAsset(id);
    if (a) assets.push({ id, type: a.type || a.blob.type, w: a.w, h: a.h, data: await blobToBase64(a.blob) });
  }
  return JSON.stringify({ format: FORMAT, version: 1, savedAt: new Date().toISOString(), config, assets });
}

/** 백업 JSON 문자열 → { config, assets:[{id, blob, type, w, h}] } */
export function parseBackup(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('백업 파일을 읽을 수 없습니다.'); }
  if (data?.format !== FORMAT || !data.config) throw new Error('이 서비스의 백업 파일이 아닙니다.');
  return {
    config: migrate(data.config),
    assets: (data.assets ?? []).map((a) => ({ id: a.id, type: a.type, w: a.w, h: a.h, blob: base64ToBlob(a.data, a.type) })),
  };
}
