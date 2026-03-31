const express = require('express');
const { getExternal } = require('../services/externalApi');
const { getRealm } = require('../db/realm');
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

module.exports = router;
