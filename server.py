#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
G検定対策 完全スタンドアローンHTTP & APIサーバー
- 外部ライブラリ一切不要（Python 3標準ライブラリのみで動作）
- 未使用ポート自動検出（デフォルト: 8765）
- 手動問題追加・即時JSON反映・CRUD対応
"""

import http.server
import socketserver
import json
import os
import sys
import socket
import urllib.parse
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
PUBLIC_DIR = BASE_DIR

DEFAULT_PORT = 8765

def get_free_port(start_port=DEFAULT_PORT, max_attempts=100):
    """未使用の空きポートを探索して返す"""
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError(f"利用可能なポートが {start_port}〜{start_port + max_attempts} の間に見つかりませんでした。")

def load_json(filepath, default_val=None):
    if not filepath.exists():
        return default_val if default_val is not None else []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[Error] Failed to read {filepath}: {e}", file=sys.stderr)
        return default_val if default_val is not None else []

def save_json(filepath, data):
    tmp_path = filepath.with_suffix(".tmp")
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp_path, filepath)

class GKenteiRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC_DIR), **kwargs)

    def log_message(self, format, *args):
        # 簡易ログ表示
        sys.stdout.write(f"[{datetime.now().strftime('%H:%M:%S')}] {format % args}\n")

    def send_json_response(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/"):
            self.handle_api_get(path, parsed.query)
            return

        # ルートアクセスの場合は index.html を返す
        if path == "/" or path == "":
            self.path = "/index.html"

        super().do_GET()

    def handle_api_get(self, path, query_str):
        q_file = DATA_DIR / "questions.json"
        t_file = DATA_DIR / "terms.json"
        c_file = DATA_DIR / "categories.json"

        if path == "/api/status":
            questions = load_json(q_file, [])
            terms = load_json(t_file, [])
            self.send_json_response({
                "status": "ok",
                "server": "G-Kentei Standalone Server",
                "port": self.server.server_address[1],
                "questions_count": len(questions),
                "terms_count": len(terms),
                "timestamp": datetime.now().isoformat()
            })
            return

        if path == "/api/categories":
            categories = load_json(c_file, [])
            self.send_json_response(categories)
            return

        if path == "/api/questions":
            questions = load_json(q_file, [])
            # クエリパラメータによるフィルタ
            params = urllib.parse.parse_qs(query_str)
            category = params.get("category", [None])[0]
            if category and category != "all":
                questions = [q for q in questions if q.get("category") == category]
            self.send_json_response(questions)
            return

        if path == "/api/terms":
            terms = load_json(t_file, [])
            params = urllib.parse.parse_qs(query_str)
            category = params.get("category", [None])[0]
            if category and category != "all":
                terms = [t for t in terms if t.get("category") == category]
            self.send_json_response(terms)
            return

        self.send_json_response({"error": "Endpoint not found"}, status=404)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_len = int(self.headers.get("Content-Length", 0))
        post_body = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"

        try:
            payload = json.loads(post_body)
        except json.JSONDecodeError:
            self.send_json_response({"error": "不正なJSONリクエストです"}, status=400)
            return

        if path == "/api/questions":
            self.handle_add_question(payload)
            return
        elif path == "/api/terms":
            self.handle_add_term(payload)
            return

        self.send_json_response({"error": "Endpoint not found"}, status=404)

    def handle_add_question(self, payload):
        # 必須項目バリデーション
        required = ["question", "choices", "answer", "explanation", "category"]
        for key in required:
            if key not in payload or payload[key] is None or payload[key] == "":
                self.send_json_response({"error": f"必須項目が不足しています: {key}"}, status=400)
                return

        if not isinstance(payload["choices"], list) or len(payload["choices"]) < 2:
            self.send_json_response({"error": "選択肢は2つ以上必要です"}, status=400)
            return

        try:
            ans_idx = int(payload["answer"])
            if ans_idx < 0 or ans_idx >= len(payload["choices"]):
                self.send_json_response({"error": "正解の選択肢番号が範囲外です"}, status=400)
                return
        except ValueError:
            self.send_json_response({"error": "正解番号は数値で指定してください"}, status=400)
            return

        q_file = DATA_DIR / "questions.json"
        questions = load_json(q_file, [])

        # 自動ID生成
        now_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        new_id = f"q_m_{now_str}"

        new_question = {
            "id": payload.get("id") or new_id,
            "category": payload["category"].strip(),
            "question": payload["question"].strip(),
            "choices": [c.strip() for c in payload["choices"] if c.strip()],
            "answer": ans_idx,
            "explanation": payload["explanation"].strip(),
            "source": payload.get("source", "手動登録").strip() or "手動登録",
            "createdAt": datetime.now().strftime("%Y-%m-%d")
        }

        # 既存IDなら上書き、なければ先頭に追加（手動登録がすぐ見えるように）
        exists_idx = next((i for i, q in enumerate(questions) if q["id"] == new_question["id"]), None)
        if exists_idx is not None:
            questions[exists_idx] = new_question
        else:
            questions.insert(0, new_question)

        save_json(q_file, questions)
        self.send_json_response({
            "message": "問題が正常に登録・反映されました",
            "question": new_question,
            "total_questions": len(questions)
        }, status=201)

    def handle_add_term(self, payload):
        required = ["term", "summary", "category"]
        for key in required:
            if key not in payload or not payload[key]:
                self.send_json_response({"error": f"必須項目が不足しています: {key}"}, status=400)
                return

        t_file = DATA_DIR / "terms.json"
        terms = load_json(t_file, [])

        now_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        new_term = {
            "id": f"t_m_{now_str}",
            "term": payload["term"].strip(),
            "category": payload["category"].strip(),
            "importance": int(payload.get("importance", 3)),
            "summary": payload["summary"].strip(),
            "details": payload.get("details", "").strip()
        }

        terms.insert(0, new_term)
        save_json(t_file, terms)
        self.send_json_response({
            "message": "用語が正常に登録されました",
            "term": new_term,
            "total_terms": len(terms)
        }, status=201)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/questions/"):
            q_id = path.replace("/api/questions/", "").strip()
            q_file = DATA_DIR / "questions.json"
            questions = load_json(q_file, [])

            filtered = [q for q in questions if q.get("id") != q_id]
            if len(filtered) == len(questions):
                self.send_json_response({"error": "指定された問題が見つかりません"}, status=404)
                return

            save_json(q_file, filtered)
            self.send_json_response({
                "message": f"問題 {q_id} を削除しました",
                "remaining_count": len(filtered)
            })
            return

        self.send_json_response({"error": "Endpoint not found"}, status=404)

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

def run():
    target_port = get_free_port(DEFAULT_PORT)
    server_address = ("127.0.0.1", target_port)

    with ReusableTCPServer(server_address, GKenteiRequestHandler) as httpd:
        url = f"http://localhost:{target_port}"
        print("=" * 60)
        print("  G検定対策 完全スタンドアローン学習システム")
        print("=" * 60)
        print(f"  ● サーバー起動中: {url}")
        print(f"  ● データ格納先:   {DATA_DIR}")
        print(f"  ● 他アプリ・ポートとの競合なし（独立ポート: {target_port}）")
        print("=" * 60)
        print("  ブラウザで上記URLを開いてご利用ください。")
        print("  終了するには [Ctrl + C] を押してください。\n")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nサーバーを停止しました。")

if __name__ == "__main__":
    run()
