const fs = require("fs");
const path = require("path");
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

function loadExportedFunctions(relPath) {
  const abs = path.join(__dirname, "..", relPath);
  let src = fs.readFileSync(abs, "utf8");
  src = src.replace(/^import .+?;?\s*$/gm, "");
  const names = [];
  src = src.replace(/export const (\w+)/g, (_, name) => {
    names.push(name);
    return `const ${name}`;
  });
  src = src.replace(/export function (\w+)/g, (_, name) => {
    names.push(name);
    return `function ${name}`;
  });
  src += `\nmodule.exports = { ${names.join(", ")} };\n`;
  const mod = { exports: {} };
  const fn = new Function("module", "exports", "require", src);
  fn(mod, mod.exports, require);
  return mod.exports;
}

const {
  needsAacTranscode,
  isUncompressedRemoteAudio,
  extensionFromAudioUrl,
} = loadExportedFunctions("lib/mixAudioFormat.js");

describe("mix audio streaming format", () => {
  it("marks WAV as needing AAC conversion", () => {
    assert.equal(needsAacTranscode("wav"), true);
    assert.equal(needsAacTranscode(".WAV"), true);
    assert.equal(needsAacTranscode("mp3"), false);
    assert.equal(needsAacTranscode("m4a"), false);
  });

  it("detects uncompressed mix URLs including query strings", () => {
    const url =
      "https://example.supabase.co/storage/v1/object/public/mixes/u/audio/set.wav?token=1";
    assert.equal(extensionFromAudioUrl(url), "wav");
    assert.equal(isUncompressedRemoteAudio(url), true);
    assert.equal(
      isUncompressedRemoteAudio(
        "https://example.supabase.co/storage/v1/object/public/mixes/u/audio/set.m4a"
      ),
      false
    );
  });
});
