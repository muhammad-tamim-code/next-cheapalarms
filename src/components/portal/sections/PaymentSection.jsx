import { memo } from "react";
import { Button } from "../../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { formatDate, formatCurrency } from "../utils/portal-utils";

export const PaymentSection = memo(function PaymentSection({ payments }) {
  if (!payments) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
          <CardDescription>Track outstanding balance and past receipts.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No payments yet.</p>
        </CardContent>
      </Card>
    );
  }
  const outstanding = payments.outstanding ?? 0;
  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Payments</CardTitle>
          <CardDescription>Track outstanding balance and past receipts.</CardDescription>
        </div>
        <Button disabled variant={outstanding > 0 ? "default" : "outline"}>
          {outstanding > 0 ? "Pay now" : "Paid in full"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
          <span>Outstanding balance</span>
          <span className="text-xl font-semibold text-foreground">
            {formatCurrency(payments.outstanding)}
          </span>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Payment history</h3>
          {payments.history.length ? (
            <ul className="space-y-3">
              {payments.history.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
                >
                  <div>
                    <p className="font-medium text-foreground">{entry.label}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(entry.date)}</p>
                  </div>
                  <span className="font-medium text-foreground">{formatCurrency(entry.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No payments recorded yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

