/** Zero-width non-joiner (U+200C) — invisible, meaningful, and the usual culprit. */
export declare const ZWNJ: "‌";

export interface CleanTextOptions {
  /** ۱۲۳ -> 123. Off by default: Persian text usually wants Persian digits. */
  digitsToLatin?: boolean;
  /** ١٢٣ -> ۱۲۳. On by default; the Arabic-Indic set is a keyboard accident. */
  arabicDigitsToPersian?: boolean;
  /** Strip harakat and tatweel. On by default. */
  diacritics?: boolean;
  /** Collapse runs of spaces without disturbing the ZWNJ. On by default. */
  collapseSpaces?: boolean;
}

export interface FoldOptions {
  /** Keep punctuation instead of collapsing it to whitespace. */
  keepPunctuation?: boolean;
}

export interface ContainsOptions {
  /** Shortest token allowed to match by prefix. Default 5. */
  minPrefix?: number;
}

/**
 * Repair text for storage or display. Keeps the ZWNJ, punctuation and case, so
 * the result still reads as the language it came from.
 */
export declare function cleanText(input: string, options?: CleanTextOptions): string;

/**
 * Fold text into one comparable form for matching. Not meant to be read back:
 * letter variants, all three digit sets, case and punctuation are flattened.
 */
export declare function foldForSearch(input: string, options?: FoldOptions): string;

/** Do two strings mean the same thing, ignoring spelling variation? */
export declare function equals(a: string, b: string): boolean;

/** Split folded text into tokens. */
export declare function tokenize(input: string): string[];

/**
 * Does `haystack` contain `needle` as whole words? The needle may be a phrase;
 * its tokens must appear in order and adjacent. Only the final token may match
 * by prefix, and only when it is at least `minPrefix` characters.
 */
export declare function containsWord(
  haystack: string,
  needle: string,
  options?: ContainsOptions
): boolean;

declare const _default: {
  cleanText: typeof cleanText;
  foldForSearch: typeof foldForSearch;
  equals: typeof equals;
  tokenize: typeof tokenize;
  containsWord: typeof containsWord;
  ZWNJ: typeof ZWNJ;
};
export default _default;
