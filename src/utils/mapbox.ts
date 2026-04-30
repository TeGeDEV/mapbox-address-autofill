import type { MapboxFeature, ParsedAddress, Suggestion } from "../types/mapbox";

function buildSubtitle(feature: MapboxFeature): string {
  const ctx = feature.properties.context;
  const featureType = feature.properties.feature_type;

  const parts: string[] = [];

  const postcode = ctx.postcode?.name;
  const place = ctx.place?.name;
  const region = ctx.region?.name;

  if (featureType === "postcode" && place) {
    parts.push(place);
  } else if (featureType === "street" && place && postcode) {
    parts.push(postcode);
    parts.push(place);
  }

  if (region) parts.push(region);
  return parts.join(", ");
}

export function parseAddress(feature: MapboxFeature): ParsedAddress {
  const { context, feature_type, name, name_preferred } = feature.properties;
  const isStreet = feature_type === "street";

  const street = isStreet
    ? feature.properties.name
    : context.street?.name || "";

  const alternativeStreet = context.street?.name || "";
  const postcode = context.postcode?.name || "";
  const city = context.place?.name || "";

  // We don't get house number suggestions from Mapbox, so we return an empty string here.
  const houseNumber = "";

  return {
    street,
    alternativeStreet,
    houseNumber,
    postcode,
    city,
    full_address: feature.properties.full_address,
  };
}

export function mapFeature(f: MapboxFeature): Suggestion {
  return {
    mapbox_id: f.properties.mapbox_id,
    name: f.properties.name,
    name_preferred: f.properties.name_preferred,
    full_address: f.properties.full_address,
    place_formatted: buildSubtitle(f),
  };
}
