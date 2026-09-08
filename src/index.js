/**
 * persian-normalize — make Persian and Arabic-script text comparable.
 *
 * Two jobs that are constantly confused, and that need opposite settings:
 *
 *   cleanText(s)   Repair text you are going to STORE or DISPLAY. Fixes the
 *                  characters a wrong keyboard layout produces, drops
 *                  decoration, tidies spacing — and keeps the text readable.
 *                  The zero-width non-joiner survives, because «می‌رود» without
 *                  it is «میرود», which is a different and worse spelling.
 *
 *   foldForSearch(s)  Reduce text you are going to COMPARE to a single form.
 *                     Folds every variant together, ASCII digits, no
 *                     punctuation, no case. The output is not meant to be read.
 *
 * Using cleanText for matching leaves «چت‌بات» and «چت بات» unequal. Using
 * foldForSearch for storage destroys the writing. Pick by what you are doing.
 */

/** Zero-width non-joiner: invisible, meaningful, and the usual culprit. */
export const ZWNJ = "‌";

/**
 * Characters an Arabic keyboard produces where Persian expects its own letter.
 * These are always safe to repair: no Persian word wants the Arabic form.
 */
const KEYBOARD_FIXES = {
  "ي": "ی", // ARABIC YEH            ي -> ی
  "ى": "ی", // ALEF MAKSURA          ى -> ی
  "ك": "ک", // ARABIC KAF            ك -> ک
  "ة": "ه", // TEH MARBUTA           ة -> ه
  "ۀ": "ه", // HEH WITH YEH ABOVE    ۀ -> ه
  "ۍ": "ی", // YEH WITH TAIL
  "ـ": "",       // TATWEEL — decoration only
};

/**
 * Further folds that lose information, so they belong to search only.
 * «آب» and «اب» are different words; collapsing them is right for matching
 * and wrong for storage.
 */
const SEARCH_FOLDS = {
  "آ": "ا", // ALEF WITH MADDA       آ -> ا
  "أ": "ا", // ALEF WITH HAMZA ABOVE أ -> ا
  "إ": "ا", // ALEF WITH HAMZA BELOW إ -> ا
  "ٱ": "ا", // ALEF WASLA
  "ؤ": "و", // WAW WITH HAMZA        ؤ -> و
  "ئ": "ی", // YEH WITH HAMZA        ئ -> ی
  "ء": "",       // HAMZA on its own
};

/** Harakat, sukun, dagger alef — optional vowel marks that survive pasting. */
const DIACRITICS = /[ً-ْٰٓ-ٕٖ-ٟۖ-ۭ]/g;

/** Bidi controls and other invisibles that break comparison silently. */
const INVISIBLES = /[​‍‎‏‪-‮⁦-⁩﻿]/g;

const PERSIAN_DIGITS = /[۰-۹]/g; // ۰-۹
const ARABIC_DIGITS = /[٠-٩]/g;  // ٠-٩

const mapChars = (input, table) => {
  let out = "";
  for (const ch of input) out += ch in table ? table[ch] : ch;
  return out;
};

/**
 * Repair text for storage or display.
 *
 * Keeps the ZWNJ, keeps punctuation, keeps letter case, and leaves Persian
 * digits as Persian digits unless asked otherwise — the result should still
 * read as the language it came from.
 *
 * @param {string} input
 * @param {object} [options]
 * @param {boolean} [options.digitsToLatin=false]  ۱۲۳ -> 123
 * @param {boolean} [options.arabicDigitsToPersian=true]  ١٢٣ -> ۱۲۳
 * @param {boolean} [options.diacritics=true]  strip harakat and tatweel
 * @param {boolean} [options.collapseSpaces=true]
 * @returns {string}
 */
