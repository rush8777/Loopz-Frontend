import type { ReactNode } from "react";

export function PageHeader({
  section,
  title,
  description,
  actions,
}: {
  section: "Observe" | "Analysis" | "Feedback" | "Users";
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 border-b pb-5">
      <div className="mb-2 text-[10px] font-semibold uppercase text-muted-foreground">{section}</div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <h1 className="m-0 text-xl font-semibold">{title}</h1>
          {description && (
            <p className="mt-1.5 mb-0 max-w-2xl text-[13px] text-muted-foreground">{description}</p>
          )}
        </div>
        {actions}
      </div>
    </header>
  );
}
