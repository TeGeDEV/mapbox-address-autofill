import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ApiStatus,
  GeocodeOptions,
  MapboxError,
  MapboxFeature,
  MapboxFeatureCollection,
  RetrieveResult,
  SearchParams,
  Suggestion,
} from "../types/mapbox";
import { mapFeature, parseAddress } from "../utils/mapbox";

const BASE_V6 = "https://api.mapbox.com/search/geocode/v6/forward";

export function useMapboxGeocode({
  accessToken,
  country = "de",
  language = "de",
  debounceMs = 300,
}: GeocodeOptions) {
  const [results, setResults] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<MapboxError | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("ok");

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cache = useRef<Map<string, MapboxFeature>>(new Map());

  const parseError = useCallback(
    (_err: unknown, status?: number): MapboxError => {
      if (status === 401)
        return { code: 401, message: "Invalid Mapbox access token" };
      if (status === 429)
        return { code: 429, message: "Mapbox request limit exceeded" };
      return { code: "unknown", message: "Unknown error" };
    },
    []
  );

  const handleErrorStatus = useCallback((status?: number, err?: unknown) => {
    if (status === 401) {
      console.error("[Mapbox] Invalid access token (401)");
      setApiStatus("blocked_401");
    } else if (status === 429) {
      console.error("[Mapbox] Request limit exceeded (429)");
      setApiStatus("blocked_429");
    } else {
      console.error("[Mapbox] Temporary error:", err ?? `HTTP ${status}`);
      setApiStatus("error_temporary");
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => {
        setApiStatus("ok");
      }, 60000);
    }
  }, []);

  const buildUrl = useCallback(
    (params: SearchParams) => {
      const urlParams = new URLSearchParams({
        q: params.query,
        country,
        types: params.types,
        language,
        access_token: accessToken,
        autocomplete: "true",
        limit: String(params.limit ?? 10),
      });
      if (params.proximity === "ip") urlParams.set("proximity", "ip");
      if (params.bbox) urlParams.set("bbox", params.bbox);
      return `${BASE_V6}?${urlParams}`;
    },
    [accessToken, country, language]
  );

  const search = useCallback(
    (params: SearchParams) => {
      if (apiStatus !== "ok") return;
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
            handleErrorStatus(res.status);
            setResults([]);
            return;
          }
          const data: MapboxFeatureCollection = await res.json();
          const features = data.features;
          features.forEach((f) => cache.current.set(f.id, f));
          setResults(features.map(mapFeature));
        } catch (err) {
          setError(parseError(err));
          handleErrorStatus(undefined, err);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      }, debounceMs);
    },
    [buildUrl, debounceMs, parseError, handleErrorStatus, apiStatus]
  );

  const searchDual = useCallback(
    (
      primary: SearchParams,
      secondary: SearchParams
    ): Promise<{ primary: Suggestion[]; secondary: Suggestion[] }> => {
      return new Promise((resolve, reject) => {
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(async () => {
          if (apiStatus !== "ok")
            return resolve({ primary: [], secondary: [] });

          const fetchOne = async (params: SearchParams) => {
            const res = await fetch(buildUrl(params));
            if (!res.ok) {
              handleErrorStatus(res.status);
              throw parseError(null, res.status);
            }
            return res.json() as Promise<MapboxFeatureCollection>;
          };

          try {
            const [r1, r2] = await Promise.all([
              fetchOne(primary),
              fetchOne(secondary),
            ]);
            [...r1.features, ...r2.features].forEach((f) =>
              cache.current.set(f.id, f)
            );
            resolve({
              primary: r1.features.map(mapFeature),
              secondary: r2.features.map(mapFeature),
            });
          } catch (err) {
            reject(err);
          }
        }, debounceMs);
      });
    },
    [buildUrl, parseError, handleErrorStatus, apiStatus, debounceMs]
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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  return {
    results,
    isLoading,
    error,
    apiStatus,
    search,
    searchDual,
    retrieve,
    clear,
  };
}
