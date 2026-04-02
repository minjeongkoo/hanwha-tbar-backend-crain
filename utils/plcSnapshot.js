/**
 * Edge `plcRealmService.buildLatestSnapshot` 와 동일 로직 (nodeId별 최신값)
 */
function buildLatestSnapshot(records) {
  if (!records || records.length === 0) {
    return {
      asOf: null,
      plcId: null,
      plcName: null,
      nodes: {},
      count: 0,
    };
  }

  const byNodeId = new Map();
  for (const r of records) {
    const ts = new Date(r.timestamp).getTime();
    if (Number.isNaN(ts)) continue;
    const prev = byNodeId.get(r.nodeId);
    const prevTs = prev ? new Date(prev.timestamp).getTime() : -Infinity;
    if (!prev || ts > prevTs) {
      byNodeId.set(r.nodeId, r);
    }
  }

  const nodes = {};
  let maxTs = -Infinity;
  let plcId = null;
  let plcName = null;

  for (const [nodeId, r] of byNodeId) {
    const t = new Date(r.timestamp).getTime();
    if (t > maxTs) maxTs = t;
    if (plcId == null) plcId = r.plcId;
    if (plcName == null) plcName = r.plcName;
    nodes[nodeId] = {
      nodeName: r.nodeName,
      value: r.value,
      dataType: r.dataType,
      timestamp: r.timestamp,
    };
  }

  return {
    asOf: maxTs > -Infinity ? new Date(maxTs).toISOString() : null,
    plcId,
    plcName,
    nodes,
    count: Object.keys(nodes).length,
  };
}

module.exports = { buildLatestSnapshot };
