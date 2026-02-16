import { memo } from "react";
import { Badge } from "../../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";

export const TaskSection = memo(function TaskSection({ tasks, taskState, setTaskState }) {
  const toggleTask = (id) => {
    setTaskState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const list = tasks ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Checklist</CardTitle>
          <CardDescription>Tick items off as you go. We'll remind you about anything pending.</CardDescription>
        </div>
        <Badge variant="outline">{list.length} items</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {list.length ? (
          list.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => toggleTask(task.id)}
              className={`flex w-full items-start gap-3 rounded-lg border border-border bg-background p-3 text-left transition hover:border-secondary ${
                taskState[task.id] ? "bg-secondary/20 text-foreground" : ""
              }`}
            >
              <span
                className={`mt-1 inline-flex size-4 items-center justify-center rounded-full border text-[10px] font-semibold transition ${
                  taskState[task.id] ? "border-secondary bg-secondary text-secondary-foreground" : ""
                }`}
              >
                {taskState[task.id] ? "✓" : ""}
              </span>
              <div className="flex-1 space-y-1">
                <p className="font-medium text-foreground">{task.title}</p>
                <p>{task.description}</p>
              </div>
            </button>
          ))
        ) : (
          <p>{tasks === null ? "No tasks." : "Nothing outstanding right now."}</p>
        )}
      </CardContent>
    </Card>
  );
});

