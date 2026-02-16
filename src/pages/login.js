import Head from "next/head";
import { ThemeToggle } from "../components/ui/theme-toggle";
import { LoginBackground } from "../components/auth/LoginBackground";
import { LoginCard } from "../components/auth/LoginCard";
import { LoginForm } from "../components/auth/LoginForm";
import { getAuthContext } from "../lib/auth/getAuthContext";
import { sanitizeReturnUrl } from "../lib/auth/auth-utils";

/**
 * Login Page
 * Modern, secure login page with glassmorphism design
 */
export default function LoginPage() {
  return (
    <>
      <Head>
        <title>Sign in • CheapAlarms</title>
      </Head>
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-muted/30 p-6">
        {/* Animated 3D Gradient Background */}
        <LoginBackground />

        {/* Theme Toggle - Top Right */}
        <div className="absolute right-6 top-6 z-10">
          <ThemeToggle />
        </div>

        {/* Glassmorphism Card with Form */}
        <LoginCard>
          <LoginForm />
        </LoginCard>
      </main>
    </>
  );
}

export async function getServerSideProps(ctx) {
  const authContext = await getAuthContext(ctx.req);
  
  // If already authenticated, redirect to dashboard (or return URL)
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

