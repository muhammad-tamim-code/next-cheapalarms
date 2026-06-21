import { isAllowedGhlImageUrl } from '../../../../lib/admin/ghl-image';

function guessImageContentType(url, headerType) {
  if (headerType && !headerType.includes('octet-stream')) {
    return headerType.split(';')[0].trim();
  }
  const lower = (url || '').toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

/**
 * Proxy GHL product images with a correct image/* content-type.
 * GHL often serves these as application/octet-stream, which browsers block (ORB).
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }

  const rawUrl = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  if (!rawUrl || !isAllowedGhlImageUrl(rawUrl)) {
    return res.status(400).json({ ok: false, error: 'Invalid or disallowed image URL' });
  }

  try {
    const upstream = await fetch(rawUrl, {
      headers: { 'User-Agent': 'CheapAlarms-ImageProxy/1.0', Accept: 'image/*,*/*' },
    });

    if (!upstream.ok) {
      return res.status(502).json({ ok: false, error: 'Failed to fetch image' });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    const contentType = guessImageContentType(
      rawUrl,
      upstream.headers.get('content-type') || ''
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    return res.status(200).send(buffer);
  } catch {
    return res.status(502).json({ ok: false, error: 'Image proxy failed' });
  }
}
