/**
 * hanwha-tbar-backend-edge 프록시 (axios POST)
 * - Edge는 app.use('/api', routes) 이므로 최종 URL: {EDGE_API_BASE_URL}/api{path}
 */
const axios = require('axios');

function getEdgeBaseUrl() {
  const raw = process.env.EDGE_API_BASE_URL || process.env.HANWHA_EDGE_BASE_URL;
  if (!raw || String(raw).trim() === '') {
    return null;
  }
  return String(raw).trim().replace(/\/$/, '');
}

/**
 * Edge로 JSON POST
 * @param {string} apiPath - `/api` 다음 경로 (예: `/client/operation/getWorkList`)
 * @param {object} body
 * @param {{ timeout?: number, headers?: object }} [options]
 * @returns {Promise<{ status: number, data: unknown }>}
 */
async function postToEdge(apiPath, body = {}, options = {}) {
  const base = getEdgeBaseUrl();
  if (!base) {
    const err = new Error('EDGE_API_BASE_URL is not set');
    err.code = 'EDGE_NOT_CONFIGURED';
    throw err;
  }
  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  const url = `${base}/api${path}`;
  const { timeout = 60000, headers = {} } = options;
  const mergedHeaders = { 'Content-Type': 'application/json', ...headers };
  const crainToken = process.env.EDGE_CRAIN_TOKEN;
  if (crainToken && String(crainToken).trim() !== '') {
    mergedHeaders['X-Crain-Token'] = String(crainToken).trim();
  }
  try {
    const res = await axios.post(url, body, {
      headers: mergedHeaders,
      timeout,
      validateStatus: () => true,
    });
    return { status: res.status, data: res.data };
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    const e = new Error(message);
    e.status = err.response?.status || 502;
    e.response = err.response;
    throw e;
  }
}

/**
 * Edge로 GET (쿼리스트링 전달)
 * @param {string} apiPath - `/api` 다음 경로
 * @param {object} [query]
 */
async function getFromEdge(apiPath, query = {}, options = {}) {
  const base = getEdgeBaseUrl();
  if (!base) {
    const err = new Error('EDGE_API_BASE_URL is not set');
    err.code = 'EDGE_NOT_CONFIGURED';
    throw err;
  }
  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  const url = `${base}/api${path}`;
  const { timeout = 60000, headers = {} } = options;
  try {
    const res = await axios.get(url, {
      params: query,
      headers: { ...headers },
      timeout,
      validateStatus: () => true,
    });
    return { status: res.status, data: res.data };
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    const e = new Error(message);
    e.status = err.response?.status || 502;
    e.response = err.response;
    throw e;
  }
}

module.exports = { getEdgeBaseUrl, postToEdge, getFromEdge };
