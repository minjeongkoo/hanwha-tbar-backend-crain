const express = require('express');
const { getRealm } = require('../db/realm');
const { getLocalPlcPayload } = require('../services/crainPlcRealmStore');
const { fail } = require('../utils/apiResponse');

const router = express.Router();

function toCrainNumericId(target, fallback) {
  const str = target != null ? String(target).trim() : '';
  const m = str.match(/(\d{4})$/);
  if (m) return m[1];
  return fallback;
}

// 헬스체크 (Realm 열림 시 db: true 포함)
// Edge 및 인프라 연동 확인용 — 클라이언트 공개 API 아님
router.get('/health', async (req, res) => {
  const payload = { ok: true, message: 'line-system-backend-crain is running', dbType: 'realm' };
  const realm = getRealm();
  if (realm) {
    try {
      realm.objects('AppMeta');
      payload.db = true;
    } catch (e) {
      payload.db = false;
      payload.dbError = e.message;
    }
  } else {
    payload.db = false;
  }
  res.json(payload);
});

/**
 * GET /api/client/plc/crain1507
 * 로컬 Realm(Agent App이 갱신)에 저장된 Crain PLC 스냅샷 반환
 * Edge의 GET /api/plc/crain/1507 이 호출하는 upstream 엔드포인트
 */
router.get('/client/plc/crain1507', (req, res) => {
  const payload = getLocalPlcPayload();
  if (!payload.ok) {
    return fail(res, 503, {
      code: 'REALM_CLOSED',
      message: payload.error || 'realm error',
      userMessage: '로컬 PLC 데이터를 읽을 수 없습니다.',
    });
  }
  const crainPlcId = process.env.CRAIN_PLC_ID || 'crain1507';
  const crainId = toCrainNumericId(crainPlcId, '1507');
  const realmPath = process.env.REALM_PATH;
  return res.json({
    ok: true,
    role: 'crain',
    crainId,
    target: crainPlcId,
    source: 'local-realm',
    realmPath,
    count: payload.records.length,
    snapshot: payload.snapshot,
    records: payload.records,
  });
});

/**
 * GET /api/client/plc/crain1505
 * 개발 환경에서 1505/1507 서버를 동시에 띄우기 위해 동일 Realm Handler를 노출
 */
router.get('/client/plc/crain1505', (req, res) => {
  const payload = getLocalPlcPayload();
  if (!payload.ok) {
    return fail(res, 503, {
      code: 'REALM_CLOSED',
      message: payload.error || 'realm error',
      userMessage: '로컬 PLC 데이터를 읽을 수 없습니다.',
    });
  }
  const crainPlcId = process.env.CRAIN_PLC_ID || 'crain1505';
  const crainId = toCrainNumericId(crainPlcId, '1505');
  const realmPath = process.env.REALM_PATH;
  return res.json({
    ok: true,
    role: 'crain',
    crainId,
    target: crainPlcId,
    source: 'local-realm',
    realmPath,
    count: payload.records.length,
    snapshot: payload.snapshot,
    records: payload.records,
  });
});

module.exports = router;
