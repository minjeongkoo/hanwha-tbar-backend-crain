const express = require('express');
const { getRealm } = require('../db/realm');
const { getLocalPlcPayload } = require('../services/crainPlcRealmStore');
const { runOneSync, getSyncStatus } = require('../services/crainOpcuaSync');
const { fail } = require('../utils/apiResponse');

const router = express.Router();

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
 * 로컬 Realm에 저장된 Crain PLC 스냅샷 (OPC UA 수집 결과)
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
  const realmPath = process.env.REALM_PATH;
  return res.json({
    ok: true,
    role: 'crain',
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
  const realmPath = process.env.REALM_PATH;
  return res.json({
    ok: true,
    role: 'crain',
    target: crainPlcId,
    source: 'local-realm',
    realmPath,
    count: payload.records.length,
    snapshot: payload.snapshot,
    records: payload.records,
  });
});

/**
 * POST /api/sync/crain-plc
 * 수동 동기화 트리거 (OPC UA → Realm) — 운영·장애 대응용, 로컬 접근만 권장
 */
router.post('/sync/crain-plc', async (req, res) => {
  try {
    const out = await runOneSync();
    return res.json({ ok: out.ok, ...out });
  } catch (err) {
    return fail(res, 500, {
      code: 'SYNC_ERROR',
      message: err.message,
      userMessage: '동기화 실행 중 오류가 발생했습니다.',
    });
  }
});

/** GET /api/sync/crain-plc/status — 마지막 동기화 상태 조회 */
router.get('/sync/crain-plc/status', (req, res) => {
  res.json({ ok: true, ...getSyncStatus() });
});

module.exports = router;
