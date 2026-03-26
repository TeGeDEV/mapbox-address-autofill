import { useCallback, useMemo, useState } from "react";
import type {
  AutofillItem,
  SelectWithBboxResult,
  Suggestion,
} from "../types/mapbox";
import { useMapboxGeocode } from "./useMapboxGeocode";

interface StreetAutofillOptions {
  accessToken: string;
  bbox?: string;
  minLength?: number;
  country?: string;
}

export function useStreetAutofill({
  accessToken,
  bbox,
  minLength = 3,
  country = "de",
}: StreetAutofillOptions) {
  const {
    isLoading,
    searchDual,
    error,
    retrieve,
    clear: baseClear,
  } = useMapboxGeocode({ accessToken, country });

  const [globalSuggestions, setGlobalSuggestions] = useState<Suggestion[]>([]);
  const [bboxSuggestions, setBboxSuggestions] = useState<Suggestion[]>([]);
  const [ipSuggestions, setIpSuggestions] = useState<Suggestion[]>([]);

  const hasContext = !!bbox?.trim();
  const effectiveBbox = hasContext ? bbox : undefined;

  const fetchStreets = useCallback(
    async (query: string) => {
      if (query.length < minLength) {
        setGlobalSuggestions([]);
        setBboxSuggestions([]);
        setIpSuggestions([]);
        return;
      }

      try {
        if (effectiveBbox) {
          const { primary, secondary } = await searchDual(
            {
              query,
              types: "street",
              limit: 5,
              bbox: effectiveBbox,
              proximity: "ip",
            },
            { query, types: "street", limit: 5 }
          );
          setBboxSuggestions(primary);
          setGlobalSuggestions(secondary);
          setIpSuggestions([]);
        } else {
          const { primary, secondary } = await searchDual(
            { query, types: "street", limit: 5, proximity: "ip" },
            { query, types: "street", limit: 5 }
          );
          setIpSuggestions(primary);
          setGlobalSuggestions(secondary);
          setBboxSuggestions([]);
        }
      } catch {
        setGlobalSuggestions([]);
        setBboxSuggestions([]);
        setIpSuggestions([]);
      }
    },
    [effectiveBbox, searchDual, minLength]
  );

  const items: AutofillItem[] = useMemo(() => {
    const seen = new Set<string>();
    const result: AutofillItem[] = [];

    const addSuggestions = (
      suggestions: Suggestion[],
      source: "ip" | "global" | "bbox"
    ) => {
      for (const s of suggestions) {
        if (seen.has(s.mapbox_id)) continue;
        seen.add(s.mapbox_id);
        result.push({ suggestion: s, source });
      }
    };

    if (hasContext) {
      addSuggestions(bboxSuggestions, "bbox");
      addSuggestions(globalSuggestions, "global");
    } else {
      addSuggestions(ipSuggestions, "ip");
      addSuggestions(globalSuggestions, "global");
    }

    return result;
  }, [ipSuggestions, globalSuggestions, bboxSuggestions, hasContext]);

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

  const clear = useCallback(() => {
    setGlobalSuggestions([]);
    setBboxSuggestions([]);
    setIpSuggestions([]);
    baseClear();
  }, [baseClear]);

  return {
    items,
    hasContext,
    isLoading,
    error,
    fetchStreets,
    select,
    clear,
  };
}
