"""
Fetch complete Haifa street network and integrate with Wikisource & ad.co.il directories.
Outputs:
  public/haifa-streets.geojson    - Full geometry with canonical names
  public/haifa-streets-index.json - Rich index with all aliases, titles, and English names
"""

import json
import pathlib
import re
import urllib.parse
import urllib.request
from collections import defaultdict

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Bounding box covers all of Haifa municipality:
# Mount Carmel, Downtown, Hadar, Neve Sha'anan, Bat Galim, Kiryat Eliezer, Kiryat Haim, Kiryat Shmuel
QUERY = """
[out:json][timeout:150];
(
  way["highway"]["name"](32.740, 34.940, 32.865, 35.090);
);
out geom tags;
"""

print("1. Fetching all Haifa streets from Overpass API (all highway types)...")
req = urllib.request.Request(
    OVERPASS_URL,
    data=urllib.parse.urlencode({"data": QUERY}).encode("utf-8"),
    headers={"User-Agent": "haifa-streets-game/2.0 (contact: local)"},
)

resp = urllib.request.urlopen(req, timeout=180)
osm_data = json.loads(resp.read().decode("utf-8"))
print(f"   Received {len(osm_data['elements'])} OSM elements.")

# Group way segments by Hebrew name
streets = defaultdict(
    lambda: {
        "name_he": "",
        "name_en": "",
        "name_ar": "",
        "highway": "",
        "segments": [],
    }
)

skipped = 0
for el in osm_data["elements"]:
    name_he = el["tags"].get("name", "").strip()
    name_en = el["tags"].get("name:en", "").strip()
    name_ar = el["tags"].get("name:ar", "").strip()
    hw = el["tags"].get("highway", "").strip()

    if not name_he:
        skipped += 1
        continue

    coords = [[n["lon"], n["lat"]] for n in el.get("geometry", [])]
    if len(coords) < 2:
        skipped += 1
        continue

    # Clean redundant spaces
    name_he = re.sub(r"\s+", " ", name_he).strip()

    streets[name_he]["name_he"] = name_he
    if name_en and not streets[name_he]["name_en"]:
        streets[name_he]["name_en"] = name_en
    if name_ar and not streets[name_he]["name_ar"]:
        streets[name_he]["name_ar"] = name_ar
    if hw and not streets[name_he]["highway"]:
        streets[name_he]["highway"] = hw

    streets[name_he]["segments"].append(coords)

print(f"   Found {len(streets)} unique named streets in Haifa.")

# 2. Load scraped directories from Wikisource and ad.co.il
wiki_streets = []
ad_streets = []

if pathlib.Path("public/wikisource_streets.json").exists():
    wiki_streets = json.loads(
        pathlib.Path("public/wikisource_streets.json").read_text(encoding="utf-8")
    )
    print(f"2. Loaded {len(wiki_streets)} streets from Wikisource.")

if pathlib.Path("public/ad_streets.json").exists():
    ad_streets = json.loads(
        pathlib.Path("public/ad_streets.json").read_text(encoding="utf-8")
    )
    print(f"3. Loaded {len(ad_streets)} streets from ad.co.il.")


FIRST_NAMES_BLACKLIST = {
    # Hebrew
    "זאב",
    "דוד",
    "משה",
    "אברהם",
    "יוסף",
    "יצחק",
    "יעקב",
    "חיים",
    "שמואל",
    "שלמה",
    "אהרן",
    "אליהו",
    "אליעזר",
    "אלברט",
    "אלכסנדר",
    "מרדכי",
    "שמעון",
    "ראובן",
    "יהודה",
    "בנימין",
    "דניאל",
    "מיכאל",
    "גבריאל",
    "רפאל",
    "נתן",
    "צבי",
    "מאיר",
    "אורי",
    "ישראל",
    "אריה",
    "עקיבא",
    "בבה",
    "יוחנן",
    "עמוס",
    "גדעון",
    "יהושע",
    "אבא",
    "יואל",
    "עוזי",
    "תאודור",
    "מנחם",
    "ארתור",
    "מקס",
    "נחום",
    "אשר",
    "יואכים",
    # English
    "zeev",
    "david",
    "moshe",
    "avraham",
    "yosef",
    "joseph",
    "yitzhak",
    "yaakov",
    "haim",
    "chaim",
    "shmuel",
    "shlomo",
    "aharon",
    "eliyahu",
    "eliezer",
    "albert",
    "alexander",
    "mordechai",
    "shimon",
    "reuven",
    "yehuda",
    "benjamin",
    "daniel",
    "michael",
    "gabriel",
    "rafael",
    "natan",
    "tzvi",
    "meir",
    "uri",
    "israel",
    "aryeh",
    "akiva",
    "beba",
    "yohanan",
    "amos",
    "gideon",
    "yehoshua",
    "abba",
    "yoel",
    "uzi",
    "theodor",
    "menachem",
    "arthur",
    "max",
    "nahum",
    "asher",
    "joachim",
}


