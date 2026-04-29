/**
 * 로컬 data/crane.realm 초기 시드 — PLC_DataMap_lasted.md 와 동일 노드·값은
 * 1_plc-data-agent/scripts/data/crane_opcua_sample.js 를 재사용한다.
 *
 * C-1505·C-1507·PC→PLC 를 한 파일에 넣으며, 레코드는 plcId 로 구분한다.
 *
 * 실행: (backend-crane 루트에서) npm run seed:realm
 */
const fs = require('fs');
const path = require('path');
const Realm = require('realm');
const { AppMetaSchema, PlcDataRecordSchema } = require('../db/realm');

const SAMPLE = path.join(
  __dirname,
  '..',
  '..',
  '1_plc-data-agent',
  'scripts',
  'data',
  'crane_opcua_sample.js'
);

let sampleModule;
try {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  sampleModule = require(SAMPLE);
} catch (e) {
  console.error('[seed-realm] crane_opcua_sample.js 를 불러올 수 없습니다:', SAMPLE);
  console.error(e.message);
  process.exit(1);
}

const {
  buildCraneRowsC1505PlcToPc,
  buildCraneRowsC1507PlcToPc,
  buildCraneRowsPcToPlc,
  assertCraneSampleMatchesDatamap,
} = sampleModule;

function tagRows(rows, plcId, plcName) {
  return rows.map((r) => ({
    nodeId: r.nodeId,
    nodeName: r.nodeName,
    value: String(r.value),
    dataType: r.dataType || 'string',
    plcId,
    plcName,
  }));
}

function removeRealmFiles(realmPath) {
  const extras = [realmPath, `${realmPath}.lock`, `${realmPath}.management`, `${realmPath}.note`, `${realmPath}.log`];
  for (const p of extras) {
    try {
      if (fs.existsSync(p)) {
        const st = fs.statSync(p);
        if (st.isDirectory()) fs.rmSync(p, { recursive: true });
        else fs.unlinkSync(p);
      }
    } catch (_) {
      /* ignore */
    }
  }
}

async function main() {
  assertCraneSampleMatchesDatamap();

  const rawPath = process.env.REALM_PATH || './data/crane.realm';
  const realmPath = path.isAbsolute(rawPath) ? rawPath : path.join(process.cwd(), rawPath);
  const dir = path.dirname(realmPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  removeRealmFiles(realmPath);

  const c1505Plc = tagRows(buildCraneRowsC1505PlcToPc('98.7'), 'crane1505', 'Crane C-1505');
  const c1505Pc = tagRows(buildCraneRowsPcToPlc(), 'crane1505', 'Crane C-1505');
  const c1507Plc = tagRows(buildCraneRowsC1507PlcToPc('125.4', '120.1'), 'crane1507', 'Crane C-1507');
  const c1507Pc = tagRows(buildCraneRowsPcToPlc(), 'crane1507', 'Crane C-1507');

  const all = [...c1505Plc, ...c1505Pc, ...c1507Plc, ...c1507Pc];
  const now = new Date();

  const realm = await Realm.open({
    path: realmPath,
    schema: [AppMetaSchema, PlcDataRecordSchema],
    schemaVersion: 2,
  });

  realm.write(() => {
    for (const r of all) {
      realm.create('PlcDataRecord', {
        _id: new Realm.BSON.ObjectId(),
        plcId: r.plcId,
        plcName: r.plcName,
        nodeId: r.nodeId,
        nodeName: r.nodeName,
        value: r.value,
        dataType: r.dataType,
        timestamp: now,
      });
    }
  });
  realm.close();
  try {
    Realm.shutdown();
  } catch (_) {
    /* noop */
  }

  console.log(`[seed-realm] OK ${realmPath} (${all.length} rows)`);
  console.log('  crane1505:', c1505Plc.length + c1505Pc.length, ' crane1507:', c1507Plc.length + c1507Pc.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
