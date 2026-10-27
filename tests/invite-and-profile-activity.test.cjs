const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

/** `deps` supplies the names a module would otherwise import (imports are stripped). */
function loadExportedFunctions(relPath, deps = {}) {
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
  const fn = new Function("module", "exports", "require", ...Object.keys(deps), src);
  fn(mod, mod.exports, require, ...Object.values(deps));
  return mod.exports;
}

globalThis.__DEV__ = false;
const { formatOpportunityPayDisplay } = loadExportedFunctions("lib/formatters.js");

const {
  parseInviteCodeFromUrl,
  parseBookingRequestDeepLink,
} = loadExportedFunctions("lib/appDeepLinks.js");

const {
  profilePayLabel,
  mapApplicationRowForProfile,
  splitProfileOpportunityActivity,
  formatApplicationStatusLabel,
  mapGigsForProfile,
  gigBrandName,
  withBrandRatings,
} = loadExportedFunctions("lib/profileScreen/model.js", { formatOpportunityPayDisplay });

describe("DJ rates the brand", () => {
  const brandGig = {
    id: "g1",
    name: "Forest Rave",
    status: "completed",
    opportunity_id: "o1",
    venue_rating: 4,
    opportunity: { organizer_id: "b1", organizer_name: "Mackie events", organizer: { brand_name: "Mackie" } },
  };
  const noBrandGig = { id: "g2", name: "Mad Cats Cafe", status: "completed", opportunity_id: null };

  it("names the brand, falling back through organiser fields", () => {
    assert.equal(gigBrandName(brandGig), "Mackie");
    assert.equal(
      gigBrandName({ opportunity: { organizer_id: "b1", organizer_name: "Amuse", organizer: {} } }),
      "Amuse"
    );
    assert.equal(gigBrandName(noBrandGig), null);
    assert.equal(gigBrandName({ opportunity: { organizer_id: null, organizer_name: "X" } }), null);
  });

  it("attaches gig id, brand and the DJ's rating to Recent Gigs rows", () => {
    const rows = withBrandRatings(mapGigsForProfile([brandGig, noBrandGig]), [brandGig, noBrandGig]);
    assert.equal(rows[0].gigId, "g1");
    assert.equal(rows[0].brandName, "Mackie");
    assert.equal(rows[0].brandRating, 4);
    assert.equal(rows[1].brandName, null);
  });

  it("matches application-based rows to their gig by opportunity", () => {
    const [row] = withBrandRatings(
      [{ id: "app1", opportunityId: "o1", name: "Forest Rave" }],
      [{ ...brandGig, venue_rating: null }]
    );
    assert.equal(row.gigId, "g1");
    assert.equal(row.brandName, "Mackie");
    assert.equal(row.brandRating, null);
  });
});

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
