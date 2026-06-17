import { getLoginRedirect } from "../../lib/auth";
import { getAuthContext } from "../../lib/auth/getAuthContext";

/**
 * Legacy route used as login return URL (`?from=/dashboard`) and auth-utils fallback.
 * All traffic redirects — no UI (customers → portal, admins → admin).
 */
export default function DashboardRedirect() {
  return null;
}

export async function getServerSideProps(ctx) {
  const authContext = await getAuthContext(ctx.req);

  if (!authContext) {
    return {
      redirect: {
        destination: getLoginRedirect(ctx.resolvedUrl || "/dashboard"),
        permanent: false,
      },
    };
  }

  if (authContext.isAdmin) {
    return {
      redirect: {
        destination: "/admin",
        permanent: false,
      },
    };
  }

  return {
    redirect: {
      destination: "/portal",
      permanent: false,
    },
  };
}
