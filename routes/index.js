const express = require('express');
const { getExternal } = require('../services/externalApi');
const { postToEdge, getFromEdge } = require('../services/edgeApi');
const { getRealm } = require('../db/realm');
const { getLocalPlcPayload } = require('../services/crainPlcRealmStore');
const { runOneSync, getSyncStatus } = require('../services/crainOpcuaSync');
const { fail } = require('../utils/apiResponse');

const router = express.Router();

// 헬스체크 (Realm 열림 시 db: true 포함)
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

// 외부 API GET 예시 (query로 url 전달)
// 예: GET /api/external?url=https://jsonplaceholder.typicode.com/posts/1
router.get('/external', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return fail(res, 400, {
      code: 'INVALID_QUERY',
      message: 'query param "url" is required',
      userMessage: '요청 파라미터를 확인해주세요.',
    });
  }
  try {
    const result = await getExternal(url, { timeout: 15000 });
    res.json(result);
  } catch (err) {
    const status = err.status || 502;
    return fail(res, status, {
      code: 'EXTERNAL_PROXY_ERROR',
      message: err.message,
      userMessage: '외부 API 호출에 실패했습니다.',
    });
  }
});

/**
 * hanwha-tbar-backend-edge — 작업 목록 (DB 우선·OPS 연동)
 * Edge: POST /api/client/operation/getWorkList
 * Body 예: { PLN_WEEK_NO, USER_ID, USER_IP_ADDR, STRT_DTTM } (Edge 컨트롤러와 동일)
 */
function mapEdgeProxyError(res, err) {
  if (err.code === 'EDGE_NOT_CONFIGURED') {
    return fail(res, 503, {
      code: 'EDGE_NOT_CONFIGURED',
      message: err.message,
      userMessage: '.env 에 EDGE_API_BASE_URL(Edge 서버 origin)을 설정하세요.',
    });
  }
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 502;
  return fail(res, status, {
    code: 'EDGE_PROXY_ERROR',
    message: err.message,
    userMessage: 'Edge 서버 호출에 실패했습니다.',
    details: err.response?.data ?? null,
  });
}

/**
 * Edge POST /api/client/operation/* — Body 스펙은 Edge forClient 와 동일
 */
router.post('/client/operation/getWorkList', async (req, res) => {
  try {
    const result = await postToEdge('/client/operation/getWorkList', req.body || {});
    return res.status(result.status).json(result.data);
  } catch (err) {
    return mapEdgeProxyError(res, err);
  }
});

router.post('/client/operation/getCuttingList', async (req, res) => {
  try {
    const result = await postToEdge('/client/operation/getCuttingList', req.body || {});
    return res.status(result.status).json(result.data);
  } catch (err) {
    return mapEdgeProxyError(res, err);
  }
});

/**
 * Edge GET /api/client/operation/* — query 로 주차·사용자 등 전달 (Edge GET 스펙과 동일)
 */
router.get('/client/operation/getWorkList', async (req, res) => {
  try {
    const result = await getFromEdge('/client/operation/getWorkList', { ...req.query });
    return res.status(result.status).json(result.data);
  } catch (err) {
    return mapEdgeProxyError(res, err);
  }
});

router.get('/client/operation/getCuttingList', async (req, res) => {
  try {
    const result = await getFromEdge('/client/operation/getCuttingList', { ...req.query });
    return res.status(result.status).json(result.data);
  } catch (err) {
    return mapEdgeProxyError(res, err);
  }
});

/** 로컬 Realm 에 저장된 Crain PLC 스냅샷 (OPC UA 수집 결과) */
router.get('/client/plc/crain1507', (req, res) => {
  const payload = getLocalPlcPayload();
  if (!payload.ok) {
    return fail(res, 503, {
      code: 'REALM_CLOSED',
      message: payload.error || 'realm error',
      userMessage: '로컬 PLC 데이터를 읽을 수 없습니다.',
    });
  }
  return res.json({
    ok: true,
    role: 'crain',
    target: 'crain1507',
    source: 'local-realm',
    realmPath: process.env.REALM_PATH || '(default ./data/crain.realm)',
    count: payload.records.length,
    snapshot: payload.snapshot,
    records: payload.records,
  });
});

/** 수동 동기화 (OPC UA → Realm → Edge) */
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

router.get('/sync/crain-plc/status', (req, res) => {
  res.json({ ok: true, ...getSyncStatus() });
});

module.exports = router;