def clean(s: str) -> str:
    s = re.sub(r"[\u05B0-\u05C7]", "", s)
    s = re.sub(r'["״”‟“\'׳’ʼ`]', "", s)
    s = re.sub(r"[-–—_]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


# Helper to generate aliases for matching
def generate_aliases(name_he: str, name_en: str = ""):
    aliases = set()

    raw = clean(name_he)
    if not raw:
        return []
    aliases.add(raw)

    words = [
        w
        for w in clean(re.sub(r"\([^)]*\)", "", name_he).replace(",", " ")).split()
        if w
    ]
    is_multi_word = len(words) >= 2

    # A. Parentheses extraction: "כספרי (ד\"ר יואכים)" -> "כספרי", "ד\"ר כספרי", "יואכים כספרי"
    in_parens = re.findall(r"\(([^)]+)\)", name_he)
    without_parens = re.sub(r"\([^)]*\)", "", name_he).strip()
    clean_without = clean(without_parens)
    if clean_without:
        aliases.add(clean_without)

    titles = [
        "דר",
        "דוקטור",
        "פרופ",
        "פרופסור",
        "הרב",
        "השופט",
        'רא"ל',
        "אלוף",
        "סגן",
        "השר",
        "הנשיא",
        "המשורר",
        "המשוררת",
    ]

    for inner in in_parens:
        clean_inner = clean(inner)
        if clean_without and clean_inner:
            aliases.add(f"{clean_without} {clean_inner}")
            aliases.add(f"{clean_inner} {clean_without}")

            # If inner contains a title like "דר יואכים":
            for t in titles:
                if t in clean_inner:
                    aliases.add(f"{t} {clean_without}")
                    aliases.add(f"{clean_without} {t}")

            no_title_inner = re.sub(
                r"\b(דר|דוקטור|פרופ|פרופסור|הרב|השופט|רא\"ל|אלוף)\b",
                "",
                clean_inner,
            ).strip()
            if no_title_inner:
                aliases.add(f"{clean_without} {no_title_inner}")
                aliases.add(f"{no_title_inner} {clean_without}")

    # B. Comma handling: "לסקוב, חיים" -> "חיים לסקוב", "לסקוב"
    if "," in name_he:
        parts = [clean(p) for p in name_he.split(",") if clean(p)]
        if len(parts) == 2:
            aliases.add(f"{parts[0]} {parts[1]}")
            aliases.add(f"{parts[1]} {parts[0]}")
            aliases.add(parts[0])

    # C. Titles handling: "כספרי דר" <-> "דר כספרי"
    curr = list(aliases)
    for a in curr:
        for t in titles:
            if a.endswith(f" {t}"):
                base = a[: -len(t) - 1].strip()
                aliases.add(base)
                aliases.add(f"{t} {base}")
            elif a.startswith(f"{t} "):
                base = a[len(t) + 1 :].strip()
                aliases.add(base)
                aliases.add(f"{base} {t}")

    # D. Street prefixes: "רחוב", "שדרות", "דרך", "מדרגות", "סמטת"
    prefixes = [
        "רחוב",
        "רחובות",
        "שדרות",
        "שדרת",
        "דרך",
        "סמטת",
        "סמטה",
        "מעלה",
        "מורד",
        "כיכר",
        "שביל",
        "טיילת",
        "מדרגות",
        "נתיב",
        "מבוא",
    ]
    curr = list(aliases)
    for a in curr:
        for p in prefixes:
            if a.startswith(f"{p} "):
                base = a[len(p) + 1 :].strip()
                aliases.add(base)

    # E. Leading 'ה': "הנביאים" <-> "נביאים"
    curr = list(aliases)
    for a in curr:
        if a.startswith("ה") and len(a) > 3:
            aliases.add(a[1:])
        elif not a.startswith("ה") and len(a) > 2:
            aliases.add(f"ה{a}")

    # F. English
    if name_en:
        en_clean = clean(name_en.lower())
        aliases.add(en_clean)
        en_no_title = re.sub(
            r"\b(doctor|dr\.?|professor|prof\.?|street|st\.?|road|rd\.?|avenue|ave\.?)\b",
            "",
            en_clean,
        ).strip()
        if en_no_title:
            aliases.add(en_no_title)

    # Filter out lone first names for multi-word streets
    filtered = set()
    for a in aliases:
        a_clean = clean(a).lower()
        if not a_clean:
            continue
        if is_multi_word:
            if a_clean in FIRST_NAMES_BLACKLIST:
                continue
            if words and a_clean == clean(words[0]).lower():
                continue
        filtered.add(a)

    return sorted(filtered)


# 4. Connect external directory streets to OSM features
# Map each alias to the canonical name_he
alias_to_canonical = {}

# Build initial index
index = []
for name_he, s in streets.items():
    aliases = generate_aliases(s["name_he"], s["name_en"])
    for a in aliases:
        if a not in alias_to_canonical:
            alias_to_canonical[a] = name_he

    index.append(
        {
            "name_he": s["name_he"],
            "name_en": s["name_en"],
            "name_ar": s["name_ar"],
            "aliases": aliases,
            "segments": len(s["segments"]),
        }
    )

# Now check ad.co.il and Wikisource streets — if an external directory name matches an alias, link it!
matched_ad = 0
for ad_name in ad_streets:
    ad_aliases = generate_aliases(ad_name)
    matched = False
    for a in ad_aliases:
        if a in alias_to_canonical:
            canonical = alias_to_canonical[a]
            # Register all ad_name aliases to this canonical
            for aa in ad_aliases:
                aa_clean = clean(aa).lower()
                if (
                    aa_clean not in FIRST_NAMES_BLACKLIST
                    and aa not in alias_to_canonical
                ):
                    alias_to_canonical[aa] = canonical
            matched = True
            break
    if matched:
        matched_ad += 1

matched_wiki = 0
for w_name in wiki_streets:
    w_aliases = generate_aliases(w_name)
    matched = False
    for a in w_aliases:
        if a in alias_to_canonical:
            canonical = alias_to_canonical[a]
            for wa in w_aliases:
                wa_clean = clean(wa).lower()
                if (
                    wa_clean not in FIRST_NAMES_BLACKLIST
                    and wa not in alias_to_canonical
                ):
                    alias_to_canonical[wa] = canonical
            matched = True
            break
    if matched:
        matched_wiki += 1

print(
    f"4. Successfully linked {matched_ad} ad.co.il streets and {matched_wiki} Wikisource streets to OSM."
)

# 5. Build GeoJSON FeatureCollection
features = []
for name_he, s in streets.items():
    features.append(
        {
            "type": "Feature",
            "id": name_he,
            "properties": {
                "name_he": s["name_he"],
                "name_en": s["name_en"],
                "name_ar": s["name_ar"],
                "highway": s["highway"],
                "revealed": False,
            },
            "geometry": {
                "type": "MultiLineString",
                "coordinates": s["segments"],
            },
        }
    )

geojson = {"type": "FeatureCollection", "features": features}

# Write GeoJSON
out_geojson = pathlib.Path("public/haifa-streets.geojson")
out_geojson.write_text(json.dumps(geojson, ensure_ascii=False), encoding="utf-8")
print(
    f"5. Wrote {out_geojson} ({out_geojson.stat().st_size // 1024} KB, {len(features)} streets)"
)

# Write Index with pre-computed aliases
out_index = pathlib.Path("public/haifa-streets-index.json")
# Update each entry's aliases from alias_to_canonical
for entry in index:
    canonical = entry["name_he"]
    canon_words = [
        w
        for w in clean(re.sub(r"\([^)]*\)", "", canonical).replace(",", " ")).split()
        if w
    ]
    is_multi = len(canon_words) >= 2
    all_known_aliases = [
        k
        for k, v in alias_to_canonical.items()
        if v == canonical
        and not (is_multi and clean(k).lower() in FIRST_NAMES_BLACKLIST)
    ]
    entry["aliases"] = sorted(set(all_known_aliases))

out_index.write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")
print(f"6. Wrote {out_index} ({out_index.stat().st_size // 1024} KB)")
print("Done!")
