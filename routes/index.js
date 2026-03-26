const express = require('express');
const { getExternal } = require('../services/externalApi');
const { getRealm } = require('../db/realm');

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
    return res.status(400).json({ error: 'query param "url" is required' });
  }
  try {
    const result = await getExternal(url, { timeout: 15000 });
    res.json(result);
  } catch (err) {
    const status = err.status || 502;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
