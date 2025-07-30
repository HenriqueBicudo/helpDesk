import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-border",
        success: "border-transparent bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:bg-green-400/10 dark:text-green-400 dark:hover:bg-green-400/20",
        warning: "border-transparent bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 dark:bg-yellow-400/10 dark:text-yellow-400 dark:hover:bg-yellow-400/20",
        info: "border-transparent bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:bg-blue-400/10 dark:text-blue-400 dark:hover:bg-blue-400/20",
        danger: "border-transparent bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:bg-red-400/10 dark:text-red-400 dark:hover:bg-red-400/20",
        gray: "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted",
        purple: "border-transparent bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 dark:bg-purple-400/10 dark:text-purple-400 dark:hover:bg-purple-400/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
