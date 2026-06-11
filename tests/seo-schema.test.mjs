import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

// Pull every <script type="application/ld+json"> … </script> block out of the
// static HTML and parse it. Anything that fails to parse is a hard error —
// malformed JSON-LD silently disables rich results, so we want the build to
// catch it.
function parseJsonLdBlocks(source) {
  const blocks = [];
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(source)) !== null) {
    blocks.push(JSON.parse(match[1].trim()));
  }
  return blocks;
}

test("all static JSON-LD blocks are valid JSON", () => {
  const blocks = parseJsonLdBlocks(html);
  assert.ok(blocks.length >= 3, "expected at least Game, BreadcrumbList and FAQPage schemas");
  for (const block of blocks) {
    assert.equal(block["@context"], "https://schema.org");
    assert.ok(typeof block["@type"] === "string" && block["@type"].length > 0);
  }
});

test("static schemas carry ids so the runtime updates them in place (no duplicates)", () => {
  // The runtime injectJsonLd() looks up nodes by id="jsonld-<key>". If the
  // static fallback tags don't share those ids, the runtime appends a second
  // copy and the page ends up with duplicate (and possibly conflicting)
  // schemas.
  for (const id of ["jsonld-schema-game", "jsonld-schema-breadcrumb", "jsonld-schema-faq"]) {
    assert.match(html, new RegExp(`id="${id}"`), `index.html is missing id="${id}"`);
  }
});

test("FAQPage schema mirrors the visible FAQ questions", () => {
  const faq = parseJsonLdBlocks(html).find((block) => block["@type"] === "FAQPage");
  assert.ok(faq, "FAQPage schema must be present in index.html");
  assert.ok(Array.isArray(faq.mainEntity) && faq.mainEntity.length === 3);
  for (const entry of faq.mainEntity) {
    assert.equal(entry["@type"], "Question");
    assert.ok(entry.name && entry.name.length > 0);
    assert.equal(entry.acceptedAnswer["@type"], "Answer");
    assert.ok(entry.acceptedAnswer.text && entry.acceptedAnswer.text.length > 0);
  }
});
