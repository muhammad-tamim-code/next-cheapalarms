import Head from "next/head";
import { LoginCard } from "../components/auth/LoginCard";
import { LoginForm } from "../components/auth/LoginForm";
import { getAuthContext } from "../lib/auth/getAuthContext";
import { canAccessReturnUrl, resolvePostLoginDestination } from "../lib/auth/auth-utils";
import { BRAND } from "../config/brand";

/**
 * Login Page — split card (welcome panel + form)
 */
export default function LoginPage({ showSwitchHint = false }) {
  return (
    <>
      <Head>
        <title>Sign in • {BRAND.name}</title>
      </Head>
      <main className="light relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary/30 via-background to-secondary/25 p-4 sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,0,0,0.06),transparent_50%)]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(0,0,0,0.04),transparent_45%)]"
          aria-hidden="true"
        />

        <LoginCard>
          <LoginForm showSwitchHint={showSwitchHint} />
        </LoginCard>
      </main>
    </>
  );
}

export async function getServerSideProps(ctx) {
  const authContext = await getAuthContext(ctx.req);
  const forceSwitch =
    ctx.query.switch === "1" ||
    ctx.query.switch === "true" ||
    ctx.query.switch === "yes";
  const from = typeof ctx.query.from === "string" ? ctx.query.from : undefined;

  if (authContext && !forceSwitch && canAccessReturnUrl(authContext, from)) {
    const destination = resolvePostLoginDestination(authContext, from);
    if (destination) {
      return {
        redirect: {
          destination,
          permanent: false,
        },
      };
    }
  }

  return {
    props: {
      showSwitchHint: Boolean(authContext && !forceSwitch && from?.startsWith("/admin")),
    },
  };
}
