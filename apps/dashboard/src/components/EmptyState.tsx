import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-2 px-6 py-12 text-center text-muted-foreground">
      {icon && <div className="mb-2 grid size-10 place-items-center rounded-lg border bg-card text-foreground shadow-sm [&_svg]:size-5">{icon}</div>}
      <h3 className="m-0 text-sm font-semibold text-foreground">{title}</h3>
      <div className="max-w-md text-[13px] leading-5">{description}</div>
      {action}
    </div>
  );
}
