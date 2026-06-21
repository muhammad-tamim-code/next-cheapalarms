import { Check } from "lucide-react";

const STEPS = [
  { id: "requested", label: "Requested" },
  { id: "estimate", label: "Estimate" },
  { id: "photos", label: "Photos" },
  { id: "review", label: "Review" },
  { id: "accept", label: "Accept" },
  { id: "pay", label: "Pay" },
  { id: "installed", label: "Installed" },
];

/** Map portal displayStatus → active step index (0–6). */
export function journeyStepIndex(displayStatus) {
  switch (displayStatus) {
    case "QUOTE_REQUESTED":
      return 0;
    case "ESTIMATE_SENT":
      return 1;
    case "AWAITING_PHOTOS":
    case "PHOTOS_UPLOADED":
    case "CHANGES_REQUESTED":
      return 2;
    case "PHOTOS_UNDER_REVIEW":
    case "UNDER_REVIEW":
      return 3;
    case "READY_TO_ACCEPT":
      return 4;
    case "ACCEPTED":
      return 4;
    case "INVOICE_READY":
      return 5;
    case "PAID":
    case "COMPLETED":
      return 6;
    case "REJECTED":
      return 1;
    default:
      return 1;
  }
}

export function CustomerJourneyStepper({ displayStatus }) {
  const current = journeyStepIndex(displayStatus);

  return (
    <div className="overflow-x-auto pb-1 -mx-1 px-1">
      <div className="flex min-w-max items-start gap-0">
        {STEPS.map((step, index) => {
          const done = index < current;
          const active = index === current;
          const upcoming = index > current;

          return (
            <div key={step.id} className="flex items-start">
              <div className="flex w-[4.5rem] shrink-0 flex-col items-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                    done
                      ? "border-success bg-success text-success-foreground"
                      : active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
                </div>
                <span
                  className={`mt-1.5 text-center text-[10px] font-medium leading-tight ${
                    active ? "text-primary" : upcoming ? "text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`mt-3.5 h-0.5 w-4 shrink-0 sm:w-6 ${
                    index < current ? "bg-success" : "bg-border"
                  }`}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
