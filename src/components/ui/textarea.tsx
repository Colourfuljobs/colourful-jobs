import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoGrow?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoGrow = true, onChange, rows, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement>(null)
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef

    const adjustHeight = React.useCallback(() => {
      const textarea = textareaRef.current
      if (textarea && autoGrow) {
        textarea.style.height = "0"
        textarea.style.height = `${textarea.scrollHeight}px`
      }
    }, [autoGrow, textareaRef])

    React.useEffect(() => {
      adjustHeight()
    }, [props.value, adjustHeight])

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e)
      adjustHeight()
    }

    return (
      <textarea
        className={cn(
          "flex min-h-10 w-full rounded-lg border border-[rgba(31,45,88,0.2)] bg-background px-3 py-2 text-sm leading-normal ring-offset-background placeholder:text-[#1F2D58]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          autoGrow && "resize-none overflow-hidden",
          className
        )}
        ref={textareaRef}
        onChange={handleChange}
        rows={autoGrow ? 1 : rows}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }

