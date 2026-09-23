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

const {
  parseInviteCodeFromUrl,
  parseBookingRequestDeepLink,
} = loadExportedFunctions("lib/appDeepLinks.js");

const {
  profilePayLabel,
  mapApplicationRowForProfile,
  splitProfileOpportunityActivity,
  formatApplicationStatusLabel,
} = loadExportedFunctions("lib/profileScreen/model.js");

describe("invite deep links", () => {
  it("reads https://rhood.io/invite/CODE", () => {
    assert.equal(
      parseInviteCodeFromUrl("https://rhood.io/invite/BDAFEB45"),
      "BDAFEB45"
    );
  });

  it("reads rhood://invite/CODE", () => {
    assert.equal(parseInviteCodeFromUrl("rhood://invite/BDAFEB45"), "BDAFEB45");
  });

  it("reads query params", () => {
    assert.equal(
      parseInviteCodeFromUrl("https://rhood.io/join?invite=ab12cd34"),
      "AB12CD34"
    );
  });

  it("does not steal booking ids", () => {
    assert.equal(parseInviteCodeFromUrl("rhood://bookings/abc"), null);
    assert.equal(parseBookingRequestDeepLink("rhood://bookings/abc-123"), "abc-123");
  });
});

describe("profile activity mapping", () => {
  it("hides pay and rating unless they exist", () => {
    const mapped = mapApplicationRowForProfile(
      {
        id: "a1",
        status: "approved",
        gig_completed: true,
        opportunity_id: "o1",
        opportunities: {
          title: "Warehouse",
          venue: "Fold",
          event_date: "2026-09-01",
          payment: 0,
        },
      },
      0
    );
    assert.equal(mapped.price, null);
    assert.equal(mapped.rating, null);
    assert.equal(mapped.name, "Warehouse");
  });

  it("splits applications vs completed gigs", () => {
    const { recentOpportunities, recentGigs, gigsCompleted } =
      splitProfileOpportunityActivity(
        [
          {
            id: "1",
            status: "pending",
            gig_completed: false,
            opportunities: { title: "Applied gig", venue: "X" },
          },
          {
            id: "2",
            status: "approved",
            gig_completed: true,
            opportunities: {
              title: "Done gig",
              venue: "Y",
              compensation: "£400",
            },
          },
        ],
        { 2: 5 }
      );
    assert.equal(recentOpportunities.length, 2);
    assert.equal(recentGigs.length, 1);
    assert.equal(recentGigs[0].name, "Done gig");
    assert.equal(recentGigs[0].price, "£400");
    assert.equal(recentGigs[0].rating, 5);
    assert.equal(gigsCompleted, 1);
    assert.equal(formatApplicationStatusLabel("pending"), "Applied");
  });

  it("does not invent a £0 label", () => {
    assert.equal(profilePayLabel({ payment: 0 }), null);
    assert.equal(profilePayLabel({ payment: null }), null);
    assert.equal(profilePayLabel({ compensation: "Guest list" }), "Guest list");
  });
});
