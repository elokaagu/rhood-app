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

const { mixArtworkColumns } = loadExportedFunctions("lib/mixArtworkColumns.js");

describe("mix artwork columns for app + portal", () => {
  it("writes both artwork_url and image_url", () => {
    assert.deepEqual(mixArtworkColumns(" https://cdn.example/art.jpg "), {
      artwork_url: "https://cdn.example/art.jpg",
      image_url: "https://cdn.example/art.jpg",
    });
  });

  it("skips empty URLs", () => {
    assert.deepEqual(mixArtworkColumns(""), {});
    assert.deepEqual(mixArtworkColumns(null), {});
  });
});
