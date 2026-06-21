import { useState } from 'react';
import { Inter, Space_Grotesk } from 'next/font/google';
import '../styles/globals.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/react-query/query-client';
import { Toaster } from '../components/ui/sonner';

// Load Inter font - optimized for UI, professional, perfect for security/tech industry
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

// Initialize Sentry on client-side
if (typeof window !== 'undefined') {
  // Import and initialize Sentry client config
  import('@sentry/nextjs').then((SentryModule) => {
    const Sentry = SentryModule.default || SentryModule;
    
    // Only initialize if not already initialized
    if (!window.__SENTRY_INITIALIZED__) {
      try {
        Sentry.init({
          dsn: "https://21fba8e29a3db74add9954b33763e4fd@o4510663441580032.ingest.us.sentry.io/4510663443939328",
          environment: process.env.NODE_ENV || "development",
          tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
          debug: false, // Set to true only when actively debugging Sentry issues
          enableLogs: true,
          replaysOnErrorSampleRate: 1.0,
          replaysSessionSampleRate: 0.1,
          integrations: [
            Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
          ],
          beforeSend(event, hint) {
            // Filter sensitive data
            if (event.request) {
              event.request = filterSensitiveData(event.request);
            }
            if (event.extra) {
              event.extra = filterSensitiveData(event.extra);
            }
            return event;
          },
        });
        
        window.__SENTRY_INITIALIZED__ = true;
        window.Sentry = Sentry; // Make Sentry globally available for debugging
        
        if (process.env.NODE_ENV === "development") {
          console.log("[Sentry] Initialized successfully");
        }
      } catch (error) {
        console.error("[Sentry] Initialization failed:", error);
      }
    }
  }).catch((error) => {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Sentry] Failed to load SDK:", error);
    }
  });
}

// Filter sensitive data helper
function filterSensitiveData(data) {
  if (!data || typeof data !== "object") {
    return data;
  }

  const sensitive = [
    "password",
    "token",
    "secret",
    "key",
    "authorization",
    "cookie",
    "api_key",
    "email",
    "phone",
  ];
  const filtered = {};

  for (const [key, value] of Object.entries(data)) {
    const keyLower = key.toLowerCase();
    const isSensitive = sensitive.some((s) => keyLower.includes(s));

    if (isSensitive) {
      filtered[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      filtered[key] = filterSensitiveData(value);
    } else {
      filtered[key] = value;
    }
  }

  return filtered;
}

export default function App({ Component, pageProps }) {
  // Use useState to ensure QueryClient is only created once per app instance
  // This prevents creating a new client on every render
  const [client] = useState(() => queryClient);

  return (
    <QueryClientProvider client={client}>
      {/* Apply font variables at render time (SSR + client) so Inter loads
          immediately with no fallback flash. This is the single source for fonts. */}
      <div className={`${inter.variable} ${spaceGrotesk.variable} font-sans`}>
        <Component {...pageProps} />
      </div>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            zIndex: 10000, // Higher than modal's z-[9999] to ensure toasts appear above modals
          }
        }}
      />
    </QueryClientProvider>
  );
}
