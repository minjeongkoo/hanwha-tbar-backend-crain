# hanwha-tbar-backend-crain API Spec

`3_hanwha-tbar-backend-crain` 소스코드(`index.js`, `routes/index.js`) 기준 API 명세입니다.

## 공통

- Base URL: `http://<host>:<PORT>`
- 기본 포트: `3001` (`.env`의 `PORT`로 변경 가능)
- JSON 응답: 모든 API는 `application/json` 응답
- API prefix: 라우터는 `/api` 하위에 마운트됨

## 에러 응답 포맷

실패 시(`fail()` 유틸 사용) 아래 포맷을 사용합니다.

```json
{
  "ok": false,
  "data": null,
  "meta": {},
  "error": {
    "code": "ERROR_CODE",
    "message": "developer-oriented message",
    "userMessage": "사용자 안내 메시지",
    "details": null
  }
}
```

---

## 1) 서비스 정보

### `GET /`

서버 기본 정보 조회

#### Response 200

```json
{
  "name": "line-system-backend-crain",
  "version": "1.0.0"
}
```

---

## 2) 헬스체크

### `GET /api/health`

프로세스 실행 상태 및 Realm 접근 가능 여부 확인

#### Response 200

```json
{
  "ok": true,
  "message": "line-system-backend-crain is running",
  "dbType": "realm",
  "db": true
}
```

`db` 값:
- `true`: Realm 접근 가능
- `false`: Realm 미오픈 또는 접근 실패

Realm 접근 실패 케이스에서는 `dbError`가 추가될 수 있습니다.

---

## 3) Crain PLC 데이터 조회 (1507)

### `GET /api/client/plc/crain1507`

로컬 Realm에 저장된 PLC 스냅샷/레코드 반환  
(Edge 서버의 upstream 호출 대상)

#### Response 200

```json
{
  "ok": true,
  "role": "crain",
  "target": "crain1507",
  "source": "local-realm",
  "realmPath": "./data/crain.realm",
  "count": 2,
  "snapshot": {
    "asOf": "2026-04-16T01:23:45.678Z",
    "plcId": "crain1507",
    "plcName": "Crain PLC",
    "nodes": {
      "ns=2;s=SomeNode": {
        "nodeName": "SomeNode",
        "value": "123",
        "dataType": "Double",
        "timestamp": "2026-04-16T01:23:45.678Z"
      }
    },
    "count": 1
  },
  "records": [
    {
      "plcId": "crain1507",
      "plcName": "Crain PLC",
      "nodeId": "ns=2;s=SomeNode",
      "nodeName": "SomeNode",
      "value": "123",
      "dataType": "Double",
      "timestamp": "2026-04-16T01:23:45.678Z"
    }
  ]
}
```

#### Error 503 (`REALM_CLOSED`)

Realm 미오픈/접근 실패 시:

```json
{
  "ok": false,
  "data": null,
  "meta": {},
  "error": {
    "code": "REALM_CLOSED",
    "message": "Realm is not open",
    "userMessage": "로컬 PLC 데이터를 읽을 수 없습니다.",
    "details": null
  }
}
```

---

## 4) Crain PLC 데이터 조회 (1505)

### `GET /api/client/plc/crain1505`

개발 환경에서 1505/1507 동시 운용 시 동일 로직으로 조회 제공

#### Response 200

응답 스키마는 `GET /api/client/plc/crain1507`와 동일하며, `target` 기본값만 `crain1505`로 동작합니다.

#### Error 503 (`REALM_CLOSED`)

`GET /api/client/plc/crain1507`와 동일한 에러 포맷

---

## 5) OPC UA -> Realm 수동 동기화 실행

### `POST /api/sync/crain-plc`

OPC UA에서 읽은 값을 Realm에 반영하는 1회 동기화 트리거

#### Request Body

없음

#### Response 200 (성공)

```json
{
  "ok": true,
  "count": 12,
  "syncedAt": "2026-04-16T01:23:45.678Z"
}
```

#### Response 200 (스킵)

`OPCUA_ENDPOINT` 또는 `OPCUA_NODES` 미설정 시:

```json
{
  "ok": false,
  "skipped": true,
  "message": "OPCUA_ENDPOINT or OPCUA_NODES not configured"
}
```

#### Response 200 (단계별 실패)

- OPC UA 읽기 실패:

```json
{
  "ok": false,
  "phase": "opcua",
  "message": "..."
}
```

- Realm 반영 실패:

```json
{
  "ok": false,
  "phase": "realm",
  "message": "..."
}
```

#### Error 500 (`SYNC_ERROR`)

예외 throw 발생 시:

```json
{
  "ok": false,
  "data": null,
  "meta": {},
  "error": {
    "code": "SYNC_ERROR",
    "message": "동기화 실행 중 내부 예외 메시지",
    "userMessage": "동기화 실행 중 오류가 발생했습니다.",
    "details": null
  }
}
```

---

## 6) 동기화 상태 조회

### `GET /api/sync/crain-plc/status`

마지막 동기화 상태 반환

#### Response 200

```json
{
  "ok": true,
  "opcUaConfigured": true,
  "intervalMs": 5000,
  "lastSyncAt": "2026-04-16T01:23:45.678Z",
  "lastError": null
}
```

---

## 데이터 모델 참고

`records[]` 항목은 Realm의 `PlcDataRecord` 스키마 기반:

- `plcId: string`
- `plcName: string`
- `nodeId: string`
- `nodeName: string`
- `value: string`
- `dataType: string`
- `timestamp: string(ISO-8601)`

---

## 운영 메모

- 서버 시작 시 `CRAIN_OPCUA_ENABLED`가 `0` 또는 `false`면 주기 동기화 미실행
- `OPCUA_ENDPOINT`, `OPCUA_NODES`가 없으면 주기 동기화 미실행(수동 실행 시도도 skipped)
- `target` 값 및 내부 필터 기준은 `CRAIN_PLC_ID` 환경변수 영향을 받음
