from pathlib import Path

p = Path('backend/app.py')
s = p.read_text(encoding='utf-8')

needle = 'def telegram_api(method: str, payload: dict):\n'
start = s.rfind(needle)
end = s.find('\n\ndef notify_owner_new_booking', start)
if start < 0 or end < 0:
    raise SystemExit('Final telegram_api function not found')

new_func = '''def telegram_api(method: str, payload: dict):
    """Telegram Bot API helper with Bookly-selected notification language."""
    if not BOT_TOKEN:
        return None

    if method == "sendMessage" and isinstance(payload, dict) and payload.get("chat_id"):
        payload = dict(payload)
        chat_id = int(payload["chat_id"])
        request_lang = BOOKLY_REQUEST_LANGUAGE.get()
        request_user_id = BOOKLY_REQUEST_USER_ID.get()
        effective_lang = (
            request_lang
            if request_lang and request_user_id == chat_id
            else _bookly_user_language(chat_id)
        )
        payload["text"] = _bookly_localize_outgoing_text(
            str(payload.get("text", "")),
            effective_lang
        )

    data = json.dumps(payload).encode("utf-8")
    req = urllib_request.Request(
        f"https://api.telegram.org/bot{BOT_TOKEN}/{method}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib_request.urlopen(req, timeout=8) as response:
            return json.loads(response.read().decode("utf-8"))
    except (URLError, TimeoutError, ValueError):
        return None
'''

p.write_text(s[:start] + new_func.rstrip('\n') + s[end:], encoding='utf-8')
print('patched', p)
