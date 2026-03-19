import { useCallback, useMemo, useRef } from "react";
import type {
  SelectWithBboxResult,
  SimpleItem,
  Suggestion,
} from "../types/mapbox";
import { useMapboxGeocode } from "./useMapboxGeocode";

export function useCityAutofill({
  accessToken,
  minLength = 2,
}: {
  accessToken: string;
  minLength?: number;
}) {
  const { results, isLoading, search, retrieve, clear } = useMapboxGeocode({
    accessToken,
  });

  const lastQueryRef = useRef("");

  const fetchCities = useCallback(
    (query: string) => {
      if (query.length < minLength) {
        clear();
        return;
      }
      lastQueryRef.current = query.toLowerCase().trim();
      search({ query, types: "place,locality", limit: 10, proximity: "ip" });
    },
    [search, minLength, clear]
  );

  /**
   * Сортировка: сначала точные prefix-совпадения (name начинается с query),
   * потом fuzzy-совпадения (Bürg на запрос "ber")
   */
  const items: SimpleItem[] = useMemo(() => {
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
      if (r.feature.bbox) {
        bbox = r.feature.bbox.join(",");
      } else if (r.feature.center) {
        const [lng, lat] = r.feature.center;
        bbox = `${lng - 0.1},${lat - 0.1},${lng + 0.1},${lat + 0.1}`;
      }

      return { parsed: r.parsed, bbox };
    },
    [retrieve]
  );

  return { items, isLoading, fetchCities, select, clear };
}
