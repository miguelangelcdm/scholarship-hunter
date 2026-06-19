import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Map, useMap, MapPopup, MapControls } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Globe, 
  MapPin, 
  X, 
  Search, 
  ThumbsUp, 
  ThumbsDown, 
  Circle, 
  ChevronLeft, 
  ChevronRight, 
  MapIcon,
  Layers,
  Heart
} from "lucide-react";
import countryToContinent from "@/lib/country_to_continent.json";
import { toast } from "sonner";

export interface InteractiveMapProps {
  desiredCountries: string[];
  undesiredCountries: string[];
  desiredContinents: string[];
  undesiredContinents: string[];
  onToggleCountry: (country: string, status: "desired" | "undesired" | "neutral") => void;
  onToggleContinent: (continent: string, status: "desired" | "undesired" | "neutral") => void;
}

const CONTINENTS = [
  "North America",
  "South America",
  "Europe",
  "Asia",
  "Africa",
  "Oceania"
];

const getContinentForCountry = (countryName: string) => {
  const match = countryToContinent.find(
    (c) => c.country.toLowerCase() === countryName.toLowerCase()
  );
  return match ? match.continent : "Other / All";
};

const CONTINENT_CENTERS: Record<string, { center: [number, number]; zoom: number }> = {
  "North America": { center: [-100, 40], zoom: 3 },
  "South America": { center: [-60, -20], zoom: 3 },
  "Europe": { center: [15, 50], zoom: 3.5 },
  "Asia": { center: [90, 30], zoom: 3 },
  "Africa": { center: [20, 0], zoom: 3 },
  "Oceania": { center: [135, -25], zoom: 3.5 }
};

function MapInitFocus({
  desiredCountries,
  desiredContinents,
  baseGeoData
}: {
  desiredCountries: string[];
  desiredContinents: string[];
  baseGeoData: GeoJSON.FeatureCollection | null;
}) {
  const { map, isLoaded } = useMap();
  const [focusedSignature, setFocusedSignature] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !map || !baseGeoData) return;

    const currentSignature = [
      desiredCountries.join(','), 
      desiredContinents.join(',')
    ].join('|');

    // Prevent re-focusing if the signature hasn't changed
    if (focusedSignature === currentSignature) return;

    // Prevent focus resets if we already focused on actual loaded user preferences (non-empty data signature)
    const wasPopulated = (sig: string | null) => sig && sig !== "|";
    if (wasPopulated(focusedSignature)) return;

    let targetCenter: [number, number] | null = null;
    let targetZoom = 1.6;

    // 1. Try a random desired country
    if (desiredCountries.length > 0) {
      const randomCountryName = desiredCountries[Math.floor(Math.random() * desiredCountries.length)];
      const feature = baseGeoData.features.find(
        (f) => f.properties?.name?.toLowerCase() === randomCountryName.toLowerCase()
      );
      if (feature) {
        const getFeatureCentroid = (feat: any): [number, number] => {
          if (feat.geometry.type === "Point") {
            return feat.geometry.coordinates;
          }
          let coords: [number, number][] = [];
          if (feat.geometry.type === "Polygon") {
            coords = feat.geometry.coordinates[0];
          } else if (feat.geometry.type === "MultiPolygon") {
            coords = feat.geometry.coordinates[0][0];
          }
          if (coords.length === 0) return [0, 20];
          let sumLng = 0;
          let sumLat = 0;
          coords.forEach(([lng, lat]) => {
            sumLng += lng;
            sumLat += lat;
          });
          return [sumLng / coords.length, sumLat / coords.length];
        };
        targetCenter = getFeatureCentroid(feature);
        targetZoom = 4;
      }
    }

    // 2. Fallback to a random desired continent
    if (!targetCenter && desiredContinents.length > 0) {
      const randomContinentName = desiredContinents[Math.floor(Math.random() * desiredContinents.length)];
      const match = Object.keys(CONTINENT_CENTERS).find(
        (key) => key.toLowerCase() === randomContinentName.toLowerCase()
      );
      if (match) {
        targetCenter = CONTINENT_CENTERS[match].center;
        targetZoom = CONTINENT_CENTERS[match].zoom;
      }
    }

    // 3. Fallback to a random continent from the 6 major ones
    if (!targetCenter) {
      const randomIndex = Math.floor(Math.random() * CONTINENTS.length);
      const randomContinent = CONTINENTS[randomIndex];
      const match = Object.keys(CONTINENT_CENTERS).find(
        (key) => key.toLowerCase() === randomContinent.toLowerCase()
      );
      if (match) {
        targetCenter = CONTINENT_CENTERS[match].center;
        targetZoom = CONTINENT_CENTERS[match].zoom;
      }
    }

    if (targetCenter) {
      map.flyTo({
        center: targetCenter,
        zoom: targetZoom,
        duration: 1800,
        essential: true
      });
      setFocusedSignature(currentSignature);
    }
  }, [map, isLoaded, baseGeoData, desiredCountries, desiredContinents, focusedSignature]);

  return null;
}

