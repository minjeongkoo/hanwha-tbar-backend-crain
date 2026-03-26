/**
 * line-system-backend-crain 진입점
 * - Express HTTP 서버
 * - MariaDB 연결
 * - 외부 API GET 대비 (axios)
 */
require('dotenv').config();
const express = require('express');
const { initPool, endPool } = require('./db/maria');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({ name: 'line-system-backend-crain', version: '1.0.0' });
});

async function start() {
  try {
    await initPool();
  } catch (err) {
    console.warn('MariaDB 연결 실패로 DB 없이 시작합니다:', err.message);
  }

  const server = app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });

  const shutdown = () => {
    server.close(async () => {
      await endPool();
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
