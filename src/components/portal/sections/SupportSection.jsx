import { memo } from "react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";

export const SupportSection = memo(function SupportSection({ support }) {
  if (!support?.specialist) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>We're here to help</CardTitle>
          <CardDescription>
            Reach out anytime—your support specialist is ready to answer questions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No support specialist assigned yet.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>We're here to help</CardTitle>
          <CardDescription>
            Reach out anytime—your support specialist is ready to answer questions.
          </CardDescription>
        </div>
        <Badge variant="outline">{support.specialist.role}</Badge>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-lg border border-border bg-background p-4 text-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Assigned specialist</p>
          <p className="text-lg font-semibold text-foreground">{support.specialist.name}</p>
          <p className="text-muted-foreground">{support.specialist.bio}</p>
          <div className="flex flex-wrap gap-2 pt-2 text-xs text-muted-foreground">
            <span>Phone: {support.specialist.phone}</span>
            <span>Email: {support.specialist.email}</span>
          </div>
        </div>
        <div className="space-y-3 text-sm text-muted-foreground">
          <Button variant="outline" className="w-full justify-start gap-2" disabled>
            Request a call
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" disabled>
            Start chat
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2 text-left" disabled>
            View FAQs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

