# app.py
import os
import re
import json
import threading
from pathlib import Path
from flask import Flask, request, jsonify, Response, send_from_directory
from flask_cors import CORS
from cerebras.cloud.sdk import Cerebras

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Global state for broadcasting updates to frontend
update_listeners = []
update_lock = threading.Lock()

# --- Cerebras client ---
# API key from CEREBRAS_API_KEY env var (set in .env or shell)
client = Cerebras(api_key=os.environ.get("CEREBRAS_API_KEY"))

# MODEL_NAME = "gpt-oss-120b"
MODEL_NAME = "zai-glm-4.6"

# Load Cerebras system instruction from prompts.json
PROMPTS_FILE = Path(__file__).parent / "prompts.json"
CEREBRAS_SYSTEM_INSTRUCTION = None
try:
    with open(PROMPTS_FILE, "r", encoding="utf-8") as f:
        PROMPTS = json.load(f)
    CEREBRAS_SYSTEM_INSTRUCTION = PROMPTS.get("cerebras", {}).get("system_instruction")
    if CEREBRAS_SYSTEM_INSTRUCTION:
        print(f"[CEREBRA] Loaded system instruction from {PROMPTS_FILE}")
    else:
        print(f"[CEREBRA] No system instruction found in prompts.json")
except Exception as e:
    print(f"[CEREBRA] Warning: Could not load prompts.json: {e}")

def extract_html_if_present(text: str):
    """
    Detect common HTML responses:
    - Raw HTML (<html> ... or leading tags)
    - Fenced code blocks ```html ... ```
    Returns (is_html: bool, content: str)
    """
    if not text:
        return False, text

    # 1) Fenced ```html blocks
    fence = re.search(r"```html\s*(.*?)\s*```", text, flags=re.DOTALL | re.IGNORECASE)
    if fence:
        return True, fence.group(1).strip()

    # 2) Any fenced code block labeled as 'htm' or 'xml' (fallback)
    fence_alt = re.search(r"```(htm|xml)\s*(.*?)\s*```", text, flags=re.DOTALL | re.IGNORECASE)
    if fence_alt:
        return True, fence_alt.group(2).strip()

    # 3) Raw HTML heuristic
    snippet = text.strip().lower()
    if "<html" in snippet or snippet.startswith("<!doctype html"):
        return True, text
    # Common case: returns a fragment like <div>...</div> or <style>...</style>
    if snippet.startswith("<") and "</" in snippet:
        return True, text

    return False, text

# ---------------- React frontend serving (if built) ----------------
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "frontend", "dist")
ASSETS_DIR = os.path.join(FRONTEND_DIST, "assets")

@app.route("/")
def index():
    """Serve React index if built; otherwise show a simple message with instructions."""
    index_html = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_html):
        return send_from_directory(FRONTEND_DIST, "index.html")
    # Fallback message (React not built yet)
    return (
        "<html><body style='font-family: system-ui'>"
        "<h3>React frontend not built.</h3>"
        "<p>Run <code>npm install</code> then <code>npm run dev</code> inside <code>frontend/</code> for development, "
        "or <code>npm run build</code> to serve the built app here.</p>"
        "</body></html>"
    )

@app.route("/assets/<path:path>")
def serve_assets(path: str):
    if os.path.exists(os.path.join(ASSETS_DIR, path)):
        return send_from_directory(ASSETS_DIR, path)
    return ("Not Found", 404)

# ---------------- API ----------------
@app.route("/api/chat", methods=["POST"])
def api_chat():
    """
    Accepts: { messages: [{role, content}, ...] }
    Returns JSON:
      - { type: "text", content: "...plain text..." }
      - { type: "html", content: "<!doctype html>..." }
    Each request is stateless - no conversation history is maintained.
    Only the current user message is processed.
    If the model streams, we accumulate and then decide how to render.
    """
    data = request.get_json(force=True)
    messages = data.get("messages") or []
    
    # Ensure stateless behavior: only use the last user message
    # Extract the most recent user message if multiple messages are sent
    user_message = None
    system_message = None
    
    # Check if there's already a system message in the request
    for msg in messages:
        if msg.get("role") == "system":
            system_message = msg.get("content", "")
            break
    
    # Extract user message
    for msg in reversed(messages):
        if msg.get("role") == "user":
            user_message = msg.get("content", "")
            break
    
    # If no user message found, use the last message's content
    if not user_message and messages:
        user_message = messages[-1].get("content", "")
    
    # Create a fresh messages array with system instruction and current user prompt
    # This ensures no conversation history is maintained
    stateless_messages = []
    
    # Add system instruction if available (from prompts.json or from request)
    system_instruction = system_message or CEREBRAS_SYSTEM_INSTRUCTION
    if system_instruction:
        stateless_messages.append({
            "role": "system",
            "content": system_instruction
        })
    
    # Add user message
    stateless_messages.append({
        "role": "user",
        "content": user_message if user_message else ""
    })

    # Call Cerebras with streaming; accumulate content
    # Each call is independent with no conversation history
    stream = client.chat.completions.create(
        messages=stateless_messages,
        model=MODEL_NAME,
        stream=True,
        max_completion_tokens=2048,
        temperature=0.7,
        top_p=1,
        # reasoning_effort="medium",
    )

    full_text = []
    for chunk in stream:
        delta = getattr(chunk.choices[0].delta, "content", None)
        if delta:
            full_text.append(delta)

    text = "".join(full_text).strip()
    is_html, content = extract_html_if_present(text)

    if is_html:
        return jsonify({"type": "html", "content": content})
    else:
        return jsonify({"type": "text", "content": text})

