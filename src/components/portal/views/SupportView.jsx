import { SupportSection } from "../sections/SupportSection";
import { FAQSection } from "../sections/AccountSection";

export function SupportView({ view }) {
  const support = view?.support ?? null;

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-border-subtle bg-background p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Customer care</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">Support & Help</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Get in touch with your dedicated specialist or browse our FAQ.
        </p>
      </div>

      <SupportSection support={support} />
      <FAQSection />
    </div>
  );
}

