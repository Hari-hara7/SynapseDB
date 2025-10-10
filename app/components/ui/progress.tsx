import * as React from "react"

import { cn } from "@/lib/utils"

export interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  status?: "success" | "error" | "uploading" | "pending"
}

const statusClasses: Record<NonNullable<ProgressProps["status"]>, string> = {
  success: "bg-emerald-400",
  error: "bg-red-400",
  uploading: "bg-white/70 animate-pulse",
  pending: "bg-white/20",
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, status = "pending", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-white/10",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full w-full origin-left rounded-full transition-transform",
          statusClasses[status]
        )}
        style={{ transform: `scaleX(${Math.max(0, Math.min(1, value / 100))})` }}
      />
    </div>
  )
)
Progress.displayName = "Progress"

export { Progress }
