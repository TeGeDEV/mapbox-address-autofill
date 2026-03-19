import { useCallback, useRef, useState } from "react";
import type {
  GeocodeOptions,
  MapboxFeature,
  MapboxGeocodingResponse,
  RetrieveResult,
  SearchParams,
  Suggestion,
} from "../types/mapbox";
import { mapFeature, parseAddress } from "../utils/mapbox";

const BASE = "https://api.mapbox.com/geocoding/v5/mapbox.places";

export function useMapboxGeocode({
  accessToken,
  country = "de",
  language = "de",
  debounceMs = 300,
}: GeocodeOptions) {
  const [results, setResults] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cache = useRef<Map<string, MapboxFeature>>(new Map());

  const buildUrl = useCallback(
    (params: SearchParams) => {
      const urlParams = new URLSearchParams({
        access_token: accessToken,
        autocomplete: "true",
        language,
        country,
        types: params.types,
        limit: String(params.limit ?? 10),
      });
      if (params.proximity === "ip") urlParams.set("proximity", "ip");

      if (params.bbox) urlParams.set("bbox", params.bbox);
      return `${BASE}/${encodeURIComponent(params.query)}.json?${urlParams}`;
    },
    [accessToken, country, language]
  );

  const search = useCallback(
    (params: SearchParams) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const res = await fetch(buildUrl(params));
          const data: MapboxGeocodingResponse = await res.json();
          const features = data.features;

          features.forEach((f) => cache.current.set(f.id, f));
          setResults(features.map(mapFeature));
        } catch (err) {
          console.error("Geocode error:", err);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      }, debounceMs);
    },
    [buildUrl, debounceMs]
  );

  const searchSingle = useCallback(
    async (params: SearchParams): Promise<Suggestion[]> => {
      const res = await fetch(buildUrl(params));
      const data: MapboxGeocodingResponse = await res.json();
      const features = data.features;
      features.forEach((f) => cache.current.set(f.id, f));
      return features.map(mapFeature);
    },
    [buildUrl]
  );

  const searchDual = useCallback(
    async (
      primary: SearchParams,
      secondary: SearchParams
    ): Promise<{ primary: Suggestion[]; secondary: Suggestion[] }> => {
      const [r1, r2] = await Promise.all([
        fetch(buildUrl(primary)).then((r) =>
          r.json()
        ) as Promise<MapboxGeocodingResponse>,
        fetch(buildUrl(secondary)).then((r) =>
          r.json()
        ) as Promise<MapboxGeocodingResponse>,
      ]);

      const f1 = r1.features;
      const f2 = r2.features;

      [...f1, ...f2].forEach((f) => cache.current.set(f.id, f));

      return {
        primary: f1.map(mapFeature),
        secondary: f2.map(mapFeature),
      };
    },
    [buildUrl]
  );

  const retrieve = useCallback(
    (suggestion: Suggestion): RetrieveResult | null => {
      const f = cache.current.get(suggestion.mapbox_id);
      if (!f) return null;
      return { feature: f, parsed: parseAddress(f) };
    },
    []
  );

  const clear = useCallback(() => setResults([]), []);

  return {
    results,
    isLoading,
    search,
    searchSingle,
    searchDual,
    retrieve,
    clear,
  };
}
