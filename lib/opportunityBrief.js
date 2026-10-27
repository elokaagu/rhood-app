/**
 * Parsing for Studio's opportunity brief template. Descriptions usually hold
 * four sections, each heading on its own line or written inline as
 * "What we want back: ...". Text without the headings renders as-is.
 */

export const BRIEF_HEADINGS = [
  "The opportunity",
  "What we want back",
  "Delivery confirmed when",
  "Who it's for",
];

function headingKey(text) {
  return String(text ?? "")
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/\*\*/g, "")
    .replace(/[:\s]+$/g, "")
    .trim()
    .toLowerCase();
}

const HEADING_BY_KEY = new Map(BRIEF_HEADINGS.map((h) => [headingKey(h), h]));

const HEADING_ALTERNATION = BRIEF_HEADINGS.map((h) =>
  h.replace(/'/g, "['\u2018\u2019\u02BC]").replace(/ /g, "\\s+")
).join("|");

/** "**What we want back:** text" or "What we want back: text" */
const INLINE_HEADING_RE = new RegExp(
  `^\\*{0,2}\\s*(${HEADING_ALTERNATION})\\s*\\*{0,2}\\s*:\\s*\\*{0,2}\\s*(.+)$`,
  "i"
);

/**
 * @returns {Array<{ type: "heading" | "text" | "gap", text?: string }>}
 */
export function parseBriefDescription(description) {
  if (typeof description !== "string" || !description.trim()) return [];

  const blocks = [];
  const pushGap = () => {
    if (blocks.length && blocks[blocks.length - 1].type !== "gap") {
      blocks.push({ type: "gap" });
    }
  };

  for (const rawLine of description.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      pushGap();
      continue;
    }

    const heading = HEADING_BY_KEY.get(headingKey(line));
    if (heading) {
      pushGap();
      blocks.push({ type: "heading", text: heading });
      continue;
    }

    const inline = line.match(INLINE_HEADING_RE);
    if (inline) {
      const inlineHeading = HEADING_BY_KEY.get(headingKey(inline[1]));
      const rest = inline[2].replace(/^\*\*\s*/, "").trim();
      if (inlineHeading && rest) {
        pushGap();
        blocks.push({ type: "heading", text: inlineHeading });
        blocks.push({ type: "text", text: rest });
        continue;
      }
    }

    blocks.push({ type: "text", text: line });
  }

  while (blocks.length && blocks[blocks.length - 1].type === "gap") blocks.pop();
  // A heading already separates itself from what follows.
  return blocks.filter(
    (block, i) => !(block.type === "gap" && blocks[i - 1]?.type === "heading")
  );
}

/**
 * Split "**bold** and plain" into segments. An unmatched "**" is dropped
 * rather than shown.
 * @returns {Array<{ text: string, bold: boolean }>}
 */
export function parseInlineBold(text) {
  const parts = String(text ?? "").split("**");
  const closed = parts.length % 2 === 1;
  return parts
    .map((part, i) => ({
      text: part,
      bold: i % 2 === 1 && (closed || i < parts.length - 1),
    }))
    .filter((seg) => seg.text.length > 0);
}

/** Pre-template skill levels from the old picker — not real requirements. */
const LEGACY_SKILL_LEVELS = new Set([
  "beginner",
  "intermediate",
  "advanced",
  "expert",
  "professional",
  "all",
  "all levels",
  "any",
]);

/** opportunities.skill_level, shown as "Requirements" (the brand's non-negotiables). */
export function briefRequirementsText(skillLevel) {
  const text = typeof skillLevel === "string" ? skillLevel.trim() : "";
  if (!text || LEGACY_SKILL_LEVELS.has(text.toLowerCase())) return null;
  return text;
}

/** opportunities.additional_info, shown as "Other details". */
export function briefOtherDetailsText(additionalInfo) {
  const text = typeof additionalInfo === "string" ? additionalInfo.trim() : "";
  return text || null;
}
