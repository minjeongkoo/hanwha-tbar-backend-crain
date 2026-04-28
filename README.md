# hanwha-tbar-backend-crane

크레인 라인용 Node.js 백엔드 (Express, Realm, Edge API 프록시).

## 요구 사항

- Node.js **18 이상** (LTS 권장)
- Windows / macOS / Linux 공통

## Windows에서 실행

1. 이 폴더를 PC에 둔 뒤, **명령 프롬프트** 또는 **PowerShell**에서:

   ```bat
   cd 경로\hanwha-tbar-backend-crane
   notepad .env
   npm install
   npm start
   ```
   (`notepad .env` 로 새 파일을 만들거나, 편집기로 `.env` 를 직접 만든 뒤 `REALM_PATH`, `EDGE_API_BASE_URL` 등을 넣습니다.)

2. 또는 **`start-server.cmd`** 를 더블클릭  
   - 최초 실행 시 `node_modules` 가 없으면 `npm install` 을 자동 실행합니다.  
   - Node가 PATH에 잡혀 있어야 합니다.

3. **`.env` 예시 (Windows 경로)**  
   - Realm 절대 경로: `REALM_PATH=C:\앱데이터\crane.realm`  
   - 프로젝트 기준 상대 경로: `REALM_PATH=data\crane.realm`  
   - Edge 주소: `EDGE_API_BASE_URL=http://127.0.0.1:3000`

4. 서버 주소: `http://localhost:3001` (기본 `PORT=3001`)

5. 방화벽에서 해당 포트를 허용해야 다른 PC에서 접속할 수 있습니다.

## macOS / Linux

```bash
# .env 를 이 폴더에 만들고 REALM_PATH, EDGE_API_BASE_URL 등 설정
npm install
npm start
```

## API

- `GET /` — 서비스 정보
- `GET /api/health` — 헬스체크
- `POST /api/client/operation/getWorkList` — Edge `POST /api/client/operation/getWorkList` 프록시

`npm run dev` — 소스 변경 시 자동 재시작 (`node --watch`).