// Component to handle GeoJSON country layers coloring
function GeoJsonLayer({
  geoData,
  isDarkMode,
  onClick,
  onRightClick,
}: {
  geoData: GeoJSON.FeatureCollection | null;
  isDarkMode: boolean;
  onClick: (country: string, lngLat: [number, number]) => void;
  onRightClick: (country: string, lngLat: [number, number]) => void;
}) {
  const { map, isLoaded } = useMap();
  
  const onClickRef = useRef(onClick);
  const onRightClickRef = useRef(onRightClick);

  useEffect(() => {
    onClickRef.current = onClick;
    onRightClickRef.current = onRightClick;
  }, [onClick, onRightClick]);

  useEffect(() => {
    if (!isLoaded || !map) return;

    // Prevent default context menu on canvas to allow custom right-clicks
    const canvas = map.getCanvas();
    const preventContextMenu = (e: MouseEvent) => e.preventDefault();
    canvas.addEventListener("contextmenu", preventContextMenu);

    if (!map.getSource("countries")) {
      map.addSource("countries", {
        type: "geojson",
        data: geoData || { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "countries-fill",
        type: "fill",
        source: "countries",
        paint: {
          "fill-color": [
            "match",
            ["get", "status"],
            "desired", "#22c55e", // Green for desired
            "undesired", "#ef4444", // Red for undesired
            "neutral", isDarkMode ? "#0a0a0c" : "#e4e4e7",
            isDarkMode ? "#0a0a0c" : "#e4e4e7" // fallback
          ],
          "fill-opacity": [
            "match",
            ["get", "status"],
            "desired", 0.45,
            "undesired", 0.45,
            0.15
          ],
        },
      });

      map.addLayer({
        id: "countries-line",
        type: "line",
        source: "countries",
        paint: {
          "line-color": isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
          "line-width": 0.5,
        },
      });

      map.on("mouseenter", "countries-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "countries-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("click", "countries-fill", (e) => {
        if (e.features && e.features.length > 0) {
          const countryName = e.features[0].properties?.name;
          if (countryName) {
            onClickRef.current(countryName, [e.lngLat.lng, e.lngLat.lat]);
          }
        }
      });

      map.on("contextmenu", "countries-fill", (e) => {
        e.preventDefault();
        if (e.features && e.features.length > 0) {
          const countryName = e.features[0].properties?.name;
          if (countryName) {
            onRightClickRef.current(countryName, [e.lngLat.lng, e.lngLat.lat]);
          }
        }
      });
    } else if (geoData) {
      const source = map.getSource("countries") as maplibregl.GeoJSONSource;
      source.setData(geoData);
      
      map.setPaintProperty("countries-fill", "fill-color", [
        "match",
        ["get", "status"],
        "desired", "#22c55e",
        "undesired", "#ef4444",
        "neutral", isDarkMode ? "#0a0a0c" : "#e4e4e7",
        isDarkMode ? "#0a0a0c" : "#e4e4e7" // fallback
      ]);
      map.setPaintProperty("countries-fill", "fill-opacity", [
        "match",
        ["get", "status"],
        "desired", 0.45,
        "undesired", 0.45,
        0.15
      ]);
      map.setPaintProperty("countries-line", "line-color", isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)");
    }

    return () => {
      canvas.removeEventListener("contextmenu", preventContextMenu);
    };
  }, [map, isLoaded, geoData, isDarkMode]);

  return null;
}
const MAP_STYLES = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
};

export function InteractiveMap({
  desiredCountries,
  undesiredCountries,
  desiredContinents,
  undesiredContinents,
  onToggleCountry,
  onToggleContinent,
}: InteractiveMapProps) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return true;
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);
  
  const [baseGeoData, setBaseGeoData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [popupInfo, setPopupInfo] = useState<{
    country: string;
    continent: string;
    lngLat: [number, number];
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Load geojson on mount
  useEffect(() => {
    fetch("/countries.geojson")
      .then((res) => res.json())
      .then((data) => setBaseGeoData(data))
      .catch((err) => console.error("Failed to load geojson:", err));
  }, []);

  // Compute country statuses based on model data
  const geoDataWithStatus = useMemo(() => {
    if (!baseGeoData) return null;

    const features = baseGeoData.features.map((feature) => {
      const countryName = feature.properties?.name || "";
      const continent = getContinentForCountry(countryName);

      const dCount = desiredCountries.map(c => c.toLowerCase());
      const uCount = undesiredCountries.map(c => c.toLowerCase());
      const dCont = desiredContinents.map(c => c.toLowerCase());
      const uCont = undesiredContinents.map(c => c.toLowerCase());

      let status = "neutral";
      if (dCount.includes(countryName.toLowerCase())) {
        status = "desired";
      } else if (uCount.includes(countryName.toLowerCase())) {
        status = "undesired";
      } else if (dCont.includes(continent.toLowerCase())) {
        status = "desired";
      } else if (uCont.includes(continent.toLowerCase())) {
        status = "undesired";
      }

      return {
        ...feature,
        properties: {
          ...feature.properties,
          continent,
          status,
        },
      };
    });

    return { ...baseGeoData, features };
  }, [baseGeoData, desiredCountries, undesiredCountries, desiredContinents, undesiredContinents]);

  // Compute dynamic counters representing all affected countries + continents
  const allCountriesStatus = useMemo(() => {
    return countryToContinent.map(c => {
      const name = c.country;
      const cont = c.continent;
      
      const dCount = desiredCountries.map(x => x.toLowerCase());
      const uCount = undesiredCountries.map(x => x.toLowerCase());
      const dCont = desiredContinents.map(x => x.toLowerCase());
      const uCont = undesiredContinents.map(x => x.toLowerCase());
      
      let status: "desired" | "undesired" | "neutral" = "neutral";
      if (dCount.includes(name.toLowerCase())) {
        status = "desired";
      } else if (uCount.includes(name.toLowerCase())) {
        status = "undesired";
      } else if (dCont.includes(cont.toLowerCase())) {
        status = "desired";
      } else if (uCont.includes(cont.toLowerCase())) {
        status = "undesired";
      }
      return { name, continent: cont, status };
    });
  }, [desiredCountries, undesiredCountries, desiredContinents, undesiredContinents]);

  const desiredCountTotal = useMemo(() => {
    return allCountriesStatus.filter(c => c.status === "desired").length;
  }, [allCountriesStatus]);

  const avoidedCountTotal = useMemo(() => {
    return allCountriesStatus.filter(c => c.status === "undesired").length;
  }, [allCountriesStatus]);

  const selectedContinentsCount = useMemo(() => {
    return desiredContinents.length + undesiredContinents.length;
  }, [desiredContinents, undesiredContinents]);

  const handleCountryLeftClick = useCallback((country: string, lngLat: [number, number]) => {
    const continent = getContinentForCountry(country);
    
    const isDesired = desiredCountries.map(c => c.toLowerCase()).includes(country.toLowerCase());
    const nextStatus = isDesired ? "neutral" : "desired";
    onToggleCountry(country, nextStatus);
    
    setPopupInfo({ country, continent, lngLat });
  }, [desiredCountries, onToggleCountry]);

  const handleCountryRightClick = useCallback((country: string, lngLat: [number, number]) => {
    const continent = getContinentForCountry(country);
    
    const isAvoided = undesiredCountries.map(c => c.toLowerCase()).includes(country.toLowerCase());
    const nextStatus = isAvoided ? "neutral" : "undesired";
    onToggleCountry(country, nextStatus);

    setPopupInfo({ country, continent, lngLat });
  }, [undesiredCountries, onToggleCountry]);

  // Filter countries from json mapping list for the sidebar
  const filteredCountries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    
    // Extract unique countries list
    const uniqueCountries = Array.from(new Set(countryToContinent.map(c => c.country)))
      .map(name => {
        const cont = getContinentForCountry(name);
        
        const isDesiredCountry = desiredCountries.map(c => c.toLowerCase()).includes(name.toLowerCase());
        const isUndesiredCountry = undesiredCountries.map(c => c.toLowerCase()).includes(name.toLowerCase());
        const isDesiredCont = desiredContinents.map(c => c.toLowerCase()).includes(cont.toLowerCase());
        const isUndesiredCont = undesiredContinents.map(c => c.toLowerCase()).includes(cont.toLowerCase());

        let status: "desired" | "undesired" | "neutral" = "neutral";
        if (isDesiredCountry) {
          status = "desired";
        } else if (isUndesiredCountry) {
          status = "undesired";
        } else if (isDesiredCont) {
          status = "desired";
        } else if (isUndesiredCont) {
          status = "undesired";
        }
        
        return { name, continent: cont, status };
      });

    if (!query) {
      // If no query, return currently desired and undesired countries first to keep sidebar uncluttered
      return uniqueCountries.filter(c => c.status !== "neutral");
    }

    return uniqueCountries.filter(c => c.name.toLowerCase().includes(query));
  }, [searchQuery, desiredCountries, undesiredCountries, desiredContinents, undesiredContinents]);

  return (
    <div className="flex flex-col lg:flex-row border border-border/40 rounded-2xl overflow-hidden bg-card/25 backdrop-blur-md h-[600px] w-full shadow-2xl relative">
      
      {/* SIDEBAR */}
      <div 
        className={`shrink-0 transition-all duration-300 ease-in-out flex flex-col bg-card/50 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-border/40 h-full
          ${isSidebarOpen ? "w-full lg:w-[250px]" : "w-full lg:w-0 overflow-hidden border-r-0"}`}
      >
        {isSidebarOpen && (
          <>
            {/* Header */}
            <div className="p-4 border-b border-border/40">
              {/* <div className="flex items-center gap-2">
                <div className="bg-primary/10 text-primary p-1.5 rounded-lg">
                  <Globe className="w-5 h-5 animate-spin-slow" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">Geographic Preferences</span>
                  <span className="text-muted-foreground text-[10px]">Continents & Countries target matching</span>
                </div>
              </div> */}

              {/* Stats Boxes */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-2 py-2.5 text-center">
                  <p className="text-xl font-bold text-emerald-500 leading-none">
                    {desiredCountTotal}
                  </p>
                  <p className="text-[9px] text-emerald-500/80 mt-1 uppercase font-bold tracking-wider">Desired</p>
                </div>
                <div className="bg-rose-500/10 dark:bg-rose-500/5 border border-rose-500/20 rounded-xl px-2 py-2.5 text-center">
                  <p className="text-xl font-bold text-rose-500 leading-none">
                    {avoidedCountTotal}
                  </p>
                  <p className="text-[9px] text-rose-500/80 mt-1 uppercase font-bold tracking-wider">Avoided</p>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin scrollbar-thumb-border/60">
              
              {/* Country Preferences List & Search */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" /> Country Settings
                </h3>

                {/* Country Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search countries..."
                    className="pl-9 bg-background/50 border border-border/40 rounded-xl text-xs"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")} 
                      className="absolute right-3 top-3 hover:text-foreground text-muted-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Country Rows */}
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                  {filteredCountries.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-6">
                      {searchQuery ? "No countries match your search." : "No specific countries targeted yet. Search above to add."}
                    </p>
                  ) : (
                    filteredCountries.map((c) => {
                      const isContDesired = desiredContinents.map(co => co.toLowerCase()).includes(c.continent.toLowerCase());
                      const isContUndesired = undesiredContinents.map(co => co.toLowerCase()).includes(c.continent.toLowerCase());
                      
                      const isExplicitDesired = desiredCountries.map(x => x.toLowerCase()).includes(c.name.toLowerCase());
                      const isExplicitUndesired = undesiredCountries.map(x => x.toLowerCase()).includes(c.name.toLowerCase());
                      const isExplicit = isExplicitDesired || isExplicitUndesired;
                      const isInherited = !isExplicit && (isContDesired || isContUndesired);

                      return (
                        <div key={c.name} className="flex items-center justify-between p-2 rounded-lg bg-background/25 hover:bg-background/60 border border-border/20 transition-all text-xs">
                          <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                            <span className="font-semibold text-foreground truncate">{c.name}</span>
                            <span className="text-[9px] text-muted-foreground">{c.continent}</span>
                          </div>

                          <div className="flex gap-0.5 bg-muted/20 p-0.5 rounded-lg border border-border/20 shrink-0">
                            <button
                              type="button"
                              onClick={() => onToggleCountry(c.name, c.status === "desired" ? "neutral" : "desired")}
                              className={`p-1 px-2 rounded-md transition-all text-[10px] font-semibold flex items-center gap-0.5
                                ${c.status === "desired" 
                                  ? isExplicitDesired
                                    ? "bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 opacity-100 font-bold" 
                                    : "bg-emerald-500/10 text-emerald-500/70 border border-emerald-500/20 opacity-85"
                                  : "text-muted-foreground opacity-30 hover:opacity-100 hover:text-emerald-500"}`}
                              title={isInherited ? `Inherited from continent selection (click to override)` : `Mark as desired`}
                            >
                              <ThumbsUp className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onToggleCountry(c.name, c.status === "undesired" ? "neutral" : "undesired")}
                              className={`p-1 px-2 rounded-md transition-all text-[10px] font-semibold flex items-center gap-0.5
                                ${c.status === "undesired" 
                                  ? isExplicitUndesired
                                    ? "bg-rose-500/25 text-rose-400 border border-rose-500/40 opacity-100 font-bold" 
                                    : "bg-rose-500/10 text-rose-500/70 border border-rose-500/20 opacity-85"
                                  : "text-muted-foreground opacity-30 hover:opacity-100 hover:text-rose-500"}`}
                              title={isInherited ? `Inherited from continent selection (click to override)` : `Mark as undesired`}
                            >
                              <ThumbsDown className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Summary Footer */}
            <div className="p-4 border-t border-border/40 bg-background/30 text-xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Preferences Summary</span>
              <div className="bg-background/50 rounded-xl border border-border/30 p-3 space-y-2">
                <div className="flex justify-between items-center text-[11px] font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Desired Locations
                  </span>
                  <span className="font-bold text-emerald-400">{desiredCountTotal} Countries</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Avoided Locations
                  </span>
                  <span className="font-bold text-rose-400">{avoidedCountTotal} Countries</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* RIGHT PANEL (MAP + CONTINENTS) */}
      <div className="flex-1 flex flex-col h-full bg-zinc-950/20 overflow-hidden">
        
        {/* TOP: MAP AREA */}
        <div className="flex-1 relative overflow-hidden min-h-[380px]">
          <div className="absolute inset-0 w-full h-full">
            <Map
              initialViewport={{
                center: [0, 20],
                zoom: 1.6,
              }}
              projection={{ type: "globe" }}
              theme={isDarkMode ? "dark" : "light"}
              styles={MAP_STYLES}
            >
              <MapControls position="bottom-right" showZoom={true} />
              
              <GeoJsonLayer 
                geoData={geoDataWithStatus} 
                isDarkMode={isDarkMode} 
                onClick={handleCountryLeftClick} 
                onRightClick={handleCountryRightClick}
              />

              <MapInitFocus 
                desiredCountries={desiredCountries}
                desiredContinents={desiredContinents}
                baseGeoData={baseGeoData}
              />
            </Map>
          </div>

          {/* Toggle Sidebar Button on Map */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute top-4 left-4 z-20 bg-background/80 hover:bg-background border border-border/50 text-foreground p-2 rounded-xl backdrop-blur-md shadow-lg transition-all"
            title={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {/* Legend Overlay */}
          <div className="absolute top-4 right-4 z-20 bg-background/80 hover:bg-background border border-border/50 px-3 py-2 rounded-xl backdrop-blur-md shadow-lg flex items-center gap-3 text-[10px] font-bold transition-all">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse-slow" />
              <span>Desired (Pros)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse-slow" />
              <span>Avoided (Cons)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 dark:bg-zinc-800" />
              <span>Neutral</span>
            </div>
          </div>

          {/* Custom Floating Country Detail Card (Saves Popup from Container Boundary Clipping) */}
          {popupInfo && (
            <div className="absolute bottom-4 left-4 z-25 w-64 p-4 rounded-xl border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl animate-in fade-in-0 slide-in-from-bottom-5 duration-200">
              <button
                type="button"
                onClick={() => setPopupInfo(null)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
                title="Close overlay"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="flex flex-col gap-3">
                <div className="border-b border-border/30 pb-2">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary animate-pulse" />
                    {popupInfo.country}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{popupInfo.continent}</p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Preference</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={desiredCountries.map(c => c.toLowerCase()).includes(popupInfo.country.toLowerCase()) ? "default" : "outline"}
                      className={desiredCountries.map(c => c.toLowerCase()).includes(popupInfo.country.toLowerCase()) 
                        ? "h-8 text-xs flex-1 bg-emerald-500 hover:bg-emerald-600 text-white border-0 font-bold" 
                        : "h-8 text-xs flex-1"}
                      onClick={() => {
                        const isCurrentlyDesired = desiredCountries.map(c => c.toLowerCase()).includes(popupInfo.country.toLowerCase());
                        onToggleCountry(popupInfo.country, isCurrentlyDesired ? "neutral" : "desired");
                      }}
                    >
                      Desired
                    </Button>
                    <Button
                      size="sm"
                      variant={undesiredCountries.map(c => c.toLowerCase()).includes(popupInfo.country.toLowerCase()) ? "destructive" : "outline"}
                      className={undesiredCountries.map(c => c.toLowerCase()).includes(popupInfo.country.toLowerCase()) 
                        ? "h-8 text-xs flex-1 bg-rose-500 hover:bg-rose-600 text-white border-0 font-bold" 
                        : "h-8 text-xs flex-1"}
                      onClick={() => {
                        const isCurrentlyUndesired = undesiredCountries.map(c => c.toLowerCase()).includes(popupInfo.country.toLowerCase());
                        onToggleCountry(popupInfo.country, isCurrentlyUndesired ? "neutral" : "undesired");
                      }}
                    >
                      Avoided
                    </Button>
                  </div>
                  {(() => {
                    const isExplicitDesired = desiredCountries.map(c => c.toLowerCase()).includes(popupInfo.country.toLowerCase());
                    const isExplicitUndesired = undesiredCountries.map(c => c.toLowerCase()).includes(popupInfo.country.toLowerCase());
                    const isExplicit = isExplicitDesired || isExplicitUndesired;
                    const isContDesired = desiredContinents.map(c => c.toLowerCase()).includes(popupInfo.continent.toLowerCase());
                    const isContUndesired = undesiredContinents.map(c => c.toLowerCase()).includes(popupInfo.continent.toLowerCase());
                    const isInherited = !isExplicit && (isContDesired || isContUndesired);
                    
                    if (isInherited) {
                      return (
                        <p className="text-[9px] text-amber-500 italic mt-1 leading-tight">
                          Preference inherited from continent {popupInfo.continent} (click Desired/Avoided to override).
                        </p>
                      );
                    }
                    if (isExplicit && (isContDesired || isContUndesired)) {
                      return (
                        <p className="text-[9px] text-emerald-500 italic mt-1 leading-tight">
                          Continent default overridden explicitly for {popupInfo.country}.
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM: TARGET CONTINENTS PANEL */}
        <div className="p-3 bg-background/40 border-t border-border/40 flex flex-col shrink-0">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
            <Layers className="w-3.5 h-3.5 text-primary animate-pulse" /> Target Continents Selection
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pr-1">
            {CONTINENTS.map((continent) => {
              const isDesired = desiredContinents.map(c => c.toLowerCase()).includes(continent.toLowerCase());
              const isUndesired = undesiredContinents.map(c => c.toLowerCase()).includes(continent.toLowerCase());
              const currentStatus = isDesired ? "desired" : isUndesired ? "undesired" : "neutral";
              
              // Abbreviate continent names for space efficiency
              const displayContinentName = continent === "North America" 
                ? "N. America" 
                : continent === "South America" 
                  ? "S. America" 
                  : continent;

              return (
                <div key={continent} className="flex items-center justify-between p-1.5 px-2.5 rounded-xl bg-card/65 hover:bg-card/90 border border-border/40 transition-all text-xs h-10">
                  <span className="font-semibold text-foreground text-[11px] truncate">
                    {displayContinentName}
                  </span>
                  
                  {/* Selector Buttons */}
                  <div className="flex gap-0.5 bg-muted/40 p-0.5 rounded-lg border border-border/30 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleContinent(continent, currentStatus === "desired" ? "neutral" : "desired")}
                      className={`p-0.5 px-1.5 rounded-md transition-all text-[9px] font-bold flex items-center gap-0.5
                        ${currentStatus === "desired" 
                          ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 shadow-sm" 
                          : "hover:text-emerald-500 text-muted-foreground"}`}
                    >
                      <ThumbsUp className="w-2.5 h-2.5" /> Pros
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleContinent(continent, currentStatus === "undesired" ? "neutral" : "undesired")}
                      className={`p-0.5 px-1.5 rounded-md transition-all text-[9px] font-bold flex items-center gap-0.5
                        ${currentStatus === "undesired" 
                          ? "bg-rose-500/20 text-rose-500 border border-rose-500/40 shadow-sm" 
                          : "hover:text-rose-500 text-muted-foreground"}`}
                    >
                      <ThumbsDown className="w-2.5 h-2.5" /> Cons
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}

