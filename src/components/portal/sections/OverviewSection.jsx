import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { formatDate, formatCurrency, badgeVariant } from "../utils/portal-utils";
import { memo } from "react";
import { BRAND } from "../../../config/brand";

export const OverviewSection = memo(function OverviewSection({
  view,
  payments,
  documents,
  tasks,
  taskState,
  onToggleTask,
  support,
  alerts,
  onNavigate,
  timeline,
}) {
  const photoItems = Array.isArray(view.photos?.items) ? view.photos.items : [];
  const uploaded = photoItems.length;
  const missing = view.photos?.missingCount ?? 0;
  const required = view.photos?.required ?? uploaded + missing;
  const documentsList = Array.isArray(documents) ? documents : [];
  const recentDocuments = documentsList.slice(0, 2);
  const tasksList = Array.isArray(tasks) ? tasks.slice(0, 3) : [];
  const outstanding = payments?.outstanding ?? 0;
  const timelineSteps = Array.isArray(timeline) ? timeline : [];
  const nextTimelineStep = timelineSteps.find((step) => !step.complete) ?? null;
  const scheduledLabel = view.installation?.scheduledFor
    ? formatDate(view.installation.scheduledFor)
    : "Not yet scheduled";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Estimate {view.estimateId ?? "—"}</CardTitle>
              <CardDescription>{view.quote.label}</CardDescription>
            </div>
            <Badge variant={badgeVariant(view.quote.status)}>{view.quote.label}</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground/70">Next step</p>
              <p className="mt-1 text-base font-semibold text-foreground">{view.nextStep}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground/70">Quote number</p>
              <p className="mt-1 font-medium text-foreground">{view.quote.number}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" onClick={() => onNavigate("estimate")}>
                View estimate
              </Button>
              <Button variant="outline" size="sm" onClick={() => onNavigate("documents")}>
                Documents
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
            <CardDescription>Things that need your attention.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {alerts.length ? (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-lg border border-border/60 bg-background p-3 text-left shadow-sm"
                >
                  <p className="font-medium text-foreground">{alert.title}</p>
                  <p className="text-xs text-muted-foreground/80">{alert.description}</p>
                  {alert.section ? (
                    <Button
                      variant="link"
                      size="sm"
                      className="px-0 text-primary"
                      onClick={() => onNavigate(alert.section)}
                    >
                      {alert.actionLabel ?? "Review"}
                    </Button>
                  ) : null}
                </div>
              ))
            ) : (
              <p>All caught up—no outstanding alerts.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Installation</CardTitle>
              <CardDescription>Upcoming milestone and schedule.</CardDescription>
            </div>
            <Badge variant={badgeVariant(view.installation.status)}>{view.installation.label}</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground/70">Next milestone</p>
              <p className="mt-1 font-medium text-foreground">
                {nextTimelineStep ? nextTimelineStep.title : view.nextStep}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground/70">Scheduled</p>
              <p className="mt-1 font-medium text-foreground">{scheduledLabel}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate("installation")}>
              View schedule
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
            <CardDescription>Outstanding balance and receipts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
              <span>Outstanding</span>
              <span className="text-xl font-semibold text-foreground">
                {formatCurrency(outstanding)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onNavigate("payments")} disabled={outstanding <= 0}>
                {outstanding > 0 ? "Pay now" : "Paid"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => onNavigate("payments")}>
                View history
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Checklist</CardTitle>
            <Button variant="link" size="sm" onClick={() => onNavigate("tasks")}>
              View all tasks
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {tasksList.length ? (
              tasksList.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onToggleTask(task.id)}
                  className={`flex w-full items-start gap-3 rounded-lg border border-border bg-background p-3 text-left transition hover:border-secondary ${
                    taskState[task.id] ? "bg-secondary/20 text-foreground" : ""
                  }`}
                >
                  <span
                    className={`mt-1 inline-flex size-5 items-center justify-center rounded-full border text-[10px] font-semibold transition ${
                      taskState[task.id] ? "border-secondary bg-secondary text-secondary-foreground" : ""
                    }`}
                  >
                    {taskState[task.id] ? "✓" : ""}
                  </span>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-foreground">{task.title}</p>
                    <p className="text-xs text-muted-foreground/80">{task.description}</p>
                  </div>
                </button>
              ))
            ) : (
              <p>Nothing outstanding right now.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Site photos</CardTitle>
            <CardDescription>
              {uploaded}/{required} received
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              {missing > 0
                ? `${missing} photo${missing === 1 ? "" : "s"} still needed before installation.`
                : "All required photos received. Thanks!"}
            </p>
            <Button variant="outline" size="sm" onClick={() => onNavigate("photos")}>
              Manage photos
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Support</CardTitle>
            <CardDescription>Your {BRAND.name} specialist.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">{support.specialist.name}</p>
              <p className="text-xs text-muted-foreground/80">{support.specialist.role}</p>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground/80">
              <p>{support.specialist.email}</p>
              <p>{support.specialist.phone}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate("support")}>
              Contact support
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Latest paperwork ready to download.</CardDescription>
          </div>
          <Button variant="link" size="sm" onClick={() => onNavigate("documents")}>
            View all
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {recentDocuments.length ? (
            recentDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
              >
                <div>
                  <p className="font-medium text-foreground">{doc.title}</p>
                  <p className="text-xs text-muted-foreground/80">{formatDate(doc.updatedAt)}</p>
                </div>
                <Badge variant={doc.signed ? "secondary" : "outline"}>
                  {doc.signed ? "Signed" : "Pending"}
                </Badge>
              </div>
            ))
          ) : (
            <p>No documents ready yet—check back soon.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