@app.route("/api/chat/stream", methods=["POST"])
def api_chat_stream():
    """
    Server-Sent Events streaming endpoint.
    Emits events of the form:
      data: {"type":"delta","content":"..."}
      ...
      data: {"type":"done","output_type":"text|html","content":"..."}
    Each request is stateless - no conversation history is maintained.
    """
    data = request.get_json(force=True)
    messages = data.get("messages") or []
    
    # Ensure stateless behavior: only use the last user message
    user_message = None
    system_message = None
    
    # Check if there's already a system message in the request
    for msg in messages:
        if msg.get("role") == "system":
            system_message = msg.get("content", "")
            break
    
    # Extract user message
    for msg in reversed(messages):
        if msg.get("role") == "user":
            user_message = msg.get("content", "")
            break
    
    if not user_message and messages:
        user_message = messages[-1].get("content", "")
    
    # Create a fresh messages array with system instruction and current user prompt
    stateless_messages = []
    
    # Add system instruction if available (from prompts.json or from request)
    system_instruction = system_message or CEREBRAS_SYSTEM_INSTRUCTION
    if system_instruction:
        stateless_messages.append({
            "role": "system",
            "content": system_instruction
        })
    
    # Add user message
    stateless_messages.append({
        "role": "user",
        "content": user_message if user_message else ""
    })

    def generate():
        # Each call is independent with no conversation history
        stream = client.chat.completions.create(
            messages=stateless_messages,
            model=MODEL_NAME,
            stream=True,
            max_completion_tokens=2048,
            temperature=0.7,
            top_p=1,
            # reasoning_effort="medium",
        )
        full_text_parts = []
        try:
            for chunk in stream:
                delta = getattr(chunk.choices[0].delta, "content", None)
                if not delta:
                    continue
                full_text_parts.append(delta)
                payload = {"type": "delta", "content": delta}
                yield f"data: {json.dumps(payload)}\n\n"
        finally:
            # After stream completes (or in case of interruption), send final classification
            text = "".join(full_text_parts).strip()
            is_html, content = extract_html_if_present(text)
            payload = {
                "type": "done",
                "output_type": "html" if is_html else "text",
                "content": content if is_html else text,
            }
            yield f"data: {json.dumps(payload)}\n\n"

    headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive",
    }
    return Response(generate(), mimetype="text/event-stream", headers=headers)

# ---------------- Update Broadcast System ----------------
def broadcast_update(update_data):
    """Broadcast update to all connected listeners."""
    print(f"[BROADCAST] Broadcasting update: type={update_data.get('type')}, content_length={len(update_data.get('content', ''))}")
    with update_lock:
        print(f"[BROADCAST] Number of listeners: {len(update_listeners)}")
        disconnected = []
        for listener in update_listeners:
            try:
                listener.put_nowait(update_data)
                print(f"[BROADCAST] Successfully sent to listener")
            except Exception as e:
                print(f"[BROADCAST] Error sending to listener: {e}")
                disconnected.append(listener)
        # Remove disconnected listeners
        for listener in disconnected:
            if listener in update_listeners:
                update_listeners.remove(listener)
        print(f"[BROADCAST] Remaining listeners: {len(update_listeners)}")

@app.route("/api/update", methods=["POST"])
def api_update():
    """
    Endpoint for voice assistant to push updates.
    Accepts: { type: "html"|"text", content: "..." }
    """
    data = request.get_json(force=True)
    update_type = data.get("type", "text")
    content = data.get("content", "")
    
    print(f"[API] Received update request: type={update_type}, content_length={len(content)}")
    
    broadcast_update({
        "type": update_type,
        "content": content,
    })
    
    return jsonify({"status": "ok", "message": "Update broadcasted"})

@app.route("/api/updates/stream")
def api_updates_stream():
    """
    Server-Sent Events endpoint for frontend to listen to updates.
    """
    import queue
    update_queue = queue.Queue()
    
    print(f"[SSE] New client connected to updates stream")
    with update_lock:
        update_listeners.append(update_queue)
        print(f"[SSE] Total listeners: {len(update_listeners)}")
    
    def generate():
        try:
            while True:
                try:
                    update = update_queue.get(timeout=30)
                    print(f"[SSE] Sending update to client: type={update.get('type')}")
                    yield f"data: {json.dumps(update)}\n\n"
                except queue.Empty:
                    # Send keepalive
                    yield f": keepalive\n\n"
        finally:
            print(f"[SSE] Client disconnected")
            with update_lock:
                if update_queue in update_listeners:
                    update_listeners.remove(update_queue)
                    print(f"[SSE] Remaining listeners: {len(update_listeners)}")
    
    headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive",
        "Content-Type": "text/event-stream",
    }
    return Response(generate(), mimetype="text/event-stream", headers=headers)

# Optional: simple health check
@app.route("/health")
def health():
    return jsonify({"ok": True})

if __name__ == "__main__":
    # Using port 5001 because port 5000 is often used by macOS AirPlay Receiver
    app.run(host="127.0.0.1", port=5001, debug=True)