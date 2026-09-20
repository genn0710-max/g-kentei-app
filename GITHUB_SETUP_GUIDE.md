# G検定対策アプリ GitHub公開＆スマホ利用ガイド

本アプリは、**GitHub Pages** を利用することでサーバー代ゼロ・24時間365日いつでもスマホからアクセスして学習できます。また、**PWA（Progressive Web App）** に対応しているため、スマホの「ホーム画面に追加」することで地下鉄や機内などの**完全オフライン環境でも学習可能**です。

---

## 競合防止の重要ポイント
既存の別システムやGitHub Pagesと絶対に競合させないため、GitHub上でリポジトリを作成する際は**必ずプロジェクト固有の名前**（例: `g-kentei-app`）にしてください。
※ `genn0710-max.github.io` という名前は使用しないでください。

公開後のURLは以下のようになり、他アプリと完全に隔離されます：
```
https://genn0710-max.github.io/g-kentei-app/
```

---

## ステップ 1: GitHubで新しいリポジトリを作成

1. ブラウザで [GitHub - New Repository](https://github.com/new) を開きます。
2. 以下の項目を設定します：
   - **Repository name**: `g-kentei-app`（推奨）
   - **Description**: `G検定 完全対策マスター（200問・1問40秒・音声解説・PWA）`
   - **Public**（公開）を選択（※GitHub Pages無料利用のためPublic推奨）
   - 「Add a README file」「.gitignore」「license」のチェックは**すべて外したまま**にします。
3. **「Create repository」** をクリックします。

---

## ステップ 2: ローカルからGitHubへプッシュ

ターミナルを開き、以下のコマンドを順に実行してください：

```bash
cd "/Users/suzukikantoku/Desktop/名称未設定フォルダ 2/g-kentei-app"

# リモートリポジトリを登録（※リポジトリ名が g-kentei-app の場合）
git remote add origin https://github.com/genn0710-max/g-kentei-app.git

# メインブランチにプッシュ
git branch -M main
git push -u origin main
```

---

## ステップ 3: GitHub Pages（Web公開）を有効化

1. GitHubのリポジトリページ（`https://github.com/genn0710-max/g-kentei-app`）を開きます。
2. 上部メニューの **「Settings（設定）」** をクリック。
3. 左サイドバーの **「Pages」** をクリック。
4. **「Build and deployment」** の設定：
   - **Source**: `Deploy from a branch` を選択
   - **Branch**: `main` を選択し、フォルダは `/ (root)` のまま **「Save」** をクリック。
5. 1〜2分待ってページを再読み込みすると、上部に公開URLが表示されます：
   ```
   Your site is live at https://genn0710-max.github.io/g-kentei-app/
   ```

---

## ステップ 4: スマホでアクセス＆ホーム画面に追加（オフライン化）

### 📱 iPhone / iPad の場合 (Safari)
1. Safariで公開URL（`https://genn0710-max.github.io/g-kentei-app/`）を開きます。
2. 画面下部の中央にある **共有ボタン（四角から矢印が出ているアイコン）** をタップ。
3. メニューから **「ホーム画面に追加」** をタップ。
4. 右上の **「追加」** をタップ。
5. **ホーム画面に「G検定対策」の専用アプリアイコンが出現します！**
   - アドレスバーのないフルスクリーンで起動し、地下鉄のトンネル内や機内モードでもそのままサクサク解けます。

### 🤖 Android の場合 (Chrome)
1. Chromeで公開URLを開きます。
2. 右上のメニュー（︙）から **「ホーム画面に追加」** または **「アプリをインストール」** をタップ。
3. ネイティブアプリと同様にインストールされ、オフラインでも学習可能になります。

---

## データのバックアップと同期（手動追加した問題）
スマホの管理画面から登録したオリジナル問題は、スマホ内のブラウザ（LocalStorage）に自動保存されます。
「管理画面」の **📥 エクスポート** ボタンでJSONとしてダウンロードし、PCに送って **📤 インポート** することで、端末間で自由にお気に入り問題を持ち運ぶことができます。
