import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { BRAND } from "../../config/brand";
import { submitQuoteRequest } from "../../lib/api/submitQuoteRequest";

/**
 * Seed items used for every quote request submitted from this page.
 *
 * Layout: one package (heading) + three child line items so the customer's
 * photo checklist demonstrates the heading-vs-photo-target distinction
 * end-to-end without admin intervention.
 *
 * `isPackage: true` tells the WP backend to mark the row as a heading in
 * itemsMeta. Children carry `photoRequired: true` so they always appear as
 * required in the photo upload screen. Admin can later flip individual
 * children to Optional via the estimate detail page.
 *
 * The customer-facing product configurator is moving to Astro; this page
 * exists only as a low-friction way to create a real quote in WordPress
 * for end-to-end testing of the portal flow.
 */
const DEFAULT_ITEMS = [
  {
    name: "Wireless Alarm Starter Kit",
    description: "Package — control panel + starter sensors.",
    amount: 999,
    qty: 1,
    currency: "AUD",
    type: "one_time",
    taxInclusive: true,
    isPackage: true,
  },
  {
    name: "PIR Motion Sensor",
    description: "Wireless infrared motion detector.",
    amount: 149,
    qty: 1,
    currency: "AUD",
    type: "one_time",
    taxInclusive: true,
    photoRequired: true,
  },
  {
    name: "Door / Window Sensor",
    description: "Magnetic reed sensor for entry points.",
    amount: 89,
    qty: 1,
    currency: "AUD",
    type: "one_time",
    taxInclusive: true,
    photoRequired: true,
  },
  {
    name: "Touch Keypad",
    description: "Wall-mounted keypad with backlit display.",
    amount: 199,
    qty: 1,
    currency: "AUD",
    type: "one_time",
    taxInclusive: true,
    photoRequired: true,
  },
];

const DEFAULT_TOTAL = DEFAULT_ITEMS.reduce(
  (sum, item) => sum + item.amount * item.qty,
  0,
);

export default function MinimalQuotePage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setError(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("First name, last name, and email are required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        items: DEFAULT_ITEMS,
        propertyProfile: "Test",
        locationId: process.env.NEXT_PUBLIC_GHL_LOCATION_ID || null,
      };

      const json = await submitQuoteRequest(payload);

      const params = new URLSearchParams();
      if (json.estimateId) params.set("estimateId", json.estimateId);
      if (json.locationId) params.set("locationId", json.locationId);
      const query = params.toString();
      router.push(`/quote-request/success${query ? `?${query}` : ""}`);
    } catch (e) {
      setError(e?.message || "Failed to submit quote.");
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Request a quote • {BRAND.name}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40 px-4 py-12">
        <div className="mx-auto w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Request a quote</CardTitle>
              <CardDescription>
                Fast lane for testing. A starter alarm kit is pre-selected — just enter your contact details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm space-y-2">
                  {DEFAULT_ITEMS.map((item) => (
                    <div key={item.name} className="flex items-baseline justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {item.name}
                          {item.isPackage ? (
                            <span className="ml-2 inline-block rounded bg-foreground/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                              Package
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">
                        A${item.amount.toFixed(2)}
                      </p>
                    </div>
                  ))}
                  <div className="border-t border-border/60 pt-2 flex justify-between text-xs font-medium text-foreground">
                    <span>Total (GST inc)</span>
                    <span>A${DEFAULT_TOTAL.toFixed(2)} AUD</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="firstName" className="text-xs font-medium text-foreground">
                      First name
                    </label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="lastName" className="text-xs font-medium text-foreground">
                      Last name
                    </label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="email" className="text-xs font-medium text-foreground">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="phone" className="text-xs font-medium text-foreground">
                    Phone <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    placeholder="+61 4XX XXX XXX"
                  />
                </div>

                {error ? (
                  <p className="text-xs text-error" role="alert">
                    {error}
                  </p>
                ) : null}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting…
                    </span>
                  ) : (
                    "Get my quote"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
