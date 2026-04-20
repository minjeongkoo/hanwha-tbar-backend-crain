const { getRealm } = require('../db/realm');
const { buildLatestSnapshot } = require('../utils/plcSnapshot');

function serializeRecord(r) {
  return {
    plcId: r.plcId,
    plcName: r.plcName,
    nodeId: r.nodeId,
    nodeName: r.nodeName,
    value: r.value,
    dataType: r.dataType,
    timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : r.timestamp,
  };
}

/**
 * 로컬 Realm PLC 데이터 → API 응답용 (읽기 전용)
 */
function getLocalPlcPayload() {
  const realm = getRealm();
  if (!realm) {
    return {
      ok: false,
      error: 'Realm is not open',
      records: [],
      snapshot: buildLatestSnapshot([]),
    };
  }
  const objects = realm.objects('PlcDataRecord');
  const records = Array.from(objects).map(serializeRecord);
  const expectedPlcId = process.env.CRAIN_PLC_ID || 'crain1507';
  const strictPlcId = String(process.env.CRAIN_STRICT_PLC_ID || '').toLowerCase() === 'true';

  // 두 인스턴스를 동시에 띄우는 경우 각 인스턴스가 자기 plcId에 해당하는 데이터만 응답하도록 1차 필터링한다.
  // 기존 realm이 특정 plcId만 가진 경우가 있을 수 있으므로, 필터 결과가 비면 전체를 fallback 한다.
  const filtered = records.filter((r) => String(r.plcId) === expectedPlcId);
  const outRecords = filtered.length > 0 || strictPlcId ? filtered : records;
  const snapshot = buildLatestSnapshot(outRecords);
  return {
    ok: true,
    records: outRecords,
    snapshot,
  };
}

module.exports = {
  getLocalPlcPayload,
  serializeRecord,
};
