/**
 * Virtual line item for optional property (interior / exterior) photos.
 * Stored like any other upload bucket via `itemName` on the server.
 * Prefix avoids collision with real estimate line names.
 */
export const HOUSE_PHOTOS_ITEM_KEY = "__ca_property_photos__";

/** Default slot count for device line items (admin can override via itemsMeta.maxPhotos, capped at 3). */
export const DEFAULT_DEVICE_MAX_PHOTOS = 2;

/** Hard cap for per-line-item install photos (excluding the property card). */
export const MAX_DEVICE_PHOTOS_PER_LINE = 3;

/** Optional property photos: interior + exterior, up to five slots. */
export const PROPERTY_PHOTOS_MAX = 5;
