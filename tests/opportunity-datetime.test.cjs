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
    const time = formatOpportunityTime(iso, "2026-09-17T03:00:00.000Z", "Europe/London");
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
    const time = formatOpportunityTime(iso, "2026-09-17T11:00:00.000Z", "America/Los_Angeles");
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

  it("shows Any time for a no-set-times listing (00:00–23:59 in its zone)", () => {
    assert.equal(
      formatOpportunityTime(
        "2026-09-16T23:00:00.000Z",
        "2026-09-17T22:59:00.000Z",
        "Europe/London"
      ),
      "Any time"
    );
    assert.equal(
      formatOpportunityTime(
        "2026-12-01T08:00:00.000Z",
        "2026-12-02T07:59:00.000Z",
        "America/Los_Angeles"
      ),
      "Any time"
    );
  });

  it("shows Any time for an ongoing listing starting at 00:00", () => {
    assert.equal(
      formatOpportunityTime("2026-09-16T23:00:00.000Z", null, "Europe/London"),
      "Any time"
    );
  });

  it("keeps real set times, including ones that touch midnight", () => {
    const evening = formatOpportunityTime(
      "2026-09-17T17:00:00.000Z",
      "2026-09-17T21:00:00.000Z",
      "Europe/London"
    );
    assert.match(evening, /6:00 pm – 10:00 pm/i);
    const lateStart = formatOpportunityTime(
      "2026-09-16T23:00:00.000Z",
      "2026-09-17T03:00:00.000Z",
      "Europe/London"
    );
    assert.notEqual(lateStart, "Any time");
    assert.match(lateStart, /12:00 am – 4:00 am/i);
    assert.notEqual(
      formatOpportunityTime("2026-09-17T17:00:00.000Z", null, "Europe/London"),
      "Any time"
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
