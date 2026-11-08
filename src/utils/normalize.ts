// src/utils/normalize.ts

// Strip Hebrew diacritics (nikud) U+05B0–U+05C7
const NIKUD_RE = /[\u05B0-\u05C7]/g;

// Common street-type prefixes to strip before matching
const HE_PREFIXES = [
  "רחובות ",
  "רחוב ",
  "רח׳ ",
  "רח' ",
  "שדרות ",
  "שדרת ",
  "שד׳ ",
  "שד' ",
  "סמטת ",
  "סמטה ",
  "כיכר ",
  "שביל ",
  "מעלה ",
  "מורד ",
  "גשר ",
  "דרך ",
  "טיילת ",
  "פארק ",
  "גבעת ",
  "מדרגות ",
  "מעלות ",
  "נתיב ",
  "מבוא ",
];

export function cleanHebrewText(input: string): string {
  return input
    .replace(NIKUD_RE, "")
    // Normalize quotes/geresh
    .replace(/["״”‟“]/g, "")
    .replace(/['׳’ʼ`]/g, "")
    // Normalize dashes to space
    .replace(/[-–—_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeHebrew(input: string): string {
  let s = cleanHebrewText(input);
  for (const prefix of HE_PREFIXES) {
    const cleanPrefix = cleanHebrewText(prefix) + " ";
    if (s.startsWith(cleanPrefix)) {
      s = s.slice(cleanPrefix.length).trim();
      break;
    }
  }
  return s;
}

/** Simplifies double yuds/vavs: 'איינשטיין' <-> 'אינשטין' */
export function simplifySpelling(s: string): string {
  return s.replace(/יי/g, "י").replace(/וו/g, "ו");
}

export function normalizeEnglish(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"`\-]/g, " ")
    .replace(/\s+/g, " ")
    .replace(
      /^(doctor|dr\.?|professor|prof\.?|street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd\.?|lane|ln\.?|drive|dr\.?|way|path|square|sq\.?)\s+/i,
      ""
    )
    .replace(
      /\s+(street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd\.?|lane|ln\.?|drive|dr\.?|way|path|square|sq\.?)$/i,
      ""
    )
    .trim();
}

export interface StreetEntry {
  name_he: string;
  name_en?: string;
  name_ar?: string;
  aliases?: string[];
  segments?: number;
}

// First names that should NEVER trigger a multi-word person name street by themselves
const FIRST_NAMES_BLACKLIST = new Set([
  // Hebrew
  "אבא", "אברהם", "אדם", "אהוד", "אהרן", "אודי", "אורי", "אוריאל", "אורן", "אוסקר",
  "אייל", "אילן", "איסר", "איציק", "איתי", "איתמר", "איתן", "אלברט", "אליהו", "אליעזר",
  "אלכס", "אלכסנדר", "אלעד", "אלעזר", "אמיר", "אמנון", "אנדרי", "אנדריי", "אנטון", "אנצו",
  "אסף", "אפרים", "ארי", "אריאל", "אריה", "ארתור", "אשר",
  "בבה", "בוגי", "בועז", "בני", "בנימין", "ברוך", "ברק",
  "גבי", "גבריאל", "גדעון", "גיורא", "גילי", "גל", "גלעד",
  "דב", "דוד", "דודו", "דן", "דני", "דניאל", "דרור",
  "הוגו", "הילל", "הלל", "הרי", "הנרי",
  "ואלטר", "ויקטור", "ולדימיר",
  "זאב", "זבולון", "זהר", "זלמן", "זליג",
  "חביב", "חגי", "חזי", "חיים", "חנן", "חנניה", "חסן",
  "טוביה", "טל",
  "יאיר", "יגאל", "ידידיה", "יהודה", "יהונתן", "יהושע", "יואב", "יואל", "יואכים", "יוחנן",
  "יונתן", "יוסי", "יוסף", "יורם", "יובל", "יורי", "יחזקאל", "יחיאל", "ינאי",
  "יעקב", "יצחק", "ירון", "ישראל", "יששכר",
  "לאון", "לואי", "לוטר", "לוי", "ליאון", "ליאור", "ליונל", "לסלי",
  "מאיר", "מארק", "מיכאל", "מיכה", "מנחם", "מנשה", "מרדכי", "משה", "מקס",
  "נדב", "נועם", "נח", "נחום", "נחמיה", "ניסן", "ניסים", "ניר", "נתן", "נתנאל",
  "סאלח", "סטפן", "סידני", "סיימון",
  "עבדאללה", "עבד", "עודד", "עוזי", "עוזיאל", "עזרא", "עזריאל", "עידו", "עמוס", "עמיר", "עמנואל", "עמירם", "ערן", "עקיבא",
  "פול", "פיטר", "פינחס", "פנחס", "פסח", "פרנץ", "פליקס",
  "צבי", "צדוק", "ציון",
  "קובי", "קלמן",
  "ראובן", "ראול", "רוברט", "רודי", "רועי", "רונן", "רז", "רחמים", "רמי", "רפאל",
  "שאול", "שבתאי", "שגיא", "שי", "שלום", "שלמה", "שמואל", "שמעון", "שמשון", "שניאור",
  "תאודור", "תומר", "תמיר",
  // English
  "zeev", "david", "moshe", "avraham", "yosef", "joseph", "yitzhak", "yaakov",
  "haim", "chaim", "shmuel", "shlomo", "aharon", "eliyahu", "eliezer", "albert",
  "alexander", "mordechai", "shimon", "reuven", "yehuda", "benjamin", "daniel",
  "michael", "gabriel", "rafael", "natan", "tzvi", "meir", "uri", "israel",
  "aryeh", "akiva", "beba", "yohanan", "amos", "gideon", "yehoshua", "abba",
  "yoel", "uzi", "theodor", "menachem", "arthur", "max", "nahum", "asher",
  "joachim", "andrei", "andrey", "lyonel", "lionel", "leon", "mark", "paul", "harry"
]);

/** Returns a lookup map: normalized form → canonical name_he */
export function buildIndex(streets: StreetEntry[]): Map<string, string> {
  const map = new Map<string, string>();

  function register(key: string, canonical: string, isMultiWord: boolean) {
    if (!key) return;

    const c = cleanHebrewText(key).toLowerCase();
    const n = normalizeHebrew(key).toLowerCase();
    const s_c = simplifySpelling(c);
    const s_n = simplifySpelling(n);

    // If this street has multiple words (e.g. Zeev Zhabotinsky),
    // NEVER register a lone first name as its alias!
    if (isMultiWord) {
      if (FIRST_NAMES_BLACKLIST.has(c) || FIRST_NAMES_BLACKLIST.has(n)) {
        return;
      }
    }

    if (c && !map.has(c)) map.set(c, canonical);
    if (n && !map.has(n)) map.set(n, canonical);
    if (s_c && !map.has(s_c)) map.set(s_c, canonical);
    if (s_n && !map.has(s_n)) map.set(s_n, canonical);
  }

  for (const s of streets) {
    if (!s.name_he) continue;

    // Check if canonical name has multiple meaningful words
    const strippedCanonical = normalizeHebrew(
      s.name_he.replace(/\([^)]*\)/g, "").replace(/,/g, " ")
    );
    const words = strippedCanonical.split(/\s+/).filter(Boolean);
    const isMultiWord = words.length >= 2;

    // 1. Canonical name
    register(s.name_he, s.name_he, isMultiWord);

    // 2. Precomputed aliases from OSM + Wikisource + ad.co.il
    if (Array.isArray(s.aliases)) {
      for (const a of s.aliases) {
        register(a, s.name_he, isMultiWord);
      }
    }

    // 3. Clean parentheses: "כספרי (ד\"ר יואכים)" -> "כספרי" (allowed: Caspari is surname)
    if (s.name_he.includes("(")) {
      const withoutParens = s.name_he.replace(/\([^)]*\)/g, "").trim();
      register(withoutParens, s.name_he, isMultiWord);

      const inParens = s.name_he.match(/\(([^)]+)\)/);
      if (inParens && inParens[1]) {
        const inner = cleanHebrewText(inParens[1]);
        if (withoutParens && inner) {
          register(`${withoutParens} ${inner}`, s.name_he, isMultiWord);
          register(`${inner} ${withoutParens}`, s.name_he, isMultiWord);
          // If inner has title:
          const titles = ["דר", "דוקטור", "פרופ", "פרופסור", "הרב", "השופט"];
          for (const t of titles) {
            if (inner.includes(t)) {
              register(`${t} ${withoutParens}`, s.name_he, isMultiWord);
              register(`${withoutParens} ${t}`, s.name_he, isMultiWord);
            }
          }
        }
      }
    }

    // 4. Comma handling: "לסקוב, חיים" -> "חיים לסקוב", "לסקוב"
    const cleanedForComma = s.name_he.replace(/\([^)]*\)/g, "").trim();
    if (cleanedForComma.includes(",")) {
      const parts = cleanedForComma.split(",").map((p) => p.trim());
      if (parts.length === 2) {
        register(`${parts[1]} ${parts[0]}`, s.name_he, isMultiWord);
        register(`${parts[0]} ${parts[1]}`, s.name_he, isMultiWord);
        // parts[0] is typically surname in comma-formatted names
        register(parts[0], s.name_he, isMultiWord);
      }
    }

    // 5. Surname extraction for 2-word streets:
    // e.g. "מאיר יערי" -> "יערי", "אנדרי סחרוב" -> "סחרוב", "ווטסון ליונל" -> "ווטסון"
    const normName = normalizeHebrew(cleanedForComma);
    const nameWords = normName.split(/\s+/).filter(Boolean);
    if (nameWords.length === 2) {
      const [w0, w1] = nameWords;
      if (FIRST_NAMES_BLACKLIST.has(w0) && !FIRST_NAMES_BLACKLIST.has(w1)) {
        register(w1, s.name_he, isMultiWord);
      } else if (FIRST_NAMES_BLACKLIST.has(w1) && !FIRST_NAMES_BLACKLIST.has(w0)) {
        register(w0, s.name_he, isMultiWord);
      }
    }

    // 6. Spelling variants (e.g. שוודיה <-> שבדיה, אנדריי <-> אנדרי)
    if (normName.includes("שוודי")) {
      register(normName.replace(/שוודי/g, "שבדי"), s.name_he, isMultiWord);
      register("שבדיה", s.name_he, isMultiWord);
    } else if (normName.includes("שבדי")) {
      register(normName.replace(/שבדי/g, "שוודי"), s.name_he, isMultiWord);
      register("שוודיה", s.name_he, isMultiWord);
    }
    if (normName.includes("אנדרי")) {
      register(normName.replace(/אנדרי/g, "אנדריי"), s.name_he, isMultiWord);
    }

    // 6. English transliterations
    if (s.name_en) {
      const enClean = normalizeEnglish(s.name_en);
      const enWords = enClean.split(/\s+/).filter(Boolean);
      const isMultiEn = enWords.length >= 2;

      if (enClean && (!isMultiEn || !FIRST_NAMES_BLACKLIST.has(enClean))) {
        if (!map.has(enClean)) map.set(enClean, s.name_he);
      }

      const enRaw = s.name_en.toLowerCase().trim();
      if (!map.has(enRaw)) map.set(enRaw, s.name_he);

      // If English is "Zeev Jabotinsky", register "Jabotinsky" as surname
      if (isMultiEn && enWords.length === 2) {
        const surname = enWords[1];
        if (!FIRST_NAMES_BLACKLIST.has(surname) && !map.has(surname)) {
          map.set(surname, s.name_he);
        }
        const possibleSurname0 = enWords[0];
        if (!FIRST_NAMES_BLACKLIST.has(possibleSurname0) && !map.has(possibleSurname0)) {
          map.set(possibleSurname0, s.name_he);
        }
      }
    }

    // 7. Arabic
    if (s.name_ar) {
      const arClean = s.name_ar.trim();
      if (!map.has(arClean)) map.set(arClean, s.name_he);
    }
  }

  return map;
}

/** Try to match user input against the index. Returns canonical name_he or null. */
export function matchInput(
  input: string,
  index: Map<string, string>
): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Normalized Hebrew
  const heNorm = normalizeHebrew(trimmed).toLowerCase();
  if (index.has(heNorm)) return index.get(heNorm)!;

  // 2. Raw cleaned Hebrew
  const heClean = cleanHebrewText(trimmed).toLowerCase();
  if (index.has(heClean)) return index.get(heClean)!;

  // 3. Simplified spelling Hebrew (יי/וו)
  const heSimpNorm = simplifySpelling(heNorm);
  if (index.has(heSimpNorm)) return index.get(heSimpNorm)!;

  const heSimpClean = simplifySpelling(heClean);
  if (index.has(heSimpClean)) return index.get(heSimpClean)!;

  // 4. Normalized English
  const enNorm = normalizeEnglish(trimmed);
  if (index.has(enNorm)) return index.get(enNorm)!;

  // 5. Raw lowercase
  const rawLower = trimmed.toLowerCase();
  if (index.has(rawLower)) return index.get(rawLower)!;

  return null;
}
