const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

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

const { inferRhoodAlertType } = loadExportedFunctions("lib/rhoodAlert.js");

describe("rhoodAlert type inference", () => {
  it("marks errors", () => {
    assert.equal(inferRhoodAlertType("Error", []), "error");
    assert.equal(inferRhoodAlertType("Couldn't copy", []), "error");
  });
  it("marks destructive confirms as warning", () => {
    assert.equal(
      inferRhoodAlertType("Delete Mix", [{ style: "destructive" }]),
      "warning"
    );
  });
  it("marks success", () => {
    assert.equal(inferRhoodAlertType("Copied", []), "success");
  });
});
