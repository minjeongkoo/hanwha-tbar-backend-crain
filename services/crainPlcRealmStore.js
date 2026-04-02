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

  realm.write(() => {
    for (const raw of list) {
      const nodeId = raw.nodeId != null ? String(raw.nodeId) : '';
      if (!nodeId) continue;

      let ts = raw.timestamp;
      if (!(ts instanceof Date)) {
        ts = ts ? new Date(ts) : new Date();
      }
      const plcId = raw.plcId != null ? String(raw.plcId) : 'crain1507';
      const plcName = raw.plcName != null ? String(raw.plcName) : 'Crain PLC';
      const nodeName = raw.nodeName != null ? String(raw.nodeName) : '';
      const value = raw.value != null ? String(raw.value) : '';
      const dataType = raw.dataType != null ? String(raw.dataType) : '';

      const existing = realm.objects('PlcDataRecord').filtered('nodeId == $0', nodeId)[0];
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
  const snapshot = buildLatestSnapshot(records);
  return {
    ok: true,
    records,
    snapshot,
  };
}

module.exports = {
  upsertPlcDataRecords,
  getLocalPlcPayload,
  serializeRecord,
};
