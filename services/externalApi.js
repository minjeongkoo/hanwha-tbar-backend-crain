/**
 * 외부 API GET 요청 유틸
 * axios 기반으로 외부 API 호출 시 사용
 */
const axios = require('axios');

/**
 * 외부 API GET 요청
 * @param {string} url - 요청 URL
 * @param {object} options - axios 옵션 (headers, params, timeout 등)
 * @returns {Promise<object>}
 */
async function getExternal(url, options = {}) {
  const { headers = {}, params = {}, timeout = 10000 } = options;
  try {
    const res = await axios.get(url, {
      headers: { 'Content-Type': 'application/json', ...headers },
      params,
      timeout,
    });
    return { data: res.data, status: res.status };
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    const status = err.response?.status;
    throw Object.assign(new Error(message), { status, response: err.response });
  }
}

module.exports = { getExternal };
