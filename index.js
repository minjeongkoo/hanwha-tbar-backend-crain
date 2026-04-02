/**
 * line-system-backend-crain 진입점
 * - Express HTTP 서버
 * - Realm 로컬 DB
 * - 외부 API GET 대비 (axios)
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const { openRealm, closeRealm } = require('./db/realm');
const routes = require('./routes');
const { startCrainOpcuaSync, stopCrainOpcuaSync } = require('./services/crainOpcuaSync');

const DEFAULT_PORT = 3001;
function getListenPort() {
  const raw = process.env.PORT;
  if (raw === undefined || raw === '') return DEFAULT_PORT;
  const n = parseInt(String(raw).trim(), 10);
  if (Number.isNaN(n) || n < 1 || n > 65535) {
    console.warn(`PORT="${raw}" 는 유효하지 않아 ${DEFAULT_PORT} 을(를) 사용합니다.`);
    return DEFAULT_PORT;
  }
  return n;
}

const app = express();
const PORT = getListenPort();

app.use(express.json());
app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({ name: 'line-system-backend-crain', version: '1.0.0' });
});

async function start() {
  try {
    await openRealm();
  } catch (err) {
    console.warn('Realm 열기 실패로 DB 없이 시작합니다:', err.message);
  }

  startCrainOpcuaSync();

  const server = app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });

  const shutdown = () => {
    stopCrainOpcuaSync();
    server.close(async () => {
      await closeRealm();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('Start failed:', err);
  process.exit(1);
});
