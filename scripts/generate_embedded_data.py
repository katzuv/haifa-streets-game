import json
from pathlib import Path

geojson_raw = Path("public/haifa-streets.geojson").read_text(encoding="utf-8")
index_raw = Path("public/haifa-streets-index.json").read_text(encoding="utf-8")

# Validate they are valid JSON
json.loads(geojson_raw)
json.loads(index_raw)

out_file = Path("src/data/haifaData.ts")
out_file.parent.mkdir(parents=True, exist_ok=True)

ts_content = f"""// src/data/haifaData.ts
// Embedded Haifa Streets GeoJSON and Index for 100% self-contained single-file bundle.
import type {{ FeatureCollection }} from "geojson";
import type {{ StreetEntry }} from "../utils/normalize";

export const HAIFA_STREETS_GEOJSON: FeatureCollection = JSON.parse({json.dumps(geojson_raw)});

export const HAIFA_STREETS_INDEX: StreetEntry[] = JSON.parse({json.dumps(index_raw)});
"""

out_file.write_text(ts_content, encoding="utf-8")
print(f"Generated {out_file} ({out_file.stat().st_size // 1024} KB)")
