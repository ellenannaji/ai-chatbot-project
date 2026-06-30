from flask import Flask, request, Response, stream_with_context
from flask_cors import CORS
from openai import OpenAI
import json

app = Flask(__name__)
CORS(app)

client = OpenAI(api_key="YOUR_API_KEY_HERE")

chat_history = []

# 🔥 limit memory (important fix)
MAX_HISTORY = 20


def generate_stream(message):

    if not message:
        yield "data: {\"error\": \"Empty message\"}\n\n"
        return

    chat_history.append({"role": "user", "content": message})

    # keep only last messages (prevents memory overflow)
    global chat_history
    chat_history = chat_history[-MAX_HISTORY:]

    try:
        stream = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                *chat_history
            ],
            stream=True
        )

        full_response = ""

        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                token = chunk.choices[0].delta.content
                full_response += token

                yield f"data: {json.dumps({'token': token})}\n\n"

        chat_history.append({"role": "assistant", "content": full_response})

        yield "data: [DONE]\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    message = data.get("message", "")

    return Response(
        stream_with_context(generate_stream(message)),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )


if __name__ == "__main__":
    app.run(debug=True, threaded=True)