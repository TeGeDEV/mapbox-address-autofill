import { useCallback, useMemo } from "react";
import type {
  AutofillItem,
  SelectWithBboxResult,
  Suggestion,
} from "../types/mapbox";
import { useMapboxGeocode } from "./useMapboxGeocode";

interface PostcodeAutofillOptions {
  accessToken: string;
  minLength?: number;
  filterCity?: string;
  country?: string;
}

export function usePostcodeAutofill({
  accessToken,
  minLength = 2,
  filterCity,
  country = "de",
}: PostcodeAutofillOptions) {
  const { results, isLoading, error, search, retrieve, clear } =
    useMapboxGeocode({
      accessToken,
      country,
    });

  const fetchPostcodes = useCallback(
    (query: string) => {
      if (query.length < minLength) {
        clear();
        return;
      }

      if (!/^\d*$/.test(query)) {
        clear();
        return;
      }
      search({ query, types: "postcode", limit: 10 });
    },
    [search, clear, minLength]
  );

  const items: AutofillItem[] = useMemo(() => {
    const mapped = results.map((s) => ({ suggestion: s }));
    if (!filterCity?.trim()) return mapped;

    const city = filterCity.toLowerCase().trim();
    return mapped.sort((a, b) => {
      const aFeature = retrieve(a.suggestion);
      const bFeature = retrieve(b.suggestion);
      const aMatch = aFeature
        ? aFeature.parsed.city.toLowerCase().includes(city) ||
          city.includes(aFeature.parsed.city.toLowerCase())
        : false;
      const bMatch = bFeature
        ? bFeature.parsed.city.toLowerCase().includes(city) ||
          city.includes(bFeature.parsed.city.toLowerCase())
        : false;
      if (aMatch === bMatch) return 0;
      return aMatch ? -1 : 1;
    });
  }, [results, filterCity, retrieve]);

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

  const autoSelect = useCallback(
    (value: string): SelectWithBboxResult | null => {
      if (!/^\d{5}$/.test(value)) return null;
      const found = items.find((i) => i.suggestion.name === value);
      if (!found) return null;
      return select(found.suggestion);
    },
    [items, select]
  );

  return { items, isLoading, error, fetchPostcodes, select, autoSelect, clear };
}
