import { useCallback, useMemo, useRef, useState } from "react";
import type {
  StreetItem,
  StreetSelectResult,
  Suggestion,
} from "../types/mapbox";
import { useMapboxGeocode } from "./useMapboxGeocode";

interface StreetAutofillOptions {
  accessToken: string;
  bbox?: string;
  minLength?: number;
}

export function useStreetAutofill({
  accessToken,
  bbox,
  minLength = 3,
}: StreetAutofillOptions) {
  const {
    isLoading,
    searchDual,
    retrieve,
    clear: baseClear,
  } = useMapboxGeocode({ accessToken });

  // Улицы со всей Германии (без bbox) → для "Nur Straßenname"
  const [globalSuggestions, setGlobalSuggestions] = useState<Suggestion[]>([]);
  // Улицы внутри bbox → для "Vollständige Adresse"
  const [bboxSuggestions, setBboxSuggestions] = useState<Suggestion[]>([]);
  const [ipSuggestions, setIpSuggestions] = useState<Suggestion[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(false);

  const hasContext = !!bbox?.trim();
  const effectiveBbox = hasContext ? bbox : undefined;

  const fetchStreets = useCallback(
    (query: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (query.length < minLength) {
        setGlobalSuggestions([]);
        setBboxSuggestions([]);
        return;
      }

      timerRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          if (effectiveBbox) {
            const { primary, secondary } = await searchDual(
              {
                query,
                types: "address",
                limit: 5,
                bbox: effectiveBbox,
                proximity: "ip",
              },
              { query, types: "address", limit: 5 }
            );
            // primary = без bbox → глобальные улицы
            // secondary = с bbox → локальные улицы
            setGlobalSuggestions(secondary);
            setBboxSuggestions(primary);
          } else {
            // const results = await searchSingle({
            //   query,
            //   types: "address",
            //   limit: 10,
            //   minLength,
            // });
            const { primary, secondary } = await searchDual(
              { query, types: "address", limit: 5, proximity: "ip" },
              { query, types: "address", limit: 5 }
            );
            setIpSuggestions(primary);
            setGlobalSuggestions(secondary);
            setBboxSuggestions([]);
          }
        } catch {
          setGlobalSuggestions([]);
          setBboxSuggestions([]);
          setIpSuggestions([]);
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [effectiveBbox, searchDual, minLength]
  );

  const items: StreetItem[] = useMemo(() => {
    const seen = new Set<string>();
    const result: StreetItem[] = [];

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
      // С контекстом — сначала совпадающие с bbox
      addSuggestions(bboxSuggestions, "bbox");
      addSuggestions(globalSuggestions, "global");
    } else {
      // Без контекста — ip первыми, global в конце
      addSuggestions(ipSuggestions, "ip");
      addSuggestions(globalSuggestions, "global");
    }

    return result;
  }, [ipSuggestions, globalSuggestions, bboxSuggestions, hasContext]);

  const select = useCallback(
    (suggestion: Suggestion): StreetSelectResult | null => {
      const r = retrieve(suggestion);
      if (!r) return null;
      return { parsed: r.parsed };
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
    isLoading: loading || isLoading,
    fetchStreets,
    select,
    clear,
  };
}
