/**
 * MariaDB 연결 풀
 * 환경변수: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT(선택, 기본 3306)
 */
const mariadb = require('mariadb');

let pool = null;

function getConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'line_system',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    connectionLimit: 10,
  };
}

async function initPool() {
  if (pool) return pool;
  const config = getConfig();
  pool = mariadb.createPool(config);
  console.log('[MariaDB] Pool 생성됨:', config.host + ':' + config.port + '/' + config.database);
  return pool;
}

function getPool() {
  return pool;
}

async function endPool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[MariaDB] Pool 종료됨');
  }
}

/** 풀에서 연결 얻어 쿼리 실행 후 release. 에러 시 throw */
async function query(sql, params = []) {
  const p = getPool();
  if (!p) throw new Error('MariaDB pool not initialized');
  let conn;
  try {
    conn = await p.getConnection();
    return await conn.query(sql, params);
  } finally {
    if (conn) conn.release();
  }
}

module.exports = {
  initPool,
  getPool,
  endPool,
  query,
  getConfig,
};
