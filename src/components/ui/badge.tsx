import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 pt-0 pb-[3px] text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Project-specific variants
        success:
          "border-transparent bg-[#D0E1CE] text-[#488220] hover:bg-[#D0E1CE]",
        warning:
          "border-transparent bg-orange-100 text-orange-700 hover:bg-orange-100",
        info:
          "border-transparent bg-[#193DAB]/12 text-[#193DAB] hover:bg-[#193DAB]/12",
        muted:
          "border-transparent bg-gray-100 text-gray-700 hover:bg-gray-100",
        error:
          "border-transparent bg-red-100 text-red-700 hover:bg-red-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean
}

function Badge({ className, variant, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot : "div"
  return (
    <Comp className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
