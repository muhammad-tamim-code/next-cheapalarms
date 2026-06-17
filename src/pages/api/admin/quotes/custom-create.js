import { createWpProxyHandler } from '../../../../lib/api/wp-proxy';

/**
 * Proxy: POST /ca/v1/admin/quotes/custom-create
 */
export default createWpProxyHandler('/ca/v1/admin/quotes/custom-create', {
  allowedMethods: ['POST'],
});
