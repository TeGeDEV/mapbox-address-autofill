import { useCallback, useMemo, useRef } from "react";
import type {
  AutofillItem,
  SelectWithBboxResult,
  Suggestion,
} from "../types/mapbox";
import { useMapboxGeocode } from "./useMapboxGeocode";

export function useCityAutofill({
  accessToken,
  minLength = 2,
  country = "de",
}: {
  accessToken: string;
  minLength?: number;
  country?: string;
}) {
  const { results, isLoading, error, search, retrieve, clear } =
    useMapboxGeocode({
      accessToken,
      country,
    });

  const lastQueryRef = useRef("");

  const fetchCities = useCallback(
    (query: string) => {
      if (query.length < minLength) {
        clear();
        return;
      }
      lastQueryRef.current = query.toLowerCase().trim();
      search({ query, types: "place", limit: 10, proximity: "ip" });
    },
    [search, minLength, clear]
  );

  const items: AutofillItem[] = useMemo(() => {
    const mapped = results.map((s) => ({ suggestion: s }));
    const q = lastQueryRef.current;
    if (!q) return mapped;

    return mapped.sort((a, b) => {
      const aPrefix = a.suggestion.name.toLowerCase().startsWith(q);
      const bPrefix = b.suggestion.name.toLowerCase().startsWith(q);
      if (aPrefix === bPrefix) return 0;
      return aPrefix ? -1 : 1;
    });
  }, [results]);

  const select = useCallback(
    (suggestion: Suggestion): SelectWithBboxResult | null => {
      const r = retrieve(suggestion);
      if (!r) return null;

      let bbox: string | undefined;
      if (r.feature.properties.bbox) {
        bbox = r.feature.properties.bbox.join(",");
      }

      return { parsed: r.parsed, bbox };
    },
    [retrieve]
  );

  return { items, isLoading, error, fetchCities, select, clear };
}
