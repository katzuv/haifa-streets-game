import html.parser
import json
import re
import urllib.parse
import urllib.request

headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

HEBREW_LETTERS = [
    "א",
    "ב",
    "ג",
    "ד",
    "ה",
    "ו",
    "ז",
    "ח",
    "ט",
    "י",
    "כ",
    "ל",
    "מ",
    "נ",
    "ס",
    "ע",
    "פ",
    "צ",
    "ק",
    "ר",
    "ש",
    "ת",
]


class WikisourceLetterParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_heading = False
        self.current_text = []
        self.street_headings = []

    def handle_starttag(self, tag, attrs):
        if tag in ("h2", "h3", "h4"):
            self.in_heading = True
            self.current_text = []

    def handle_endtag(self, tag):
        if tag in ("h2", "h3", "h4"):
            self.in_heading = False
            text = "".join(self.current_text).strip()
            # Filter out UI text like "תוכן עניינים", "עריכה", etc.
            text = re.sub(r"\[עריכה\]", "", text).strip()
            if text and not text.startswith("תוכן עניינים") and len(text) > 1:
                self.street_headings.append(text)

    def handle_data(self, data):
        if self.in_heading:
            self.current_text.append(data)


def scrape_all_wikisource():
    all_streets = set()
    print("Scraping Wikisource Haifa streets guide...")
    for letter in HEBREW_LETTERS:
        quoted = urllib.parse.quote(f"מדריך_רחובות_חיפה/{letter}")
        url = f"https://he.wikisource.org/wiki/{quoted}"
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as resp:
                content = resp.read().decode("utf-8")
            parser = WikisourceLetterParser()
            parser.feed(content)
            for h in parser.street_headings:
                all_streets.add(h)
            print(f"  Letter {letter}: {len(parser.street_headings)} streets")
        except Exception as e:
            print(f"  Letter {letter} failed:", e)

    print(f"Total unique streets from Wikisource: {len(all_streets)}")
    return sorted(all_streets)


def scrape_all_ad_co_il():
    print("Scraping ad.co.il Haifa streets...")
    url = "https://www.ad.co.il/city/haifa/streets"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as resp:
        content = resp.read().decode("utf-8")

    links = re.findall(r'<a\s+[^>]*href="([^"]+)"[^>]*>([^<]+)</a>', content)
    streets = set()
    for link_item in links:
        if "/street/" in link_item[0] and "/haifa" in link_item[0]:
            name = link_item[1].strip()
            # clean html entities
            name = (
                name.replace("&#x27;", "'").replace("&quot;", '"').replace("&amp;", "&")
            )
            if name:
                streets.add(name)

    print(f"Total unique streets from ad.co.il: {len(streets)}")
    return sorted(streets)


if __name__ == "__main__":
    wiki_streets = scrape_all_wikisource()
    ad_streets = scrape_all_ad_co_il()

    with open("public/wikisource_streets.json", "w", encoding="utf-8") as f:
        json.dump(wiki_streets, f, ensure_ascii=False, indent=2)

    with open("public/ad_streets.json", "w", encoding="utf-8") as f:
        json.dump(ad_streets, f, ensure_ascii=False, indent=2)

    print("Saved public/wikisource_streets.json and public/ad_streets.json!")
