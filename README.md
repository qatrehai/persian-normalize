# persian-normalize

Make Persian and Arabic-script text comparable. Zero dependencies, ESM, TypeScript types included.

```bash
npm install persian-normalize
```

## The problem

In Persian, one word can be written several ways that look identical to a reader and are completely different to a computer:

```js
const a = "چت‌بات";   // with a zero-width non-joiner (U+200C)
const b = "چت بات";   // with an ordinary space

a === b                 // false
a.length === b.length   // true  ← the trap: length tells you nothing
```

None of these variants is a spelling mistake. All appear in published Persian, and all are encoded distinctly in Unicode:

| Variation | Example |
|---|---|
| Zero-width non-joiner | `می‌رود` · `می رود` · `میرود` |
| Persian yeh vs Arabic yeh | `ی` (U+06CC) vs `ي` (U+064A) |
| Persian keheh vs Arabic kaf | `ک` (U+06A9) vs `ك` (U+0643) |
| Heh vs teh marbuta | `شرکه` vs `شرکة` |
| Three digit sets | `۱۴۰۳` · `١٤٠٣` · `1403` |
| Diacritics and tatweel | `مَدرسه` · `مدـــرسه` |

A system that recognises one form of `چت‌بات` fails three users in four — and it fails **silently**, because nothing crashes. It just returns the wrong answer.

## Two jobs, opposite settings

The library separates the two things people constantly conflate.

### `cleanText` — for text you store or display

Repairs what a wrong keyboard layout produced, drops decoration, tidies spacing. **Keeps the text readable.**

```js
import { cleanText } from "persian-normalize";

cleanText("مي‌كنم")     // "می‌کنم"    Arabic yeh and kaf repaired
cleanText("شركة")       // "شرکه"      teh marbuta fixed
cleanText("مَدرسه")     // "مدرسه"     harakat dropped
cleanText("١٤٠٣")       // "۱۴۰۳"      Arabic-Indic digits to Persian
cleanText("آموزش")      // "آموزش"     the madda is correct Persian — untouched
```

The ZWNJ survives, because deleting it turns `می‌رود` into `میرود`, which is a different and worse spelling.

### `foldForSearch` — for text you compare

Flattens every variant into one form. The output is for matching, not for reading.

```js
import { foldForSearch, equals } from "persian-normalize";

foldForSearch("چت‌بات")      // "چت بات"
foldForSearch("۱۴۰۳")        // "1403"
foldForSearch("سلام، دنیا!") // "سلام دنیا"

equals("چت‌بات", "چت بات")   // true
equals("شرکة", "شرکه")       // true
equals("۱۴۰۳", "1403")       // true
equals("آموزش", "سازمان")    // false — different words stay different
```

**The ZWNJ becomes a space, not nothing.** Delete it and `چت‌بات` becomes `چتبات`, which still does not equal `چت بات`. Turn it into a space and both spellings arrive at the same two tokens.

## Matching without the substring trap

The other half of the problem. Persian attaches prefixes and suffixes freely, so a plain `includes()` finds words that are not there:

```js
"آموزش سازمانی دارید؟".includes("زمان")   // true — «زمان» hides inside «سازمانی»
```

That one line routes a question about *enterprise training* to a page about *project timelines*, and the answer reads perfectly well. Nobody notices.

```js
import { containsWord, tokenize } from "persian-normalize";

containsWord("آموزش سازمانی دارید؟", "زمان")   // false ✓
containsWord("دوره آموزشی ما", "آموزش")        // true  — long enough to prefix-match
containsWord("قیمت چت‌بات چقدر است", "چت بات")  // true  — phrase, across spellings

tokenize("چت‌بات سازمانی!")                     // ["چت", "بات", "سازمانی"]
```

Only the final token of a phrase may match by prefix, and only when it is at least `minPrefix` characters (default 5) — so `آموزش` still matches `آموزشی`, while `زمان` no longer matches `سازمانی`.

## API

| Function | Purpose |
|---|---|
| `cleanText(s, opts?)` | Repair for storage or display |
| `foldForSearch(s, opts?)` | Flatten for comparison |
| `equals(a, b)` | Compare ignoring spelling variation |
| `tokenize(s)` | Folded tokens |
| `containsWord(haystack, needle, opts?)` | Whole-word or phrase match |
| `ZWNJ` | The U+200C character |

```ts
cleanText(input, {
  digitsToLatin?: boolean,          // ۱۲۳ -> 123        default false
  arabicDigitsToPersian?: boolean,  // ١٢٣ -> ۱۲۳        default true
  diacritics?: boolean,             // strip harakat     default true
  collapseSpaces?: boolean,         //                   default true
})

foldForSearch(input, { keepPunctuation?: boolean })   // default false
containsWord(haystack, needle, { minPrefix?: number }) // default 5
```

## Notes

**This is not `String.prototype.normalize()`.** Unicode NFC/NFKC compose and decompose characters, but Persian yeh and Arabic yeh are *separate letters with separate meanings*, not two encodings of one character. Unicode will not merge them, and it should not. Script folding is an application-level decision.

**Normalize your reference strings too**, at start-up. A keyword list typed by a developer on one layout and a query typed by a user on another will otherwise never meet, however good the folding is on the input side.

**It is not only chatbots.** Anywhere Persian text is compared: product search, customer-name lookup, address matching, deduplication. In a database, two spellings of one company name remain two separate records.

## Tests

Zero dependencies, including dev ones.

```bash
node --test test/
```

Every case came from a real failure in a production Persian assistant, which is why the negative assertions — the things that must *not* fold together — carry as much weight as the positive ones.

## Background

The reasoning behind each step, and how the failures were found:
[Why Your Persian Chatbot Answers the Wrong Question](https://qatrehai.ir/blog/persian-chatbot-text-normalization-en)

## Licence

MIT © [Qatreh](https://qatrehai.ir) — an AI team in Karaj, Iran.

Found a variant this misses? Please open an issue — that is exactly the contribution this needs.
