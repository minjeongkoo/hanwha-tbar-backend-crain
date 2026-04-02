const { readOpcUaSnapshot, getOpcUaEndpoint, parseNodeEntries } = require('./opcuaCrainService');
const { upsertPlcDataRecords } = require('./crainPlcRealmStore');

let syncTimer = null;
let lastSyncAt = null;
let lastError = null;

function getSyncIntervalMs() {
  const raw = process.env.CRAIN_SYNC_INTERVAL_MS;
  const n = raw !== undefined && raw !== '' ? parseInt(String(raw).trim(), 10) : 5000;
  if (Number.isNaN(n) || n < 1000) return 5000;
  return n;
}

function isOpcUaConfigured() {
  return Boolean(getOpcUaEndpoint() && parseNodeEntries().length > 0);
}

/**
 * OPC UA 읽기 → 로컬 Realm 저장 (클라이언트는 Edge GET /api/plc/crain/1507 → crain-backend 조회)
 */
async function runOneSync() {
  if (!isOpcUaConfigured()) {
    lastError = new Error('OPCUA_ENDPOINT or OPCUA_NODES not configured');
    return { ok: false, skipped: true, message: lastError.message };
  }

  let records;
  try {
    records = await readOpcUaSnapshot();
  } catch (err) {
    lastError = err;
    return { ok: false, phase: 'opcua', message: err.message };
  }

  try {
    upsertPlcDataRecords(records);
  } catch (err) {
    lastError = err;
    return { ok: false, phase: 'realm', message: err.message };
  }

  lastSyncAt = new Date().toISOString();
  lastError = null;
  return { ok: true, count: records.length, syncedAt: lastSyncAt };
}

function startCrainOpcuaSync() {
  if (syncTimer) clearInterval(syncTimer);
  if (process.env.CRAIN_OPCUA_ENABLED === '0' || process.env.CRAIN_OPCUA_ENABLED === 'false') {
    console.log('[Crain OPC UA] disabled by CRAIN_OPCUA_ENABLED');
    return;
  }
  if (!isOpcUaConfigured()) {
    console.warn('[Crain OPC UA] OPCUA_ENDPOINT / OPCUA_NODES 미설정 — 주기 동기화를 시작하지 않습니다.');
    return;
  }

  const ms = getSyncIntervalMs();
  console.log(`[Crain OPC UA] sync every ${ms}ms → local Realm`);
  syncTimer = setInterval(() => {
    runOneSync().catch((err) => {
      lastError = err;
      console.error('[Crain OPC UA] sync error:', err.message);
    });
  }, ms);

  runOneSync().catch((err) => {
    lastError = err;
    console.error('[Crain OPC UA] initial sync error:', err.message);
  });
}

function stopCrainOpcuaSync() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

function getSyncStatus() {
  return {
    opcUaConfigured: isOpcUaConfigured(),
    intervalMs: getSyncIntervalMs(),
    lastSyncAt,
    lastError: lastError ? lastError.message : null,
  };
}

module.exports = {
  runOneSync,
  startCrainOpcuaSync,
  stopCrainOpcuaSync,
  getSyncStatus,
};
