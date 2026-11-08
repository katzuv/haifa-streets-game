"""
Fetch all named streets in Haifa from OpenStreetMap via Overpass API.
Outputs:
  public/haifa-streets.geojson   - full geometry, one MultiLineString per named street
  public/haifa-streets-index.json - lightweight name list for client-side matching
"""

import json
import pathlib
from collections import defaultdict

import requests

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

QUERY = """
[out:json][timeout:120];
area["name:en"="Haifa"]["admin_level"="8"]->.a;
way(area.a)["highway"]["name"]
  ["highway"~"trunk|primary|secondary|tertiary|residential|living_street|pedestrian|unclassified|service"];
out geom tags;
"""

print("Fetching Haifa streets from Overpass API...")
HEADERS = {"User-Agent": "haifa-streets-game/1.0 (local dev; contact: local)"}
resp = requests.post(OVERPASS_URL, data={"data": QUERY}, headers=HEADERS, timeout=150)
resp.raise_for_status()
data = resp.json()
print(f"Got {len(data['elements'])} OSM way elements.")

# Group way segments by Hebrew name
# A logical "street" = many OSM ways sharing the same name
streets = defaultdict(
    lambda: {"name_he": "", "name_en": "", "name_ar": "", "segments": []}
)

skipped = 0
for el in data["elements"]:
    name_he = el["tags"].get("name", "").strip()
    name_en = el["tags"].get("name:en", "").strip()
    name_ar = el["tags"].get("name:ar", "").strip()

    if not name_he:
        skipped += 1
        continue

    coords = [[n["lon"], n["lat"]] for n in el.get("geometry", [])]
    if len(coords) < 2:
        skipped += 1
        continue

    streets[name_he]["name_he"] = name_he
    streets[name_he]["name_en"] = name_en
    streets[name_he]["name_ar"] = name_ar
    streets[name_he]["segments"].append(coords)

print(f"Skipped {skipped} elements (no name or bad geometry).")
print(f"Found {len(streets)} unique named streets.")

# Build GeoJSON FeatureCollection — one MultiLineString per named street
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
                "revealed": False,
            },
            "geometry": {
                "type": "MultiLineString",
                "coordinates": s["segments"],
            },
        }
    )

geojson = {"type": "FeatureCollection", "features": features}

pathlib.Path("public").mkdir(exist_ok=True)

out_geojson = pathlib.Path("public/haifa-streets.geojson")
out_geojson.write_text(json.dumps(geojson, ensure_ascii=False), encoding="utf-8")
print(f"Wrote {out_geojson} ({out_geojson.stat().st_size // 1024} KB)")

# Lightweight index for client-side matching
index = [
    {
        "name_he": s["name_he"],
        "name_en": s["name_en"],
        "name_ar": s["name_ar"],
        "segments": len(s["segments"]),
    }
    for s in streets.values()
]

out_index = pathlib.Path("public/haifa-streets-index.json")
out_index.write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")
print(f"Wrote {out_index} ({out_index.stat().st_size // 1024} KB)")
print("Done!")
