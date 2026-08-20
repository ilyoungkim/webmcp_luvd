#!/usr/bin/env bash
# ============================================================================
# deploy_genisev.sh — genisev 프론트 파일을 원격 서버(192.168.31.136)에 배포
# ============================================================================
# 사용법:
#   ./deploy_genisev.sh
#
# 동작:
#   1) 로컬 webmcp/front 의 genisev 관련 파일을 서버 /tmp 로 scp
#   2) 서버에서 sudo 로 /usr/share/nginx/webmcp/ 에 복사
#   3) sudo 비밀번호는 대화식으로 입력 (ssh -t 로 TTY 할당)
# ============================================================================
set -euo pipefail

SERVER="tensun@192.168.31.136"
WEB_ROOT="/usr/share/nginx/webmcp"
LOCAL_DIR="$(cd "$(dirname "$0")/webmcp/front" && pwd)"

# 배포할 파일 목록
FILES=(
  genisev-config.js
  genisev.html
  webmcp-widget.js
  webmcp.js
  widget.js
  widget.css
)

echo "==> [1/2] 로컬 → 서버 /tmp 로 복사"
scp "${FILES[@]/#/$LOCAL_DIR/}" "$SERVER:/tmp/"

echo "==> [2/2] 서버 웹 루트($WEB_ROOT)로 sudo 복사 (비밀번호 입력 필요)"
# ssh -t 로 TTY 를 할당해 sudo 가 비밀번호를 대화식으로 물어보게 함
ssh -t "$SERVER" "sudo cp /tmp/${FILES[0]} /tmp/${FILES[1]} /tmp/${FILES[2]} /tmp/${FILES[3]} /tmp/${FILES[4]} /tmp/${FILES[5]} $WEB_ROOT/"

echo ""
echo "==> 완료! 접속: http://192.168.31.136:8081/genisev.html"
