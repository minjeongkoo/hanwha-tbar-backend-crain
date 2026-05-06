const axios = require('axios');
const { getLocalPlcPayload } = require('./cranePlcRealmStore');

function createCranePushAgent() {
  const edgePushUrl = (process.env.EDGE_PUSH_URL || '').trim().replace(/\/$/, '');
  const craneId = (process.env.CRANE_PLC_ID || 'crane1507').replace('crane', '');
  const intervalMs = parseInt(process.env.PUSH_INTERVAL_MS || '5000', 10);
  const timeout = parseInt(process.env.PUSH_TIMEOUT_MS || '10000', 10);

  async function pushOnce() {
    const payload = getLocalPlcPayload();
    if (!payload.ok) return;
    const url = `${edgePushUrl}/api/push/plc/crane/${craneId}`;
    try {
      await axios.post(url, payload, { timeout });
    } catch (err) {
      console.warn(`[CranePush] push failed: ${err.message}`);
    }
  }

  function start() {
    if (!edgePushUrl) {
      console.warn('[CranePush] EDGE_PUSH_URL 미설정 — push 비활성');
      return;
    }
    pushOnce();
    setInterval(pushOnce, intervalMs);
    console.log(`[CranePush] 시작 → ${edgePushUrl} (${intervalMs}ms 간격, craneId=${craneId})`);
  }

  return { start };
}

module.exports = { createCranePushAgent };
