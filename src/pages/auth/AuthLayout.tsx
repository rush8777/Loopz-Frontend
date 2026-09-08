import type { ReactNode } from "react";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="grid size-7 place-items-center rounded-md bg-foreground text-xs font-bold text-background">L</div>
          <span className="text-[15px] font-semibold">movecues</span>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-[oklab(0_0_0/.07)_0_0_0_1px,rgba(0,0,0,.05)_0_1px_2px]">
          <h1 className="m-0 text-lg font-semibold">{title}</h1>
          <p className="mt-1 mb-6 text-[13px] text-muted-foreground">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
