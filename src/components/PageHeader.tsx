import type { ReactNode } from "react";

type Section = "Overview" | "Observe" | "Dashboards" | "Analytics" | "Feedback" | "Users" | "Experiences" | "Workspace";

type BaseProps = {
  section: Section;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};



/**
 * 2. Whitespace — no rule at all. Separation comes from generous vertical
 *    space rather than a border. Section shown as a small solid dot + label.
 */
export function PageHeader({ section, title, description, actions, className }: BaseProps) {
  return (
    <header className={`mb-10 pt-1 ${className ?? ""}`}>
      <div className="mb-3 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[#141414]" />
        <span className="text-[13px] text-[#474747]">{section}</span>
      </div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <h1 className="m-0 text-2xl font-medium tracking-[-0.01em] text-[#141414]">{title}</h1>
          {description && (
            <p className="mt-2 mb-0 max-w-2xl text-[13px] leading-relaxed text-[#474747]">
              {description}
            </p>
          )}
        </div>
        {actions}
      </div>
    </header>
  );
}
