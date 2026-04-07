/**
 * Realm 로컬 DB
 * - 경로: REALM_PATH 환경변수 또는 기본 ./data/crain.realm
 */
const fs = require('fs');
const path = require('path');
const Realm = require('realm');

/** 앱 메타·캐시 등 최소 스키마 (필요 시 스키마·schemaVersion 을 늘려 확장) */
const AppMetaSchema = {
  name: 'AppMeta',
  primaryKey: 'key',
  properties: {
    key: 'string',
    value: 'string',
  },
};

/** Edge/Master PLC 에이전트와 동일 PlcDataRecord (OPC UA 스냅샷 저장) */
const PlcDataRecordSchema = {
  name: 'PlcDataRecord',
  primaryKey: '_id',
  properties: {
    _id: 'objectId',
    plcId: { type: 'string', indexed: true },
    plcName: 'string',
    nodeId: { type: 'string', indexed: true },
    nodeName: 'string',
    value: 'string',
    dataType: 'string',
    timestamp: 'date',
  },
};

let realmInstance = null;

function getRealmPath() {
  const raw = process.env.REALM_PATH;
  if (!raw || String(raw).trim() === '') {
    throw new Error('REALM_PATH is required (set it in hanwha-tbar-backend-crain/.env)');
  }
  const trimmed = String(raw).trim();
  return path.isAbsolute(trimmed) ? trimmed : path.join(process.cwd(), trimmed);
}

function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function openRealm() {
  if (realmInstance) return realmInstance;
  const realmPath = getRealmPath();
  ensureDirForFile(realmPath);
  realmInstance = await Realm.open({
    path: realmPath,
    schema: [AppMetaSchema, PlcDataRecordSchema],
    schemaVersion: 2,
    onMigration: (oldRealm, newRealm) => {
      if (oldRealm.schemaVersion < 2) {
        /* PlcDataRecord 테이블 신규 */
      }
    },
  });
  console.log('[Realm] opened:', realmPath);
  return realmInstance;
}

function getRealm() {
  return realmInstance;
}

async function closeRealm() {
  if (realmInstance) {
    realmInstance.close();
    realmInstance = null;
    console.log('[Realm] closed');
  }
  try {
    Realm.shutdown();
  } catch {
    /* noop */
  }
}

module.exports = {
  openRealm,
  closeRealm,
  getRealm,
  getRealmPath,
  AppMetaSchema,
  PlcDataRecordSchema,
};
