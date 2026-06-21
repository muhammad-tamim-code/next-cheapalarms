const ALLOWED_HOST_SUFFIXES = [
  'leadconnectorhq.com',
  'gohighlevel.com',
  'googleapis.com',
  'googleusercontent.com',
  'filesafe.space',
  'amazonaws.com',
  'cloudfront.net',
  'msgsndr.com',
];

/** Strip HTML tags for plain-text fallback when a thumbnail is shown separately. */
export function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Whether a URL is a GHL/CDN image we allow the proxy to fetch. */
export function isAllowedGhlImageUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return false;
  try {
    const url = new URL(urlString);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    return ALLOWED_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`)
    );
  } catch {
    return false;
  }
}

/** Route GHL product images through our proxy (fixes ORB / octet-stream). */
export function proxyGhlImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('/api/products/ghl/image')) return url;
  if (!isAllowedGhlImageUrl(url)) return url;
  return `/api/products/ghl/image?url=${encodeURIComponent(url)}`;
}

/** Pull the first product image URL from itemsMeta or embedded HTML description. */
export function getEstimateItemProductImage(item, itemsMeta = {}) {
  const name = item?.name || '';
  const meta = itemsMeta[name];
  if (meta?.image) return meta.image;

  const html = item?.description || '';
  const match = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] || item?.image || '';
}

/** Rewrite img src attributes in estimate HTML descriptions for browser display. */
export function rewriteGhlImagesInHtml(html) {
  if (!html || typeof html !== 'string') return html;
  return html.replace(
    /(<img[^>]+src=["'])([^"']+)(["'])/gi,
    (full, prefix, src, suffix) => {
      const proxied = proxyGhlImageUrl(src);
      return proxied === src ? full : `${prefix}${proxied}${suffix}`;
    }
  );
}
