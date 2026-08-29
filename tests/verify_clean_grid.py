import base64
import json
import os
import time
import urllib.request
from pathlib import Path

import websocket

DEBUG = "http://127.0.0.1:9227"
PAGE_URL = os.environ.get("GRID_PREVIEW_URL", "http://127.0.0.1:8766/")
OUT = Path(r"C:\Users\user\AppData\Local\hermes\cache\artifacts")
OUT.mkdir(parents=True, exist_ok=True)


def get_target():
    for _ in range(60):
        try:
            targets = json.load(urllib.request.urlopen(f"{DEBUG}/json", timeout=2))
            return next(target for target in targets if target.get("type") == "page")
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
    result = command("Runtime.evaluate", {
        "expression": expression,
        "returnByValue": True,
        "awaitPromise": True,
    })
    if "exceptionDetails" in result:
        raise RuntimeError(result["exceptionDetails"])
    return result["result"].get("value")


def set_viewport(width, height, mobile=False):
    command("Emulation.setDeviceMetricsOverride", {
        "width": width,
        "height": height,
        "deviceScaleFactor": 1,
        "mobile": mobile,
    })


def screenshot(name):
    encoded = command("Page.captureScreenshot", {
        "format": "png",
        "captureBeyondViewport": False,
    })["data"]
    path = OUT / name
    path.write_bytes(base64.b64decode(encoded))
    return str(path)


def wait_for_cards():
    for _ in range(80):
        state = evaluate("""(() => ({
          count: document.querySelectorAll('.photo-card').length,
          loaded: [...document.querySelectorAll('.photo-card img')]
            .filter((image) => image.complete && image.naturalWidth > 0).length,
        }))()""")
        if state["count"] == 72 and state["loaded"] >= 9:
            return
        time.sleep(0.15)
    raise AssertionError(f"Expected 72 cards and loaded images, found {state}")


command("Page.enable")
command("Runtime.enable")
set_viewport(1440, 1000)
command("Page.navigate", {"url": PAGE_URL})
time.sleep(1)
wait_for_cards()

desktop = evaluate("""(() => ({
  cards: document.querySelectorAll('.photo-card').length,
  pages: document.querySelectorAll('.grid-page').length,
  firstPageCards: document.querySelector('.grid-page').children.length,
  columns: getComputedStyle(document.querySelector('.grid-page')).gridTemplateColumns.split(' ').length,
  rows: getComputedStyle(document.querySelector('.grid-page')).gridTemplateRows.split(' ').length,
  portrait: document.querySelectorAll('.is-portrait').length,
  landscape: document.querySelectorAll('.is-landscape').length,
  horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
  background: getComputedStyle(document.body).backgroundColor,
  fit: getComputedStyle(document.querySelector('.photo-card img')).objectFit,
}))()""")
desktop_shot = screenshot("chungwooyoung-clean-grid-desktop.png")

evaluate("document.querySelector('.photo-card').click()")
time.sleep(0.25)
lightbox = evaluate("""(() => ({
  open: document.querySelector('[data-lightbox]').open,
  caption: document.querySelector('[data-lightbox-caption]').textContent,
  image: document.querySelector('[data-lightbox-image]').getAttribute('src'),
}))()""")
evaluate("document.querySelector('[data-lightbox-close]').click()")

set_viewport(390, 844, True)
command("Page.reload", {"ignoreCache": True})
time.sleep(1)
wait_for_cards()
mobile = evaluate("""(() => ({
  cards: document.querySelectorAll('.photo-card').length,
  firstPageCards: document.querySelector('.grid-page').children.length,
  columns: getComputedStyle(document.querySelector('.grid-page')).gridTemplateColumns.split(' ').length,
  rows: getComputedStyle(document.querySelector('.grid-page')).gridTemplateRows.split(' ').length,
  horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
  cardWidth: document.querySelector('.photo-card').getBoundingClientRect().width,
  headerHeight: document.querySelector('.site-header').getBoundingClientRect().height,
}))()""")
mobile_shot = screenshot("chungwooyoung-clean-grid-mobile.png")

assert desktop["cards"] == 72, desktop
assert desktop["pages"] == 5, desktop
assert desktop["firstPageCards"] == 15, desktop
assert desktop["columns"] == 5, desktop
assert desktop["rows"] == 3, desktop
assert desktop["portrait"] == 18, desktop
assert desktop["landscape"] == 54, desktop
assert not desktop["horizontalOverflow"], desktop
assert desktop["background"] == "rgb(255, 255, 255)", desktop
assert desktop["fit"] == "contain", desktop
assert lightbox["open"], lightbox
assert lightbox["caption"], lightbox
assert lightbox["image"], lightbox
assert mobile["cards"] == 72, mobile
assert mobile["firstPageCards"] == 15, mobile
assert mobile["columns"] == 3, mobile
assert mobile["rows"] == 5, mobile
assert not mobile["horizontalOverflow"], mobile
assert mobile["cardWidth"] > 110, mobile

print(json.dumps({
    "desktop": desktop,
    "lightbox": lightbox,
    "mobile": mobile,
    "screenshots": {"desktop": desktop_shot, "mobile": mobile_shot},
}, ensure_ascii=False))
ws.close()
