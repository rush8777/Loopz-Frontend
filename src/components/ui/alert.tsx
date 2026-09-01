import type { HTMLAttributes } from "react"; import { cn } from "@/lib/utils";
export function Alert({className,...props}:HTMLAttributes<HTMLDivElement>){return <div role="alert" className={cn("relative w-full rounded-md border bg-card px-4 py-3 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-3.5 [&>svg+div]:pl-6",className)} {...props}/>}
export function AlertTitle({className,...props}:HTMLAttributes<HTMLHeadingElement>){return <h5 className={cn("mb-1 font-medium",className)} {...props}/>}
export function AlertDescription({className,...props}:HTMLAttributes<HTMLDivElement>){return <div className={cn("text-[13px] text-muted-foreground",className)} {...props}/>}
