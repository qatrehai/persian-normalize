/**
 * Tests use node:test so the package has zero dependencies of any kind,
 * including dev ones. `node --test` runs them on Node 18+.
 *
 * Every case here came from a real failure in a production Persian assistant,
 * not from imagination — which is why the negative assertions matter as much
 * as the positive ones.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanText, foldForSearch, equals, tokenize, containsWord, ZWNJ } from "../src/index.js";

// ── the invisible character ──────────────────────────────────────────────
test("ZWNJ and a space are different strings of the same length", () => {
  const a = "چت" + ZWNJ + "بات";
  const b = "چت بات";
  assert.notEqual(a, b);
  assert.equal(a.length, b.length); // the trap: length is no help
});

test("folding makes the two spellings equal", () => {
  assert.ok(equals("چت" + ZWNJ + "بات", "چت بات"));
  assert.ok(equals("می" + ZWNJ + "رود", "می رود"));
});

test("the ZWNJ becomes a space, not nothing", () => {
  // Deleting it would give «چتبات», which still does not match «چت بات».
  assert.equal(foldForSearch("چت" + ZWNJ + "بات"), "چت بات");
  assert.notEqual(foldForSearch("چت" + ZWNJ + "بات"), "چتبات");
});

test("cleanText keeps the ZWNJ, because removing it changes the spelling", () => {
  assert.ok(cleanText("می" + ZWNJ + "رود").includes(ZWNJ));
});

// ── wrong-keyboard letters ───────────────────────────────────────────────
test("Arabic yeh and kaf are repaired for display", () => {
  assert.equal(cleanText("مي‌كنم"), "می" + ZWNJ + "کنم");
  assert.equal(cleanText("شركة"), "شرکه");
});

test("teh marbuta folds to heh", () => {
  assert.ok(equals("شرکة", "شرکه"));
});

test("alef variants fold only for search, never for display", () => {
  assert.ok(equals("آموزش", "اموزش"));
  assert.equal(cleanText("آموزش"), "آموزش"); // display keeps the madda
});

// ── digits ───────────────────────────────────────────────────────────────
test("all three digit sets fold to the same value", () => {
  assert.equal(foldForSearch("۱۴۰۳"), "1403");
  assert.equal(foldForSearch("١٤٠٣"), "1403");
  assert.ok(equals("۱۴۰۳", "1403"));
  assert.ok(equals("١٤٠٣", "۱۴۰۳"));
});

test("cleanText leaves Persian digits alone but repairs Arabic-Indic ones", () => {
  assert.equal(cleanText("۱۴۰۳"), "۱۴۰۳");
  assert.equal(cleanText("١٤٠٣"), "۱۴۰۳");
  assert.equal(cleanText("۱۴۰۳", { digitsToLatin: true }), "1403");
});

// ── decoration ───────────────────────────────────────────────────────────
test("harakat and tatweel are dropped", () => {
  assert.equal(cleanText("مَدرسه"), "مدرسه");
  assert.equal(cleanText("مدـــرسه"), "مدرسه");
});

// ── the substring trap ───────────────────────────────────────────────────
test("plain includes() finds زمان inside سازمانی — the bug this exists for", () => {
  assert.ok("آموزش سازمانی دارید؟".includes("زمان"));
});

test("containsWord does not", () => {
  assert.equal(containsWord("آموزش سازمانی دارید؟", "زمان"), false);
});

test("but a long enough word still matches its inflected form", () => {
  assert.ok(containsWord("دوره آموزشی ما", "آموزش"));
});

test("whole-word match works across spelling variants", () => {
  assert.ok(containsWord("قيمت چت" + ZWNJ + "بات چقدر است", "چت بات"));
});

// ── tokens ───────────────────────────────────────────────────────────────
test("tokenize folds and splits", () => {
  assert.deepEqual(tokenize("چت" + ZWNJ + "بات سازمانی!"), ["چت", "بات", "سازمانی"]);
  assert.deepEqual(tokenize(""), []);
  assert.deepEqual(tokenize("   "), []);
});

// ── mixed scripts and edge cases ─────────────────────────────────────────
test("Latin text is lowercased and kept", () => {
  assert.equal(foldForSearch("ChatBot API"), "chatbot api");
  assert.ok(equals("ChatBot", "chatbot"));
});

test("punctuation collapses, and can be kept on request", () => {
  assert.equal(foldForSearch("سلام، دنیا!"), "سلام دنیا");
  assert.ok(foldForSearch("سلام، دنیا!", { keepPunctuation: true }).includes("،"));
});

test("non-strings and empties do not throw", () => {
  for (const v of [null, undefined, 42, {}, []]) {
    assert.equal(cleanText(v), "");
    assert.equal(foldForSearch(v), "");
  }
  assert.equal(cleanText(""), "");
  assert.equal(foldForSearch("   "), "");
});

test("HTML entities do not survive into a folded string", () => {
  assert.equal(foldForSearch("سلام&nbsp;دنیا"), "سلام دنیا");
});

test("bidi control characters are removed", () => {
  assert.equal(cleanText("سلام‏دنیا"), "سلامدنیا");
  assert.equal(foldForSearch("سلام‏دنیا"), "سلام دنیا");
});

// ── things that must NOT be folded together ──────────────────────────────
test("genuinely different words stay different", () => {
  assert.ok(!equals("آموزش", "سازمان"));
  assert.ok(!equals("چت بات", "ربات"));
  assert.ok(!equals("۱۴۰۳", "۱۴۰۴"));
});

test("folding is idempotent", () => {
  const s = "چت" + ZWNJ + "بات ۱۴۰۳ مَدرسة";
  assert.equal(foldForSearch(foldForSearch(s)), foldForSearch(s));
  assert.equal(cleanText(cleanText(s)), cleanText(s));
});

// ── phrase matching, added after the first run caught the gap ────────────
test("a phrase must appear in order and adjacent", () => {
  assert.ok(containsWord("قیمت چت بات سازمانی", "چت بات"));
  assert.equal(containsWord("بات چت", "چت بات"), false);          // wrong order
  assert.equal(containsWord("چت هوشمند بات", "چت بات"), false);   // not adjacent
});

test("a phrase matches across the ZWNJ spelling", () => {
  assert.ok(containsWord("قیمت چت" + ZWNJ + "بات چقدر است", "چت بات"));
  assert.ok(containsWord("قیمت چت بات چقدر است", "چت" + ZWNJ + "بات"));
});

test("only the last token of a phrase may prefix-match", () => {
  assert.ok(containsWord("خدمات بینایی ماشینی ما", "بینایی ماشین"));
  assert.equal(containsWord("بینایی‌سنجی ماشین", "بینایی ماشین"), false);
});

test("a needle longer than the text cannot match", () => {
  assert.equal(containsWord("چت", "چت بات سازمانی"), false);
});
