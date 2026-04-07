const Realm = require('realm');
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
 * OPC UA에서 읽은 레코드를 로컬 Realm에 반영 (nodeId 기준 upsert)
 * @param {object[]} records
 */
function upsertPlcDataRecords(records) {
  const realm = getRealm();
  if (!realm) {
    throw new Error('Realm is not open');
  }
  const list = Array.isArray(records) ? records : [];
  const defaultPlcId = process.env.CRAIN_PLC_ID || 'crain1507';

  realm.write(() => {
    for (const raw of list) {
      const nodeId = raw.nodeId != null ? String(raw.nodeId) : '';
      if (!nodeId) continue;

      let ts = raw.timestamp;
      if (!(ts instanceof Date)) {
        ts = ts ? new Date(ts) : new Date();
      }
      const plcId = raw.plcId != null ? String(raw.plcId) : defaultPlcId;
      const plcName = raw.plcName != null ? String(raw.plcName) : 'Crain PLC';
      const nodeName = raw.nodeName != null ? String(raw.nodeName) : '';
      const value = raw.value != null ? String(raw.value) : '';
      const dataType = raw.dataType != null ? String(raw.dataType) : '';

      const existing = realm
        .objects('PlcDataRecord')
        .filtered('plcId == $0 && nodeId == $1', plcId, nodeId)[0];
      if (existing) {
        existing.plcId = plcId;
        existing.plcName = plcName;
        existing.nodeName = nodeName;
        existing.value = value;
        existing.dataType = dataType;
        existing.timestamp = ts;
      } else {
        realm.create('PlcDataRecord', {
          _id: new Realm.BSON.ObjectId(),
          plcId,
          plcName,
          nodeId,
          nodeName,
          value,
          dataType,
          timestamp: ts,
        });
      }
    }
  });
}

/**
 * 로컬 Realm PLC 데이터 → API 응답용
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

  // 두 인스턴스를 동시에 띄우는 경우 각 인스턴스가 자기 plcId에 해당하는 데이터만 응답하도록 1차 필터링한다.
  // 기존 realm이 특정 plcId만 가진 경우가 있을 수 있으므로, 필터 결과가 비면 전체를 fallback 한다.
  const filtered = records.filter((r) => String(r.plcId) === expectedPlcId);
  const outRecords = filtered.length > 0 ? filtered : records;
  const snapshot = buildLatestSnapshot(outRecords);
  return {
    ok: true,
    records: outRecords,
    snapshot,
  };
}

module.exports = {
  upsertPlcDataRecords,
  getLocalPlcPayload,
  serializeRecord,
};
