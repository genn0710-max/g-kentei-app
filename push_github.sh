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
echo "トークンをお持ちでない場合はこちらから発行できます（権限: repo）："
echo "👉 https://github.com/settings/tokens/new?scopes=repo&description=g-kentei-app"
echo ""
read -p "GitHubのトークン（ghp_...）を貼り付けてEnterを押してください: " GITHUB_TOKEN

if [[ -z "$GITHUB_TOKEN" ]]; then
  echo "⚠️ トークンが入力されませんでした。処理を中断します。"
  exit 1
fi

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
  echo "❌ 送信に失敗しました。トークンの権限（repo）をご確認ください。"
  exit 1
fi
