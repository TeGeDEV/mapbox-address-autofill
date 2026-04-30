export type MapboxPlaceType =
  | "address"
  | "postcode"
  | "place"
  | "locality"
  | "region"
  | "district"
  | "country";

export type ContextPrefix = keyof MapboxContext;

export type MapboxErrorCode = 401 | 429 | "invalid_query" | "unknown";

export interface MapboxError {
  code: MapboxErrorCode;
  message: string;
}

export interface ParsedAddress {
  street: string;
  houseNumber: string;
  postcode: string;
  city: string;
  full_address: string;
}

export interface SearchParams {
  query: string;
  types: string;
  limit?: number;
  bbox?: string;
  proximity?: "ip" | "none";
}

export interface GeocodeOptions {
  accessToken: string;
  country?: string;
  language?: string;
  debounceMs?: number;
}

export interface RetrieveResult {
  feature: MapboxFeature;
  parsed: ParsedAddress;
}

export interface SelectWithBboxResult {
  parsed: ParsedAddress;
  bbox?: string;
}

export interface AutofillItem {
  suggestion: Suggestion;
  source?: "ip" | "global" | "bbox";
}

export type ApiStatus =
  | "ok"
  | "blocked_401"
  | "blocked_429"
  | "error_temporary";

// new Geocoding types v6
//--------------------------------------------
export interface Translation {
  language: string;
  name: string;
}

export interface Translations {
  [langCode: string]: Translation;
}

export interface Coordinates {
  longitude: number;
  latitude: number;
}

export interface MapboxContextItem {
  mapbox_id: string;
  name: string;
  wikidata_id?: string;
  region_code?: string;
  region_code_full?: string;
  country_code?: string;
  country_code_alpha_3?: string;
  translations?: Translations;
}

export interface MapboxContext {
  country?: MapboxContextItem;
  locality?: MapboxContextItem;
  place?: MapboxContextItem;
  postcode?: Pick<MapboxContextItem, "mapbox_id" | "name">;
  region?: MapboxContextItem;
  district?: MapboxContextItem;
  street?: MapboxContextItem;
}

export interface MapboxFeatureProperties {
  bbox?: [number, number, number, number];
  context: MapboxContext;
  coordinates: Coordinates;
  feature_type: string;
  full_address: string;
  mapbox_id: string;
  name: string;
  name_preferred: string;
  place_formatted: string;
}

export interface MapboxGeometry {
  type: "Point";
  coordinates: [number, number];
}

export interface MapboxFeature {
  type: "Feature";
  id: string;
  geometry: MapboxGeometry;
  properties: MapboxFeatureProperties;
}

export interface MapboxFeatureCollection {
  type: "FeatureCollection";
  features: MapboxFeature[];
  attribution: string;
}

export interface Suggestion {
  mapbox_id: string;
  name: string;
  name_preferred: string;
  full_address: string;
  place_formatted: string;
}
