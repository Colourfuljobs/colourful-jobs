import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Button Variants:
 * - default (primary): Orange bg, white text, dark blue on hover
 * - secondary: Light blue filled bg, darker blue on hover
 * - tertiary: Light bg with border, white bg with stronger border on hover
 * - link: Text only, no padding, underline on hover
 * - ghost: Transparent, subtle hover effect (for special cases)
 * - destructive: Red/danger styling (for delete actions)
 * 
 * Sizes:
 * - default: Standard button with padding
 * - sm: Smaller button
 * - lg: Larger button
 * - icon: Square icon-only button (works with all variants)
 * 
 * Usage examples:
 * <Button>Primary button</Button>
 * <Button variant="secondary">Secondary button</Button>
 * <Button variant="tertiary">Tertiary button</Button>
 * <Button variant="link">Link button</Button>
 * <Button size="icon"><IconComponent /></Button>
 * <Button variant="secondary" size="icon"><IconComponent /></Button>
 * <Button variant="tertiary" size="icon"><IconComponent /></Button>
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F2D58] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[#F86600] text-white shadow-sm hover:bg-[#1F2D58] [text-shadow:0_1px_2px_rgba(0,0,0,0.2)]",
        secondary:
          "bg-[#193DAB]/12 text-[#1F2D58] hover:bg-[#193DAB]/40",
        tertiary:
          "bg-[#F3EFEF]/40 border border-[#193DAB]/12 text-[#1F2D58] hover:bg-white hover:border-[#193DAB]/40",
        link:
          "text-[#1F2D58] border-b border-transparent hover:border-[#193DAB]/40 rounded-none !p-0 !h-auto",
        ghost: 
          "hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
      },
      size: {
        default: "h-10 px-5 pt-2 pb-[10px]",
        sm: "h-[30px] rounded-full px-3 text-xs",
        lg: "h-11 rounded-full px-8 text-base",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/** Arrow icon pointing right (default direction) */
export const ArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" className="w-4 h-4">
    <path fill="currentColor" d="m20.5 12-4.95 4.95-.706-.708 3.742-3.742H3.5v-1h15.086l-3.742-3.742.707-.708L20.5 12Z"/>
    <path stroke="currentColor" strokeOpacity=".2" strokeWidth=".6" d="m15.763 6.838 4.949 4.95.212.212-.212.212-4.95 4.95-.211.213-.212-.213-.707-.708-.212-.212 3.442-3.442H3.2v-1.6h14.662L14.42 7.758l.212-.212.707-.708.212-.213.212.213Z"/>
  </svg>
)

/** Arrow icon pointing left (for back navigation) */
export const BackArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" className="w-4 h-4">
    <path fill="currentColor" d="m3.5 12 4.95-4.95.706.708-3.742 3.742H20.5v1H5.414l3.742 3.742-.707.708L3.5 12Z"/>
    <path stroke="currentColor" strokeOpacity=".2" strokeWidth=".6" d="m8.237 17.162-4.949-4.95-.212-.212.212-.212 4.95-4.95.211-.213.212.213.707.708.212.212-3.442 3.442H20.8v1.6H5.338l3.442 3.442-.212.212-.707.708-.212.213-.212-.213Z"/>
  </svg>
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  showArrow?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, showArrow = true, children, ...props }, ref) => {
    // Show arrow for default, secondary, tertiary, and link variants (but not for icon size)
    const isIconSize = size === "icon"
    const variantsWithArrow = ["default", "secondary", "tertiary", "link", undefined]
    const shouldShowArrow = !asChild && showArrow && !isIconSize && variantsWithArrow.includes(variant)
    
    if (asChild) {
      // When asChild is true, Slot expects exactly one child, so we can't add arrow icon
      // Arrow icon is omitted when asChild is used
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      )
    }

    // For icon buttons, render without the span wrapper
    if (isIconSize) {
      return (
        <button
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </button>
      )
    }
    
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {shouldShowArrow && <ArrowIcon />}
        <span className={cn("inline-flex items-center gap-1.5 translate-y-[-1px]", variant === "link" && "mb-0.5")}>{children}</span>
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
