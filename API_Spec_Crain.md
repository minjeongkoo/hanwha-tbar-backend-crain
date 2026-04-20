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
  "crainId": "1507",
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

응답 스키마는 `GET /api/client/plc/crain1507`와 동일하며, `crainId`/`target` 기본값만 `1505`/`crain1505`로 동작합니다.

#### Error 503 (`REALM_CLOSED`)

`GET /api/client/plc/crain1507`와 동일한 에러 포맷

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

- 운영 모드는 **Agent App이 Realm 파일을 갱신**하고, Crain 서버는 **Realm 조회 API** 역할만 수행합니다. (OPC UA 직접 통신 기능은 Crain 서버에서 제거됨)
- 권장 설정: `CRAIN_STRICT_PLC_ID=true`
- `target` 값 및 내부 필터 기준은 `CRAIN_PLC_ID` 환경변수 영향을 받습니다.
