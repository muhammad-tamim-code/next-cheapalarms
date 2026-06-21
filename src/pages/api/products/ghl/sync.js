import { createWpProxyHandler } from '../../../../lib/api/wp-proxy';

/**
 * Proxy: POST /api/products/ghl/sync
 * Triggers background GHL product catalog + price sync into local DB.
 */
export default createWpProxyHandler('/ca/v1/products/ghl/sync', {
  allowedMethods: ['POST'],
  timeout: 60000,
});
