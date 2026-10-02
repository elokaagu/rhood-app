const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function loadContentFilter() {
  const src = fs
    .readFileSync(path.join(__dirname, "../lib/contentFilter.js"), "utf8")
    .replace(/^export\s+/gm, "");
  const factory = new Function(
    `${src}\nreturn { containsObjectionableContent, assertAllowedText, OBJECTIONABLE_CONTENT_CODE };`
  );
  return factory();
}

const { containsObjectionableContent, assertAllowedText, OBJECTIONABLE_CONTENT_CODE } =
  loadContentFilter();

test("allows normal DJ chat and profile text", () => {
  for (const text of [
    "Great set last night, the drop at 3am was unreal",
    "Deep house and techno selector from Amsterdam",
    "Pakistan tour dates coming soon",
    "Raccoon City warehouse party",
    "Grapes and spice rack",
    "",
    null,
  ]) {
    assert.equal(containsObjectionableContent(text), false, String(text));
  }
});

test("blocks slurs and explicit abuse, including simple obfuscation", () => {
  for (const text of ["you're a f4gg0t", "KYS", "kill yourself", "go away r3tard", "rapists"]) {
    assert.equal(containsObjectionableContent(text), true, text);
  }
});

test("assertAllowedText throws a coded error only when something is blocked", () => {
  assert.doesNotThrow(() => assertAllowedText("Soul selecta", undefined, "DJ from London"));
  assert.throws(
    () => assertAllowedText("fine", "kill yourself"),
    (error) => error.code === OBJECTIONABLE_CONTENT_CODE
  );
});
