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
  toAppliedOpportunityIdSet,
  excludeAppliedOpportunities,
} = loadExportedFunctions("lib/opportunities/excludeAppliedOpportunities.js");

describe("exclude applied opportunities from swipe", () => {
  it("drops listings the DJ already applied to", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    assert.deepEqual(
      excludeAppliedOpportunities(rows, ["b"]).map((r) => r.id),
      ["a", "c"]
    );
  });

  it("hides accepted and pending applications the same way", () => {
    const rows = [{ id: "test" }, { id: "open" }];
    const applied = toAppliedOpportunityIdSet(["test"]);
    assert.deepEqual(
      excludeAppliedOpportunities(rows, applied).map((r) => r.id),
      ["open"]
    );
  });

  it("keeps the deck unchanged when the DJ has no applications", () => {
    const rows = [{ id: "a" }];
    assert.equal(excludeAppliedOpportunities(rows, []).length, 1);
    assert.equal(excludeAppliedOpportunities(rows, null).length, 1);
  });
});
