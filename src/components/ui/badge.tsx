import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 pt-0 pb-[3px] text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
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
        // Project-specific variants (huisstijl kleuren)
        success:
          "border-transparent bg-[#DEEEE3] text-[#41712F] hover:bg-[#DEEEE3]",
        warning:
          "border-transparent bg-[#F86600]/12 text-[#F86600] hover:bg-[#F86600]/12",
        info:
          "border-transparent bg-[#39ADE5]/15 text-[#39ADE5] hover:bg-[#39ADE5]/15",
        muted:
          "border-transparent bg-[#193DAB]/12 text-[#1F2D58]/60 hover:bg-[#193DAB]/12",
        error:
          "border-transparent bg-[#F4DCDC] text-[#BC0000] hover:bg-[#F4DCDC]",
        package:
          "border-transparent bg-[#39ade5] text-white hover:bg-[#39ade5]",
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
