import * as React from "react"

import { cn } from "@/lib/utils"

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "outline"
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium tracking-wide uppercase",
        variant === "default"
          ? "border-white/20 bg-white/10 text-white"
          : "border-white/20 text-white",
        className
      )}
      {...props}
    />
  )
)
Badge.displayName = "Badge"

export { Badge }
