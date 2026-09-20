#!/bin/bash
# G検定学習システム 起動スクリプト
cd "$(dirname "$0")"

echo "================================================="
echo " G検定 スタンドアローン学習アプリを起動しています..."
echo "================================================="

# Python3の存在確認
if ! command -v python3 &> /dev/null; then
    echo "エラー: python3 が見つかりませんでした。"
    exit 1
fi

# サーバー起動 (バックグラウンドで起動してブラウザを開く)
python3 server.py &
SERVER_PID=$!

sleep 1
# ブラウザを開く
open "http://localhost:8765" 2>/dev/null || true

# プロセスの終了を待機 (Ctrl+C で両方終了)
trap "kill $SERVER_PID 2>/dev/null; exit" SIGINT SIGTERM
wait $SERVER_PID
