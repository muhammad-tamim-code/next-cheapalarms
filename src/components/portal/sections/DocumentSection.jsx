import { memo } from "react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { formatDate } from "../utils/portal-utils";

export const DocumentSection = memo(function DocumentSection({ documents }) {
  const list = documents ?? [];
  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Your proposal, contract, and invoices live here.</CardDescription>
        </div>
        <Button variant="outline" size="sm" disabled>
          Upload document
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {list.length ? (
          list.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-lg border border-border bg-background p-4"
            >
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">{doc.title}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.subtitle ?? `${doc.type.toUpperCase()} • ${formatDate(doc.updatedAt)}`}
                </p>
              </div>
              <Badge variant={doc.signed ? "secondary" : "outline"}>
                {doc.signed ? "Signed" : "Pending"}
              </Badge>
            </div>
          ))
        ) : (
          <p className="col-span-full text-sm text-muted-foreground">
            No documents.
          </p>
        )}
      </CardContent>
    </Card>
  );
});

