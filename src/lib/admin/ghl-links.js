/**
 * GoHighLevel app deep links (admin UI).
 */

const GHL_APP_BASE = "https://app.gohighlevel.com";

/** Resolve GHL location id from props, estimate payload, or env. */
export function resolveGhlLocationId(locationId, estimate) {
  const fromProp = typeof locationId === "string" ? locationId.trim() : "";
  if (fromProp) return fromProp;

  const fromEstimate =
    estimate?.locationId ||
    estimate?.altId ||
    estimate?.location_id ||
    "";
  if (fromEstimate) return String(fromEstimate);

  return process.env.NEXT_PUBLIC_GHL_LOCATION_ID || "";
}

/** Edit estimate in GHL Payments (v2 estimates UI). */
export function buildGhlEstimateEditUrl(estimateId, locationId, estimate) {
  const loc = resolveGhlLocationId(locationId, estimate);
  const id = estimateId || estimate?.id;
  if (!loc || !id) return null;
  return `${GHL_APP_BASE}/v2/location/${loc}/payments/v2/estimates/edit/${id}`;
}

/** Contact detail page in GHL. */
export function buildGhlContactUrl(contactId, locationId) {
  const loc = resolveGhlLocationId(locationId);
  if (!loc || !contactId) return null;
  return `${GHL_APP_BASE}/v2/location/${loc}/contacts/detail/${contactId}`;
}
