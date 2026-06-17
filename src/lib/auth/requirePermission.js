import { getAuthContext } from "./getAuthContext";
import { getLoginRedirect } from "./auth-utils";
import { hasPermission } from "./hasPermission";

/**
 * Require admin app access plus an optional product permission.
 */
export async function requirePermission(ctx, permission, options = {}) {
  const { notFound = true, redirectPath = "/portal" } = options;
  const { req, resolvedUrl } = ctx;

  const authContext = await getAuthContext(req);

  if (!authContext) {
    const returnUrl = resolvedUrl || req?.url || "/admin";
    return {
      redirect: {
        destination: getLoginRedirect(returnUrl),
        permanent: false,
      },
    };
  }

  if (!authContext.isAdmin) {
    if (notFound) {
      return { notFound: true };
    }
    return {
      redirect: {
        destination: redirectPath,
        permanent: false,
      },
    };
  }

  if (permission && !hasPermission(authContext, permission)) {
    if (notFound) {
      return { notFound: true };
    }
    return {
      redirect: {
        destination: "/admin",
        permanent: false,
      },
    };
  }

  return {
    props: { authContext },
  };
}
