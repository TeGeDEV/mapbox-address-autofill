import type {
  MapboxContext,
  MapboxFeature,
  ParsedAddress,
  Suggestion,
} from "../types/mapbox";

export function stripCountry(str: string): string {
  return str.replace(/,\s*(Deutschland|Germany)$/i, "");
}

function findContext(ctx: MapboxContext[], prefix: string): string | undefined {
  return ctx.find((c) => c.id.startsWith(prefix))?.text;
}

function buildSubtitle(feature: MapboxFeature): string {
  const ctx = feature.context;
  const featureType = feature.id.split(".")[0];

  const parts: string[] = [];

  if (featureType === "address" && feature.address) {
    parts.push(feature.address);
  }

  const postcode = findContext(ctx, "postcode");
  const place = findContext(ctx, "place") || findContext(ctx, "locality");
  const region = findContext(ctx, "region");

  if (postcode && place) {
    parts.push(`${postcode} ${place}`);
  } else {
    if (postcode) parts.push(postcode);
    if (place) parts.push(place);
  }

  if (featureType === "place" || featureType === "locality") {
    const filtered = parts.filter((p) => !p.includes(feature.text));
    if (region) filtered.push(region);
    return filtered.join(", ");
  }

  if (region) parts.push(region);
  return parts.join(", ");
}

export function parseAddress(feature: MapboxFeature): ParsedAddress {
  const ctx = feature.context;
  const featureType = feature.id.split(".")[0];

  const findCtx = (prefix: string): string => findContext(ctx, prefix) ?? "";

  const street = featureType === "address" ? feature.text : findCtx("address");
  const houseNumber = feature.address ?? "";

  let postcode =
    featureType === "postcode" ? feature.text : findCtx("postcode");
  if (!postcode) {
    const m = feature.place_name.match(/\b(\d{5})\b/);
    if (m) postcode = m[1];
  }

  const city =
    featureType === "place" || featureType === "locality"
      ? feature.text
      : findCtx("place") || findCtx("locality");

  return {
    street,
    houseNumber,
    postcode,
    city,
    full_address: stripCountry(feature.place_name),
  };
}

export function matchesContext(
  feature: MapboxFeature,
  filterCity?: string,
  filterPostcode?: string
): boolean {
  const parsed = parseAddress(feature);

  if (filterCity) {
    const city = parsed.city.toLowerCase();
    const filter = filterCity.toLowerCase().trim();
    if (filter && !city.includes(filter) && !filter.includes(city))
      return false;
  }

  if (filterPostcode) {
    const filter = filterPostcode.trim();
    if (filter && !parsed.postcode.startsWith(filter)) return false;
  }

  return true;
}

export function mapFeature(f: MapboxFeature): Suggestion {
  return {
    mapbox_id: f.id,
    name: f.text,
    full_address: stripCountry(f.place_name),
    place_formatted: buildSubtitle(f),
  };
}
