import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "flex w-full rounded-xl bg-background border-2 border-input px-4 py-3 text-lg font-light transition-colors hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50 placeholder:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Input }
