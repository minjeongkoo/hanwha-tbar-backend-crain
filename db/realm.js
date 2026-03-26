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

let realmInstance = null;

function getRealmPath() {
  const raw = process.env.REALM_PATH;
  if (raw && String(raw).trim() !== '') {
    return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
  }
  return path.join(__dirname, '..', 'data', 'crain.realm');
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
    schema: [AppMetaSchema],
    schemaVersion: 1,
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
};
