/**
 * LoginCard — two-column split layout (hero + form)
 */

import { BrandLogo } from "../brand/BrandLogo";
import { BRAND } from "../../config/brand";

export function LoginCard({ children }) {
  return (
    <div className="relative z-10 w-full max-w-5xl animate-fade-in-up px-4 sm:px-6">
      <div className="flex min-h-[32rem] flex-col overflow-hidden rounded-2xl bg-card shadow-2xl shadow-foreground/10 md:min-h-[28rem] md:flex-row md:rounded-3xl">
        {/* Left — welcome / brand */}
        <aside
          className="relative flex flex-col justify-center overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-secondary px-8 py-10 text-white md:w-[48%] md:px-12 md:py-14"
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute -left-8 top-8 h-3 w-40 rotate-[35deg] rounded-full bg-white/15" />
            <div className="absolute left-4 top-24 h-3 w-52 rotate-[35deg] rounded-full bg-white/20" />
            <div className="absolute -left-4 top-40 h-3 w-44 rotate-[35deg] rounded-full bg-white/10" />
            <div className="absolute left-8 bottom-20 h-3 w-48 rotate-[35deg] rounded-full bg-white/15" />
            <div className="absolute right-0 top-1/2 h-64 w-64 -translate-y-1/2 translate-x-1/3 rounded-full bg-white/10 blur-2xl" />
          </div>

          <div className="relative z-10 space-y-5">
            <BrandLogo variant="horizontal" size="lg" priority />
            <h2 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              Welcome back
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-white/85 md:text-base">
              Sign in to manage quotes, customer portals, and installations for {BRAND.name}.
            </p>
          </div>
        </aside>

        {/* Right — login form */}
        <div className="flex flex-1 flex-col justify-center bg-card px-8 py-10 md:px-12 md:py-14">
          {children}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
