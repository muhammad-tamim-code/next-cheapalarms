import { useState } from "react";
import { PaymentSection } from "../sections/PaymentSection";
import { DocumentSection } from "../sections/DocumentSection";
import { TaskSection } from "../sections/TaskSection";

export function PaymentsView({ view }) {
  const [taskState, setTaskState] = useState({});

  const payments = view?.payments ?? null;
  const documents = view?.documents ?? null;
  const tasks = view?.tasks ?? null;

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-border-subtle bg-background p-6 shadow-lg">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Financial overview</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">Payments & Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your balance, view payment history, and access all important documents.
        </p>
      </div>

      <PaymentSection payments={payments} />
      <DocumentSection documents={documents} />
      <TaskSection tasks={tasks} taskState={taskState} setTaskState={setTaskState} />
    </div>
  );
}

