export type MapboxPlaceType =
  | "address"
  | "postcode"
  | "place"
  | "locality"
  | "region"
  | "district"
  | "country";

export type ContextPrefix =
  | "postcode"
  | "locality"
  | "place"
  | "district"
  | "region"
  | "country";

export interface MapboxContext {
  id: string;
  mapbox_id: string;
  text: string;
  language?: string;
  text_de?: string;
  language_de?: string;
  wikidata?: string;
  short_code?: string;
}

export interface MapboxFeatureProperties {
  accuracy?: string;
  mapbox_id?: string;
  wikidata?: string;
}

export interface MapboxGeometry {
  type: "Point";
  coordinates: [number, number];
}

export interface MapboxFeature {
  id: string;
  type: "Feature";
  place_type: MapboxPlaceType[];
  relevance: number;
  properties: MapboxFeatureProperties;
  text: string;
  text_de?: string;
  language?: string;
  language_de?: string;
  place_name: string;
  place_name_de?: string;
  matching_text?: string;
  matching_place_name?: string;
  address?: string;
  center: [number, number];
  bbox?: [number, number, number, number];
  geometry: MapboxGeometry;
  context: MapboxContext[];
}

export interface MapboxGeocodingResponse {
  type: "FeatureCollection";
  query: string[];
  features: MapboxFeature[];
  attribution: string;
}

export interface Suggestion {
  mapbox_id: string;
  name: string;
  full_address: string;
  place_formatted: string;
}

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

export interface HouseNumberSelectResult {
  parsed: ParsedAddress;
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
