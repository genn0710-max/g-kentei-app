#!/bin/bash
# ================================================================
#  G検定対策アプリ GitHub Pages 送信スクリプト
# ================================================================

set -e
cd "$(dirname "$0")"

echo "================================================================"
echo "  🚀 G検定対策アプリ GitHub Pages 送信プログラム"
echo "================================================================"
echo ""
echo "Personal Access Token（個人用トークン）を使用して送信します。"
echo "※ まだ発行していない場合は、ブラウザで以下を開いて発行してください："
echo "👉 https://github.com/settings/tokens/new?scopes=repo&description=g-kentei-app"
echo ""

# クリップボード自動判定
CLIP_VAL=$(pbpaste 2>/dev/null | tr -d '\r\n ' || true)

if [[ "$CLIP_VAL" =~ ^(ghp_|github_pat_) ]]; then
  echo "📋 クリップボードからトークンを自動検出しました！"
  echo "   [ ${CLIP_VAL:0:10}******************** ]"
  echo ""
  read -p "このトークンを使用しますか？ [Enterでそのまま使用 / 別のトークンを手動入力]: " USER_INPUT
  if [[ -z "$USER_INPUT" || "$USER_INPUT" =~ ^[Yy] ]]; then
    GITHUB_TOKEN="$CLIP_VAL"
  else
    GITHUB_TOKEN="$USER_INPUT"
  fi
else
  echo "【貼り付け方法】"
  echo "  1. GitHub画面でトークンをコピー（Command ⌘ + C）"
  echo "  2. この画面でペースト（Command ⌘ + V）して Enterキー を押す"
  echo "     ※コピーした状態でそのまま Enterキー を押すだけでも自動認識します"
  echo ""
  read -p "GitHubトークン: " GITHUB_TOKEN
  if [[ -z "$GITHUB_TOKEN" ]]; then
    CLIP_RETRY=$(pbpaste 2>/dev/null | tr -d '\r\n ' || true)
    if [[ "$CLIP_RETRY" =~ ^(ghp_|github_pat_) ]]; then
      GITHUB_TOKEN="$CLIP_RETRY"
      echo "📋 クリップボードのトークンを自動適用しました！"
    fi
  fi
fi

if [[ -z "$GITHUB_TOKEN" ]]; then
  echo "⚠️ トークンが入力されませんでした。処理を中断します。"
  exit 1
fi

echo ""
echo "🚀 GitHubへ送信（プッシュ）中..."
git remote set-url origin "https://${GITHUB_TOKEN}@github.com/genn0710-max/g-kentei-app.git"

if git push origin main --tags; then
  git remote set-url origin "https://github.com/genn0710-max/g-kentei-app.git"
  echo ""
  echo "================================================================"
  echo "  🎉 おめでとうございます！GitHubへのプッシュが成功しました！"
  echo "================================================================"
  echo ""
  echo "公開URL: https://genn0710-max.github.io/g-kentei-app/"
  open "https://genn0710-max.github.io/g-kentei-app/" 2>/dev/null || true
else
  git remote set-url origin "https://github.com/genn0710-max/g-kentei-app.git"
  echo "❌ 送信に失敗しました。トークンの有効期限や権限（repo）をご確認ください。"
  exit 1
fi
