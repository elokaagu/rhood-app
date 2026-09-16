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
  formatOpportunityDate,
  formatOpportunityTime,
} = loadExportedFunctions("lib/formatters.js");

const { parseEventDateTime } = loadExportedFunctions(
  "lib/opportunityTimezones.js"
);

describe("opportunity datetime vs Studio", () => {
  it("shows Studio's London midnight, not the UTC instant", () => {
    const iso = "2026-09-16T23:00:00.000Z";
    assert.equal(
      formatOpportunityDate(iso, "Europe/London"),
      "17th September 2026"
    );
    const time = formatOpportunityTime(iso, null, "Europe/London");
    assert.match(time, /12:00/i);
    assert.match(time, /am/i);
    assert.match(time, /BST|GMT/i);
  });

  it("keeps a Los Angeles midnight in Pacific time", () => {
    const iso = "2026-09-17T07:00:00.000Z";
    assert.equal(
      formatOpportunityDate(iso, "America/Los_Angeles"),
      "17th September 2026"
    );
    const time = formatOpportunityTime(iso, null, "America/Los_Angeles");
    assert.match(time, /12:00/i);
    assert.match(time, /am/i);
    assert.match(time, /PDT|PST|GMT-7|GMT-8/i);
  });

  it("keeps a calendar date-only value on the posted day", () => {
    assert.equal(
      formatOpportunityDate("2026-09-17"),
      "17th September 2026"
    );
  });

  it("parses a Studio wall clock in Europe/London to the same instant", () => {
    const instant = parseEventDateTime(
      "2026-09-17",
      "00:00",
      "Europe/London"
    );
    assert.equal(instant.toISOString(), "2026-09-16T23:00:00.000Z");
  });
});
