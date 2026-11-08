// src/components/GameMap.tsx
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import workerSourceRaw from "maplibre-gl/dist/maplibre-gl-worker.mjs?raw";
import { HAIFA_STREETS_GEOJSON } from "../data/haifaData";

// Create classic inline worker blob with '#worker.cjs' suffix so MapLibre initializes
// it as a classic worker without network fetches (100% works on file:// protocol).
const workerSource = workerSourceRaw.replace("export{dC as default};", "");
const workerBlob = new Blob([workerSource], { type: "application/javascript" });
const workerUrl = URL.createObjectURL(workerBlob) + "#worker.cjs";
maplibregl.setWorkerUrl(workerUrl);

interface Props {
  revealed: Set<string>;
  lastFound: string | null;
}

const HAIFA_BOUNDS: [[number, number], [number, number]] = [
  [34.945, 32.750], // Southwest [lon, lat]
  [35.085, 32.855], // Northeast [lon, lat]
];

export function GameMap({ revealed, lastFound }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#ffffff" },
          },
        ],
      },
      bounds: HAIFA_BOUNDS,
      fitBoundsOptions: { padding: 30 },
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: "© OpenStreetMap contributors",
      }),
      "bottom-right"
    );
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-left"
    );

    map.on("error", (e) => {
      console.error("MapLibre error:", e);
      if (e.error?.message) {
        setMapError(e.error.message);
      }
    });

    const setupLayers = () => {
      if (map.getSource("streets")) return;

      try {
        // Add GeoJSON source directly with embedded object
        map.addSource("streets", {
          type: "geojson",
          data: HAIFA_STREETS_GEOJSON,
        });

        // 1. All streets (grey underlay) — visible, high contrast
        map.addLayer({
          id: "streets-all",
          type: "line",
          source: "streets",
          paint: {
            "line-color": "#94a3b8", // slate-400
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10,
              1.2,
              13,
              2.2,
              16,
              4.5,
            ],
            "line-opacity": 0.85,
          },
        });

        // 2. Revealed streets — bold blue
        const revealedNames = Array.from(revealed);
        map.addLayer({
          id: "streets-revealed",
          type: "line",
          source: "streets",
          filter: ["in", ["get", "name_he"], ["literal", revealedNames]],
          paint: {
            "line-color": "#2563eb", // blue-600
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10,
              2.5,
              13,
              4.5,
              16,
              8,
            ],
            "line-opacity": 1,
          },
        });

        // 3. Flash layer — bright amber
        map.addLayer({
          id: "streets-flash",
          type: "line",
          source: "streets",
          filter: ["==", ["get", "name_he"], lastFound || ""],
          paint: {
            "line-color": "#f59e0b", // amber-500
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10,
              4,
              13,
              8,
              16,
              14,
            ],
            "line-opacity": 1,
          },
        });

        setLoaded(true);
      } catch (err: unknown) {
        console.error("Error setting up map layers:", err);
        setMapError(String(err));
      }
    };

    if (map.loaded()) {
      setupLayers();
    } else {
      map.once("load", setupLayers);
    }

    map.once("idle", () => {
      if (!map.getSource("streets")) {
        setupLayers();
      }
      map.resize();
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync revealed streets to layer filter
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !map.getLayer("streets-revealed")) return;

    const names = Array.from(revealed);
    map.setFilter("streets-revealed", [
      "in",
      ["get", "name_he"],
      ["literal", names],
    ]);
  }, [revealed, loaded]);

  // Flash newly revealed street
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !map.getLayer("streets-flash") || !lastFound) return;

    map.setFilter("streets-flash", ["==", ["get", "name_he"], lastFound]);

    const timer = setTimeout(() => {
      if (map.getLayer("streets-flash")) {
        map.setFilter("streets-flash", ["==", ["get", "name_he"], ""]);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [lastFound, loaded]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full absolute inset-0" />

      {mapError && (
        <div className="absolute top-4 left-14 z-20 bg-red-600 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
          ⚠️ Map Error: {mapError}
        </div>
      )}
    </div>
  );
}
