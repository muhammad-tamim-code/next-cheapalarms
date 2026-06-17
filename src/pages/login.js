import Head from "next/head";
import { LoginCard } from "../components/auth/LoginCard";
import { LoginForm } from "../components/auth/LoginForm";
import { getAuthContext } from "../lib/auth/getAuthContext";
import { sanitizeReturnUrl } from "../lib/auth/auth-utils";
import { BRAND } from "../config/brand";

/**
 * Login Page — split card (welcome panel + form)
 */
export default function LoginPage() {
  return (
    <>
      <Head>
        <title>Sign in • {BRAND.name}</title>
      </Head>
      <main className="light relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary/30 via-background to-secondary/25 p-4 sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(201,83,117,0.18),transparent_50%)]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(47,182,201,0.15),transparent_45%)]"
          aria-hidden="true"
        />

        <LoginCard>
          <LoginForm />
        </LoginCard>
      </main>
    </>
  );
}

export async function getServerSideProps(ctx) {
  const authContext = await getAuthContext(ctx.req);

  if (authContext) {
    const returnUrl = sanitizeReturnUrl(ctx.query.from);
    return {
      redirect: {
        destination: returnUrl,
        permanent: false,
      },
    };
  }

  return { props: {} };
}
