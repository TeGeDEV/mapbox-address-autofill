import { useCallback, useRef, useState } from "react";
import type {
  GeocodeOptions,
  MapboxError,
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
  const [error, setError] = useState<MapboxError | null>(null);

  const parseError = useCallback(
    (err: unknown, status?: number): MapboxError => {
      if (status === 401)
        return { code: 401, message: "Invalid Mapbox access token" };
      if (status === 429)
        return { code: 429, message: "Mapbox request limit exceeded" };
      return { code: "unknown", message: "Unknown error" };
    },
    []
  );

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
      if (!params.query.trim()) {
        setError({ code: "invalid_query", message: "Query must not be empty" });
        return;
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      setError(null);

      timerRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const res = await fetch(buildUrl(params));
          if (!res.ok) {
            setError(parseError(null, res.status));
            setResults([]);
            return;
          }
          const data: MapboxGeocodingResponse = await res.json();
          const features = data.features;

          features.forEach((f) => cache.current.set(f.id, f));
          setResults(features.map(mapFeature));
        } catch (err) {
          setError(parseError(err));
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      }, debounceMs);
    },
    [buildUrl, debounceMs, parseError]
  );

  const searchSingle = useCallback(
    async (params: SearchParams): Promise<Suggestion[]> => {
      if (!params.query.trim())
        throw { code: "invalid_query", message: "Query must not be empty" };
      const res = await fetch(buildUrl(params));
      if (!res.ok) throw parseError(null, res.status);
      const data: MapboxGeocodingResponse = await res.json();
      const features = data.features;
      features.forEach((f) => cache.current.set(f.id, f));
      return features.map(mapFeature);
    },
    [buildUrl, parseError]
  );

  const searchDual = useCallback(
    async (primary: SearchParams, secondary: SearchParams) => {
      const fetchOne = async (params: SearchParams) => {
        const res = await fetch(buildUrl(params));
        if (!res.ok) throw parseError(null, res.status);
        return res.json() as Promise<MapboxGeocodingResponse>;
      };
      const [r1, r2] = await Promise.all([
        fetchOne(primary),
        fetchOne(secondary),
      ]);
      [...r1.features, ...r2.features].forEach((f) =>
        cache.current.set(f.id, f)
      );
      return {
        primary: r1.features.map(mapFeature),
        secondary: r2.features.map(mapFeature),
      };
    },
    [buildUrl, parseError]
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
    error,
    search,
    searchSingle,
    searchDual,
    retrieve,
    clear,
  };
}
