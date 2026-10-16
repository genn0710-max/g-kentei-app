#!/bin/bash
# ================================================================
#  G検定対策アプリ GitHub Pages 確実送信スクリプト (v5.1)
# ================================================================

cd "$(dirname "$0")"

echo "================================================================"
echo "  🚀 G検定対策アプリ GitHub Pages 送信プログラム (v5.1)"
echo "================================================================"
echo ""
echo "GitHubは通常のパスワード入力を廃止しているため、"
echo "「Personal Access Token（個人用トークン: ghp_...）」が必要です。"
echo ""
echo "トークンをまだお持ちでない場合は、以下のURLから1分で発行できます："
echo "👉 https://github.com/settings/tokens/new?scopes=repo&description=g-kentei-app"
echo ""

# クリップボード自動判定
CLIP_VAL=$(pbpaste 2>/dev/null | tr -d '\r\n ' || true)

if [[ "$CLIP_VAL" =~ ^(ghp_|github_pat_) ]]; then
  echo "📋 クリップボードからトークンを自動検出しました！"
  echo "   [ ${CLIP_VAL:0:10}******************** ]"
  echo ""
  read -p "このトークンで送信しますか？ [Enterキーで送信 / 別のトークンを入力]: " USER_INPUT
  if [[ -z "$USER_INPUT" || "$USER_INPUT" =~ ^[Yy] ]]; then
    GITHUB_TOKEN="$CLIP_VAL"
  else
    GITHUB_TOKEN="$USER_INPUT"
  fi
else
  echo "【貼り付け方法】"
  echo "  1. GitHubで発行したトークン（ghp_...）をコピー（Command ⌘ + C）"
  echo "  2. この画面でペースト（Command ⌘ + V）して Enterキー を押す"
  echo ""
  read -p "GitHubトークン: " GITHUB_TOKEN
fi

if [[ -z "$GITHUB_TOKEN" ]]; then
  echo ""
  echo "⚠️ トークンが入力されませんでした。処理を中断します。"
  echo "トークンをコピーしてから、もう一度実行してください。"
  echo ""
  read -p "Enterキーを押してウィンドウを閉じてください..."
  exit 1
fi

echo ""
echo "🚀 GitHubへ送信（プッシュ）中..."
git remote set-url origin "https://${GITHUB_TOKEN}@github.com/genn0710-max/g-kentei-app.git"

if git push origin main; then
  git remote set-url origin "https://github.com/genn0710-max/g-kentei-app.git"
  echo ""
  echo "================================================================"
  echo "  🎉 おめでとうございます！GitHubへの送信が100%成功しました！"
  echo "================================================================"
  echo ""
  echo "📱 公開URL:"
  echo "👉 https://genn0710-max.github.io/g-kentei-app/"
  echo ""
  echo "※ GitHub側の更新処理のため、Webサイトへの反映には約1〜2分かかります。"
  echo "※ 反映されない場合は、ブラウザでスーパーリロード（キャッシュクリア）をお試しください。"
  echo ""
  open "https://genn0710-max.github.io/g-kentei-app/" 2>/dev/null || true
else
  git remote set-url origin "https://github.com/genn0710-max/g-kentei-app.git"
  echo ""
  echo "❌ 送信に失敗しました。"
  echo "【考えられる原因】"
  echo "  1. 入力したトークンの有効期限が切れている、または誤っている"
  echo "  2. トークン作成時に「repo」のチェックが入っていない"
  echo "  3. 通常のGitHubアカウントパスワードを入力してしまっている"
  echo ""
fi

echo ""
read -p "Enterキーを押してウィンドウを閉じてください..."
