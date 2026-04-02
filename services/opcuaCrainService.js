/**
 * Crain PLC OPC UA 읽기 (node-opcua)
 * 환경변수: OPCUA_ENDPOINT, OPCUA_NODES (JSON 배열)
 */
const { OPCUAClient, AttributeIds, resolveNodeId } = require('node-opcua');

function parseNodeEntries() {
  const raw = process.env.OPCUA_NODES;
  if (!raw || String(raw).trim() === '') {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (typeof item === 'string') {
          return { nodeId: item, nodeName: item };
        }
        if (item && item.nodeId) {
          return {
            nodeId: String(item.nodeId),
            nodeName: item.nodeName != null ? String(item.nodeName) : String(item.nodeId),
          };
        }
        return null;
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getOpcUaEndpoint() {
  const raw = process.env.OPCUA_ENDPOINT;
  return raw && String(raw).trim() !== '' ? String(raw).trim() : null;
}

/**
 * OPC UA 서버에서 노드 값 읽기
 * @returns {Promise<Array<{plcId, plcName, nodeId, nodeName, value, dataType, timestamp}>>}
 */
async function readOpcUaSnapshot() {
  const endpointUrl = getOpcUaEndpoint();
  const nodeEntries = parseNodeEntries();
  if (!endpointUrl || nodeEntries.length === 0) {
    return [];
  }

  const plcId = process.env.CRAIN_PLC_ID || 'crain1507';
  const plcName = process.env.CRAIN_PLC_NAME || 'Crain PLC';

  const client = OPCUAClient.create({
    applicationName: 'HanwhaCrainBackend',
    applicationUri: 'urn:hanwha:crain:backend',
    connectionStrategy: {
      initialDelay: 1000,
      maxRetry: 2,
    },
  });

  await client.connect(endpointUrl);
  try {
    const session = await client.createSession();
    try {
      const records = [];
      for (const e of nodeEntries) {
        const nodeId = resolveNodeId(e.nodeId);
        const dataValue = await session.read({
          nodeId,
          attributeId: AttributeIds.Value,
        });
        const val = dataValue.value && dataValue.value.value !== undefined ? dataValue.value.value : null;
        const dataType =
          dataValue.value && dataValue.value.dataType
            ? dataValue.value.dataType.toString()
            : '';
        let ts = dataValue.serverTimestamp || dataValue.sourceTimestamp;
        if (!ts || !(ts instanceof Date)) {
          ts = new Date();
        }
        records.push({
          plcId,
          plcName,
          nodeId: e.nodeId,
          nodeName: e.nodeName,
          value: val === null || val === undefined ? '' : String(val),
          dataType,
          timestamp: ts,
        });
      }
      return records;
    } finally {
      await session.close();
    }
  } finally {
    await client.disconnect();
  }
}

module.exports = {
  readOpcUaSnapshot,
  getOpcUaEndpoint,
  parseNodeEntries,
};
