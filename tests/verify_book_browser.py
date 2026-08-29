import base64
import json
import time
import urllib.request
from pathlib import Path

import websocket

DEBUG = "http://127.0.0.1:9226"
PAGE_URL = "http://127.0.0.1:8766/"
OUT = Path(r"C:\Users\user\AppData\Local\hermes\cache\artifacts")
OUT.mkdir(parents=True, exist_ok=True)


def get_target():
    for _ in range(50):
        try:
            targets = json.load(urllib.request.urlopen(f"{DEBUG}/json", timeout=2))
            return next(t for t in targets if t.get("type") == "page")
        except Exception:
            time.sleep(0.2)
    raise RuntimeError("Headless Chrome target did not become ready")


target = get_target()
ws = websocket.create_connection(target["webSocketDebuggerUrl"], origin=DEBUG)
request_id = 0


def command(method, params=None):
    global request_id
    request_id += 1
    ws.send(json.dumps({"id": request_id, "method": method, "params": params or {}}))
    while True:
        reply = json.loads(ws.recv())
        if reply.get("id") == request_id:
            if "error" in reply:
                raise RuntimeError(reply["error"])
            return reply.get("result", {})


def evaluate(expression):
    result = command("Runtime.evaluate", {"expression": expression, "returnByValue": True, "awaitPromise": True})
    return result["result"].get("value")


def screenshot(name):
    data = command("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False})["data"]
    path = OUT / name
    path.write_bytes(base64.b64decode(data))
    return str(path)


def set_viewport(width, height, mobile=False):
    command("Emulation.setDeviceMetricsOverride", {
        "width": width, "height": height, "deviceScaleFactor": 1, "mobile": mobile,
    })


command("Page.enable")
command("Runtime.enable")
command("Log.enable")
command("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "no-preference"}]})
set_viewport(1440, 1050)
command("Page.navigate", {"url": PAGE_URL})
time.sleep(2)

cover = evaluate("""(() => ({
  ready: document.readyState,
  view: document.body.dataset.view,
  cover: !!document.querySelector('[data-open-book]'),
  bodyOverflow: getComputedStyle(document.body).overflow,
  scrollOverflow: document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth,
  toastHidden: document.querySelector('[data-toast]').hidden,
}))()""")
cover_shot = screenshot("chungwooyoung-book-cover-desktop.png")

evaluate("document.querySelector('[data-open-book]').click()")
time.sleep(1.35)
book = evaluate("""(() => ({
  view: document.body.dataset.view,
  status: document.querySelector('[data-page-status]').textContent.trim(),
  thumbs: document.querySelectorAll('.thumb-card').length,
  leftVisible: getComputedStyle(document.querySelector('[data-page-left]')).display !== 'none',
  nextDisabled: document.querySelector('[data-book-next]').disabled,
  bookWidth: document.querySelector('[data-book]').getBoundingClientRect().width,
  bookHeight: document.querySelector('[data-book]').getBoundingClientRect().height,
}))()""")
book_shot = screenshot("chungwooyoung-book-open-desktop.png")

evaluate("document.querySelector('[data-book-next]').click()")
time.sleep(0.4)
mid_turn_class = evaluate("document.querySelector('[data-book]').className")
time.sleep(0.5)
after_next = evaluate("document.querySelector('[data-page-status]').textContent.trim()")

command("Input.dispatchKeyEvent", {"type": "keyDown", "key": "ArrowLeft", "code": "ArrowLeft"})
command("Input.dispatchKeyEvent", {"type": "keyUp", "key": "ArrowLeft", "code": "ArrowLeft"})
time.sleep(0.9)
after_keyboard_prev = evaluate("document.querySelector('[data-page-status]').textContent.trim()")

evaluate("document.querySelector('.thumb-card').click()")
time.sleep(0.2)
lightbox = evaluate("""(() => ({
  open: !document.querySelector('[data-lightbox]').hidden,
  title: document.querySelector('[data-lightbox-title]').textContent,
  img: document.querySelector('[data-lightbox-image]').getAttribute('src')
}))()""")
evaluate("document.querySelector('[data-lightbox-close]').click()")

set_viewport(390, 844, True)
command("Page.reload", {"ignoreCache": True})
time.sleep(2)
evaluate("document.querySelector('[data-open-book]').click()")
time.sleep(1.25)
mobile = evaluate("""(() => ({
  view: document.body.dataset.view,
  status: document.querySelector('[data-page-status]').textContent.trim(),
  thumbs: document.querySelectorAll('.thumb-card').length,
  leftDisplay: getComputedStyle(document.querySelector('[data-page-left]')).display,
  scrollOverflow: document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth,
  bookWidth: document.querySelector('[data-book]').getBoundingClientRect().width,
  bookHeight: document.querySelector('[data-book]').getBoundingClientRect().height,
}))()""")
mobile_shot = screenshot("chungwooyoung-book-open-mobile.png")

assert cover["ready"] == "complete", cover
assert cover["view"] == "cover", cover
assert cover["cover"], cover
assert cover["bodyOverflow"] == "hidden", cover
assert not cover["scrollOverflow"], cover
assert cover["toastHidden"], cover
assert book["view"] == "book", book
assert book["status"].startswith("01 / "), book
assert int(book["status"].split("/")[1]) >= 2, book
assert book["thumbs"] == 8, book
assert book["leftVisible"], book
assert not book["nextDisabled"], book
assert "turning-next" in mid_turn_class, mid_turn_class
assert after_next.startswith("02 / "), after_next
assert after_keyboard_prev.startswith("01 / "), after_keyboard_prev
assert lightbox["open"], lightbox
assert lightbox["title"], lightbox
assert mobile["view"] == "book", mobile
assert mobile["status"].startswith("01 / "), mobile
assert int(mobile["status"].split("/")[1]) >= int(book["status"].split("/")[1]), mobile
assert mobile["thumbs"] == 4, mobile
assert mobile["leftDisplay"] == "none", mobile
assert not mobile["scrollOverflow"], mobile

print(json.dumps({
    "cover": cover,
    "book": book,
    "midTurnClass": mid_turn_class,
    "afterNext": after_next,
    "afterKeyboardPrev": after_keyboard_prev,
    "lightbox": lightbox,
    "mobile": mobile,
    "screenshots": {"cover": cover_shot, "book": book_shot, "mobile": mobile_shot},
}, ensure_ascii=False))
ws.close()
