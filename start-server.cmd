@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [오류] Node.js 가 PATH 에 없습니다. https://nodejs.org 에서 LTS 를 설치하세요.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo node_modules 가 없습니다. 의존성 설치 중...
  call npm install
  if errorlevel 1 (
    echo [오류] npm install 실패
    pause
    exit /b 1
  )
)

if not exist ".env" (
  echo [안내] .env 가 없으면 .env.example 을 복사해 .env 로 저장한 뒤 수정하세요.
  echo.
)

echo Crain 백엔드 시작 ^(종료: Ctrl+C^) ...
echo.
node index.js
set EXITCODE=%ERRORLEVEL%
if %EXITCODE% neq 0 (
  echo.
  echo [오류] 종료 코드 %EXITCODE%
  pause
)
exit /b %EXITCODE%
