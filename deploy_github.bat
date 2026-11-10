@echo off
chcp 65001 > nul
echo ==============================================
echo  [바이브 코딩] GitHub Public 레포지토리 업로드 도우미
echo ==============================================
echo.
echo 1. Git 초기화 및 커밋 생성 중...
git init
git branch -M main
git add .
git commit -m "feat: 스마트 멀티 게시판 v2.0 완성 및 개발 보고서(DEVELOPMENT_REPORT.md) 추가"
echo.
echo ==============================================
echo  GitHub에서 생성하신 Public 레포지토리 주소를 붙여넣어주세요.
echo  (예: https://github.com/사용자이름/레포지토리이름.git)
echo ==============================================
set /p REPO_URL="GitHub Repository URL: "
if "%REPO_URL%"=="" (
    echo [오류] GitHub URL이 입력되지 않았습니다.
    pause
    exit /b
)

git remote remove origin 2>nul
git remote add origin %REPO_URL%
echo.
echo 2. GitHub에 푸시(Push) 중...
git push -u origin main

echo.
echo ==============================================
echo  업로드 성공! GitHub에 정상 반영되었습니다.
echo ==============================================
pause
