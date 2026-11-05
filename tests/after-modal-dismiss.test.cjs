const { describe, it, mock, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// lib/afterModalDismiss.js imports Platform from react-native; load it with a
// stand-in Platform so the OS branch can be exercised under node.
function loadWithPlatform(os) {
  const abs = path.join(__dirname, "..", "lib/afterModalDismiss.js");
  let src = fs.readFileSync(abs, "utf8");
  src = src.replace(/^import .+?;?\s*$/gm, "");
  src = src.replace(/export const (\w+)/g, "const $1");
  src = src.replace(/export function (\w+)/g, "function $1");
  src += "\nmodule.exports = { runAfterModalDismiss, IOS_MODAL_DISMISS_MS };\n";
  const mod = { exports: {} };
  new Function("module", "exports", "Platform", src)(mod, mod.exports, { OS: os });
  return mod.exports;
}

describe("runAfterModalDismiss", () => {
  afterEach(() => mock.timers.reset());

  it("on iOS, waits for the modal to finish closing before running", () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    const { runAfterModalDismiss, IOS_MODAL_DISMISS_MS } = loadWithPlatform("ios");
    const fn = mock.fn();

    runAfterModalDismiss(fn);
    // Opening the photo picker in the same tick as the close is what made
    // "Photo library" do nothing — it must not run synchronously.
    assert.equal(fn.mock.callCount(), 0);

    mock.timers.tick(IOS_MODAL_DISMISS_MS - 1);
    assert.equal(fn.mock.callCount(), 0);

    mock.timers.tick(1);
    assert.equal(fn.mock.callCount(), 1);
  });

  it("waits long enough to clear the iOS modal fade", () => {
    const { IOS_MODAL_DISMISS_MS } = loadWithPlatform("ios");
    assert.ok(IOS_MODAL_DISMISS_MS >= 400);
  });

  it("on Android, runs immediately", () => {
    const { runAfterModalDismiss } = loadWithPlatform("android");
    const fn = mock.fn();
    runAfterModalDismiss(fn);
    assert.equal(fn.mock.callCount(), 1);
  });

  it("ignores a missing handler", () => {
    const { runAfterModalDismiss } = loadWithPlatform("ios");
    assert.doesNotThrow(() => runAfterModalDismiss(undefined));
    assert.doesNotThrow(() => runAfterModalDismiss(null));
  });
});
