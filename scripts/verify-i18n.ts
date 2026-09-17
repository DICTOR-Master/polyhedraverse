/**
 * Verifies app/lib/i18n.ts's own real shipped state, not a separate
 * assumption: every language in LANG_ORDER has a dictionary with
 * EXACTLY the same key set as English (no missing key silently falling
 * back, no stray/typo'd key nothing ever reads), LANG_META has an entry
 * for every LANG_ORDER code, and every dictionary's own `{placeholder}`
 * usage matches English's for the same key -- a translation dropping or
 * renaming a `{n}`/`{family}`/`{list}` placeholder would silently break
 * that string's interpolation at runtime, this catches it directly
 * rather than requiring a human to read all 7 translations side by side
 * every time one changes.
 */
import { I18N, LANG_ORDER, LANG_META, t } from '../app/lib/i18n';

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}`);
  if (!condition) failures++;
}

check('LANG_ORDER has every language I18N actually defines, and no others', JSON.stringify([...LANG_ORDER].sort()) === JSON.stringify([...Object.keys(I18N)].sort()));

for (const lang of LANG_ORDER) {
  check(`LANG_META has a native-name entry for "${lang}"`, !!LANG_META[lang]?.native);
}

const englishKeys = Object.keys(I18N.en).sort();
check(`English itself has a non-empty key set (${englishKeys.length} keys)`, englishKeys.length > 0);

const placeholderPattern = /\{[a-zA-Z]+\}/g;
function placeholdersIn(s: string): string[] {
  return [...s.matchAll(placeholderPattern)].map((m) => m[0]).sort();
}

for (const lang of LANG_ORDER) {
  if (lang === 'en') continue;
  const dict = I18N[lang];
  const keys = Object.keys(dict).sort();
  check(`${lang}: has exactly English's ${englishKeys.length} keys (no missing, no extra)`, JSON.stringify(keys) === JSON.stringify(englishKeys));

  for (const key of englishKeys) {
    const enValue = I18N.en[key];
    const translated = dict[key];
    if (translated === undefined) continue; // already reported as a missing-key failure above
    check(`${lang}.${key}: is non-empty`, translated.trim().length > 0);
    const enPlaceholders = placeholdersIn(enValue);
    const gotPlaceholders = placeholdersIn(translated);
    check(
      `${lang}.${key}: placeholders match English (expected ${JSON.stringify(enPlaceholders)}, got ${JSON.stringify(gotPlaceholders)})`,
      JSON.stringify(enPlaceholders) === JSON.stringify(gotPlaceholders),
    );
  }
}

// Every language's own dictionary entry must be reachable through t()
// itself, not just present in the raw I18N map (catches a real bug
// class: a key present in the object but somehow not returned, e.g. a
// typo'd lookup path).
for (const lang of LANG_ORDER) {
  for (const key of englishKeys) {
    const viaT = t(key, lang);
    const direct = I18N[lang][key] ?? I18N.en[key];
    check(`t("${key}", "${lang}") matches the dictionary directly`, viaT === direct);
  }
}
console.log(`\n${failures} failures.`);
process.exit(failures === 0 ? 0 : 1);
