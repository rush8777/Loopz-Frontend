import * as React from "react"; import { cn } from "@/lib/utils";
export function Card({className,...props}:React.ComponentProps<"div">){return <div className={cn("rounded-lg border bg-card text-card-foreground shadow-[oklab(0_0_0/.07)_0_0_0_1px,rgba(0,0,0,.05)_0_1px_2px]",className)} {...props}/>}
export function CardHeader({className,...props}:React.ComponentProps<"div">){return <div className={cn("flex flex-col gap-1.5 p-5",className)} {...props}/>}
export function CardTitle({className,...props}:React.ComponentProps<"h3">){return <h3 className={cn("text-base font-semibold",className)} {...props}/>}
export function CardDescription({className,...props}:React.ComponentProps<"p">){return <p className={cn("text-sm text-muted-foreground",className)} {...props}/>}
export function CardContent({className,...props}:React.ComponentProps<"div">){return <div className={cn("p-5 pt-0",className)} {...props}/>}
export function CardFooter({className,...props}:React.ComponentProps<"div">){return <div className={cn("flex items-center p-5 pt-0",className)} {...props}/>}
