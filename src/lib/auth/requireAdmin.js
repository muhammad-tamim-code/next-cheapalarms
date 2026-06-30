import { getAuthContext } from './getAuthContext';
import { getLoginRedirect } from './auth-utils';

/**
 * Require admin access for /admin/* routes.
 * Uses full Next.js ctx to preserve resolvedUrl for redirects.
 */
export async function requireAdmin(ctx, options = {}) {
  const { notFound = true, redirectPath = '/portal' } = options;
  const { req, resolvedUrl } = ctx;

  const authContext = await getAuthContext(req);

  if (!authContext) {
    const returnUrl = resolvedUrl || req?.url || '/admin';
    return {
      redirect: {
        destination: getLoginRedirect(returnUrl),
        permanent: false,
      },
    };
  }

  if (!authContext.isAdmin) {
    const returnUrl = resolvedUrl || req?.url || '/admin';
    if (notFound) {
      return {
        redirect: {
          destination: getLoginRedirect(returnUrl),
          permanent: false,
        },
      };
    }
    return {
      redirect: {
        destination: redirectPath,
        permanent: false,
      },
    };
  }

  return {
    props: { authContext },
  };
}

