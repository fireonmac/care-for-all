import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-xl bg-background border-2 border-input p-6 text-lg font-light leading-[1.8] transition-colors hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50 placeholder:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
