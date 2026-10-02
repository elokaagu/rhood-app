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
  REQUIRED_PROFILE_TEXT_COLUMNS,
  buildOnboardingProfilePayload,
  withRequiredProfileText,
} = loadExportedFunctions("lib/profileRequiredFields.js");
const { getUserFriendlyError } = loadExportedFunctions("lib/errorMessages.js");

const RELAY = "g2cpfp8gcf@privaterelay.appleid.com";

function assertNoNullRequired(row) {
  for (const col of REQUIRED_PROFILE_TEXT_COLUMNS) {
    assert.equal(typeof row[col], "string", `${col} must be a string`);
  }
}

describe("Sign in with Apple → onboarding profile row", () => {
  it("Hide My Email, no name shared, location skipped", () => {
    const row = buildOnboardingProfilePayload({ genres: ["House"] }, RELAY);
    assertNoNullRequired(row);
    assert.equal(row.city, "");
    assert.equal(row.dj_name, "g2cpfp8gcf");
    assert.equal(row.bio, "DJ specializing in House");
  });

  it("name shared, location skipped", () => {
    const row = buildOnboardingProfilePayload(
      { first_name: "Sam", last_name: "Lee", genres: ["Techno"] },
      RELAY
    );
    assertNoNullRequired(row);
    assert.equal(row.dj_name, "Sam Lee");
  });

  it("whitespace-only city is saved blank, not null", () => {
    const row = buildOnboardingProfilePayload(
      { city: "   ", genres: ["House"] },
      RELAY
    );
    assert.equal(row.city, "");
  });

  it("city picked keeps the city and bio", () => {
    const row = buildOnboardingProfilePayload(
      { dj_name: "DJ Sam", city: " London ", genres: ["House", "Garage"] },
      RELAY
    );
    assert.equal(row.city, "London");
    assert.equal(row.bio, "DJ from London specializing in House, Garage");
  });

  it("no email and no name still gets a DJ name", () => {
    const row = buildOnboardingProfilePayload({ genres: ["House"] }, undefined);
    assertNoNullRequired(row);
    assert.equal(row.dj_name, "DJ");
  });

  it("null values from a resumed profile become blank strings", () => {
    const row = buildOnboardingProfilePayload(
      { first_name: null, last_name: null, city: null, genres: ["House"] },
      RELAY
    );
    assertNoNullRequired(row);
  });
});

describe("withRequiredProfileText", () => {
  it("turns explicit nulls into blank strings", () => {
    const row = withRequiredProfileText({
      dj_name: null,
      first_name: undefined,
      last_name: null,
      city: null,
      instagram: null,
    });
    assertNoNullRequired(row);
    assert.equal(row.instagram, null);
  });

  it("leaves absent columns absent so an upsert can't blank them", () => {
    const row = withRequiredProfileText({ genres: ["House"] });
    assert.deepEqual(row, { genres: ["House"] });
  });

  it("keeps real values", () => {
    const row = withRequiredProfileText({ dj_name: "DJ Sam", city: "London" });
    assert.equal(row.dj_name, "DJ Sam");
    assert.equal(row.city, "London");
  });
});

describe("onboarding error copy", () => {
  it("a missing required column no longer says 'Invalid information provided'", () => {
    const msg = getUserFriendlyError(
      new Error(
        'null value in column "city" of relation "user_profiles" violates not-null constraint'
      )
    );
    assert.doesNotMatch(msg, /Invalid information/);
    assert.match(msg, /required details are missing/);
  });
});