export function cleanText(input, options = {}) {
  if (typeof input !== "string") return "";
  const {
    digitsToLatin = false,
    arabicDigitsToPersian = true,
    diacritics = true,
    collapseSpaces = true,
  } = options;

  let s = input.replace(INVISIBLES, "");
  if (diacritics) s = s.replace(DIACRITICS, "");
  s = mapChars(s, KEYBOARD_FIXES);

  if (digitsToLatin) {
    s = s.replace(PERSIAN_DIGITS, (d) => String(d.charCodeAt(0) - 0x06f0))
         .replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) - 0x0660));
  } else if (arabicDigitsToPersian) {
    s = s.replace(ARABIC_DIGITS, (d) => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 0x06f0));
  }

  if (collapseSpaces) {
    // Collapse runs of ordinary spaces, but never touch the ZWNJ, and never
    // let a space sit next to one — that pair renders as a double gap.
    s = s.replace(/[ \t]+/g, " ")
         .replace(new RegExp(`\\s*${ZWNJ}\\s*`, "g"), ZWNJ)
         .replace(/ *\n */g, "\n")
         .trim();
  }
  return s;
}

/**
 * Fold text into one comparable form.
 *
 * The output is for matching, not for reading. Everything that can vary is
 * flattened: letter variants, all three digit sets, case, punctuation.
 *
 * The ZWNJ becomes a SPACE rather than being deleted. Delete it and «چت‌بات»
 * becomes «چتبات», which still does not equal «چت بات»; turn it into a space
 * and both spellings arrive at the same two tokens.
 *
 * @param {string} input
 * @param {object} [options]
 * @param {boolean} [options.keepPunctuation=false]
 * @returns {string}
 */
export function foldForSearch(input, options = {}) {
  if (typeof input !== "string") return "";
  const { keepPunctuation = false } = options;

  let s = input
    .replace(/&(?:amp|lt|gt|quot|nbsp|#x27|#39);/g, " ")
    .replace(DIACRITICS, "");

  // Every invisible, the ZWNJ included, becomes a space.
  s = s.replace(new RegExp(`[${ZWNJ}​‍‎‏‪-‮⁦-⁩﻿]`, "g"), " ");

  s = mapChars(s, KEYBOARD_FIXES);
  s = mapChars(s, SEARCH_FOLDS);

  s = s.replace(PERSIAN_DIGITS, (d) => String(d.charCodeAt(0) - 0x06f0))
       .replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) - 0x0660))
       .toLowerCase();

  if (!keepPunctuation) s = s.replace(/[^\p{L}\p{N}]+/gu, " ");
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Do two strings mean the same thing, ignoring spelling variation?
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function equals(a, b) {
  return foldForSearch(a) === foldForSearch(b);
}

/**
 * Split folded text into tokens.
 *
 * Compare at token level rather than by substring. `"آموزش سازمانی".includes("زمان")`
 * is true — «زمان» hides inside «سازمانی» — and that one mistake routes a
 * question about enterprise training to a page about project timelines.
 *
 * @param {string} input
 * @returns {string[]}
 */
export function tokenize(input) {
  const folded = foldForSearch(input);
  return folded ? folded.split(" ") : [];
}

/**
 * Does `haystack` contain `needle` as whole words?
 *
 * The needle may be a phrase. That is not a nicety: «چت بات» is two tokens and
 * «چت‌بات» is one string, and a term-matching function that only handles single
 * words cannot answer the most common question anyone asks of Persian text.
 * The tokens must appear in order and adjacent.
 *
 * Only the final token may match by prefix, and only when it is long enough
 * that a shared opening cannot be coincidental — so «آموزش» still matches
 * «آموزشی», while «زمان» no longer matches «سازمانی».
 *
 * @param {string} haystack
 * @param {string} needle  single word or phrase
 * @param {object} [options]
 * @param {number} [options.minPrefix=5] shortest token allowed to prefix-match
 * @returns {boolean}
 */
export function containsWord(haystack, needle, options = {}) {
  const { minPrefix = 5 } = options;
  const target = tokenize(needle);
  if (!target.length) return false;
  const words = tokenize(haystack);
  if (target.length > words.length) return false;

  for (let i = 0; i <= words.length - target.length; i++) {
    let matched = true;
    for (let j = 0; j < target.length; j++) {
      const word = words[i + j];
      const tok = target[j];
      if (word === tok) continue;
      const isLast = j === target.length - 1;
      if (isLast && tok.length >= minPrefix && word.startsWith(tok)) continue;
      matched = false;
      break;
    }
    if (matched) return true;
  }
  return false;
}

export default { cleanText, foldForSearch, equals, tokenize, containsWord, ZWNJ };
