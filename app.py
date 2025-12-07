from flask import Flask, request, jsonify, send_from_directory, render_template
import os
import requests
import json

app = Flask(__name__, static_folder="static", static_url_path="/static")

# ===== Настройки DeepSeek =====
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_API_KEY = "sk-1e007e4aa1534fd98f7d6316fd90ed3f"  # вставь сюда свой ключ DeepSeek

# переменная, чтобы понимать — первый ли это запрос
first_request_done = False


@app.route("/")
def index():
        return render_template("index.html")


@app.route("/generate", methods=["POST"])
def generate():
    global first_request_done

    data = request.get_json(force=True)
    command = data.get("text", "").strip()
    current_html = data.get("html", "")
    current_css = data.get("css", "")

    if not command:
        return jsonify({"error": "Empty text"}), 400
    if not DEEPSEEK_API_KEY:
        return jsonify({"error": "DeepSeek API key not set"}), 400

    # 🧠 Выбираем модель
    if not first_request_done:
        model = "deepseek-reasoner"
        first_request_done = True
    else:
        model = "deepseek-chat"

    system_prompt = (
        """Ты — ассистент для голосового редактирования HTML и CSS внутри песочницы.
На вход ты получаешь:
1. Текущий HTML-код (только содержимое <body>).
2. Текущий CSS-код.
3. Команду пользователя (в свободной форме).

⚙️ Правила:
- Не добавляй <!DOCTYPE>, <html>, <head>, <body>.
- Измени только HTML и CSS, ничего лишнего.
- Возвращай строго JSON:

{
  "html": "<только внутренний контент HTML>",
  "css": "<весь CSS>"
}

Без комментариев, текста и пояснений."""
    )

    user_prompt = (
        f"Текущий HTML:\n{current_html}\n\n"
        f"Текущий CSS:\n{current_css}\n\n"
        f"Команда пользователя:\n{command}"
    )

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2
    }

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    try:
        r = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload, timeout=90)
        r.raise_for_status()
        result = r.json()

        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        try:
            parsed = json.loads(content)
            html = parsed.get("html", current_html)
            css = parsed.get("css", current_css)
        except:
            html = content
            css = current_css

        return jsonify({"html": html, "css": css, "raw": content, "model_used": model})
    except Exception as e:
        return jsonify({"error": str(e)}), 502


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

