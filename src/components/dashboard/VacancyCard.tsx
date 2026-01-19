"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Coins, Eye, Pencil, Rocket, Upload, MapPin, Clock, Copy, Calendar } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Status types
export type VacancyStatus = 
  | "concept"
  | "incompleet"
  | "wacht_op_goedkeuring"
  | "gepubliceerd"
  | "verlopen"
  | "gedepubliceerd"

// Status configuration
const statusConfig: Record<VacancyStatus, {
  label: string
  variant: "muted" | "info" | "success" | "warning" | "error"
  showCredits: boolean
  creditMessage?: string
}> = {
  concept: {
    label: "Concept",
    variant: "muted",
    showCredits: false,
  },
  incompleet: {
    label: "Incompleet",
    variant: "muted",
    showCredits: true,
  },
  wacht_op_goedkeuring: {
    label: "Wacht op goedkeuring",
    variant: "info",
    showCredits: true,
  },
  gepubliceerd: {
    label: "Gepubliceerd",
    variant: "success",
    showCredits: true,
  },
  verlopen: {
    label: "Verlopen",
    variant: "warning",
    showCredits: true,
    creditMessage: "Deze vacature is verlopen. Boost om de vacature weer actief te maken.",
  },
  gedepubliceerd: {
    label: "Gedepubliceerd",
    variant: "error",
    showCredits: true,
  },
}

// Actions per status
const actionsPerStatus: Record<VacancyStatus, Array<{
  label: string
  icon: React.ComponentType<{ className?: string }>
  action: "wijzigen" | "bekijken" | "boosten" | "publiceren" | "dupliceren"
  iconOnly?: boolean // Whether to show only icon (with tooltip)
}>> = {
  concept: [
    { label: "Wijzigen", icon: Pencil, action: "wijzigen", iconOnly: true },
    { label: "Bekijken", icon: Eye, action: "bekijken", iconOnly: true },
    { label: "Dupliceren", icon: Copy, action: "dupliceren", iconOnly: true },
  ],
  incompleet: [
    { label: "Wijzigen", icon: Pencil, action: "wijzigen", iconOnly: true },
    { label: "Bekijken", icon: Eye, action: "bekijken", iconOnly: true },
    { label: "Dupliceren", icon: Copy, action: "dupliceren", iconOnly: true },
  ],
  wacht_op_goedkeuring: [
    { label: "Bekijken", icon: Eye, action: "bekijken", iconOnly: true },
    { label: "Dupliceren", icon: Copy, action: "dupliceren", iconOnly: true },
  ],
  gepubliceerd: [
    { label: "Wijzigen", icon: Pencil, action: "wijzigen", iconOnly: true },
    { label: "Bekijken", icon: Eye, action: "bekijken", iconOnly: true },
    { label: "Boosten", icon: Rocket, action: "boosten", iconOnly: false },
    { label: "Dupliceren", icon: Copy, action: "dupliceren", iconOnly: true },
  ],
  verlopen: [
    { label: "Wijzigen", icon: Pencil, action: "wijzigen", iconOnly: true },
    { label: "Boosten", icon: Rocket, action: "boosten", iconOnly: false },
    { label: "Dupliceren", icon: Copy, action: "dupliceren", iconOnly: true },
  ],
  gedepubliceerd: [
    { label: "Publiceren", icon: Upload, action: "publiceren", iconOnly: false },
    { label: "Wijzigen", icon: Pencil, action: "wijzigen", iconOnly: true },
    { label: "Bekijken", icon: Eye, action: "bekijken", iconOnly: true },
    { label: "Dupliceren", icon: Copy, action: "dupliceren", iconOnly: true },
  ],
}

// Helper function to calculate days remaining
function getDaysRemaining(closingDate: Date): number {
  const now = new Date()
  const diffTime = closingDate.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// Helper function to format date
function formatDate(date: Date): string {
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// Get publication info text based on status
function getPublicationInfo(
  status: VacancyStatus,
  publishedAt?: Date,
  closingDate?: Date
): { icon: React.ComponentType<{ className?: string }>; text: string } | null {
  switch (status) {
    case "concept":
    case "wacht_op_goedkeuring":
      return { icon: Calendar, text: "Nog niet online" }
    case "gepubliceerd":
      if (publishedAt && closingDate) {
        const daysRemaining = getDaysRemaining(closingDate)
        return {
          icon: Clock,
          text: `Gepubliceerd ${formatDate(publishedAt)} · Nog ${daysRemaining} ${daysRemaining === 1 ? "dag" : "dagen"} online`,
        }
      }
      return null
    case "verlopen":
      if (publishedAt) {
        return {
          icon: Clock,
          text: `Gepubliceerd ${formatDate(publishedAt)} · Looptijd verlopen`,
        }
      }
      return null
    case "gedepubliceerd":
      if (publishedAt) {
        return {
          icon: Clock,
          text: `Gepubliceerd ${formatDate(publishedAt)} · Handmatig offline gehaald`,
        }
      }
      return null
    default:
      return null
  }
}

interface VacancyCardProps {
  id: string
  title: string
  status: VacancyStatus
  creditsUsed?: number
  location?: string
  employmentType?: string
  publishedAt?: Date
  closingDate?: Date
  variant?: "compact" | "full"
  onAction?: (action: string, vacancyId: string) => void
}

export function VacancyCard({
  id,
  title,
  status,
  creditsUsed = 10,
  location,
  employmentType,
  publishedAt,
  closingDate,
  variant = "compact",
  onAction,
}: VacancyCardProps) {
  const config = statusConfig[status]
  const actions = actionsPerStatus[status]
  const publicationInfo = getPublicationInfo(status, publishedAt, closingDate)

  // Compact variant (for dashboard)
  if (variant === "compact") {
    return (
      <div className="bg-white rounded-[0.75rem] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left side: Title and status */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h4 className="font-bold text-[#1F2D58]">{title}</h4>
              <Badge variant={config.variant}>
                {config.label}
              </Badge>
            </div>
            
            {/* Credit info */}
            {config.showCredits && (
              <div className="flex items-center gap-1.5 text-sm text-[#1F2D58]/70">
                <Coins className="h-4 w-4" />
                <span>{creditsUsed} credits gebruikt</span>
              </div>
            )}
            
            {/* Warning message for expired vacancies */}
            {config.creditMessage && (
              <p className="text-sm text-orange-600 mt-1">
                {config.creditMessage}
              </p>
            )}
          </div>

          {/* Right side: Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* First render full buttons (Boosten, Publiceren) */}
            {actions.filter(action => !action.iconOnly).map((action) => (
              <Button
                key={action.action}
                variant="secondary"
                size="sm"
                onClick={() => onAction?.(action.action, id)}
                className="gap-1.5"
                showArrow={false}
              >
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </Button>
            ))}
            
            {/* Then render icon-only buttons (Wijzigen, Bekijken, Dupliceren) */}
            {actions.filter(action => action.iconOnly).map((action) => (
              <Tooltip key={action.action}>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onAction?.(action.action, id)}
                    className="w-[30px] h-[30px] p-0"
                    showArrow={false}
                  >
                    <action.icon className="h-4 w-4" />
                    <span className="sr-only">{action.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{action.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Full variant (for vacature overzicht)
  return (
    <div className="bg-white rounded-[0.75rem] p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        {/* Top row: Title, badge, and actions */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          {/* Left side: Title and status */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-bold text-[#1F2D58]">{title}</h4>
              <Badge variant={config.variant}>
                {config.label}
              </Badge>
            </div>
          </div>

          {/* Right side: Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* First render full buttons (Boosten, Publiceren) */}
            {actions.filter(action => !action.iconOnly).map((action) => (
              <Button
                key={action.action}
                variant="secondary"
                size="sm"
                onClick={() => onAction?.(action.action, id)}
                className="gap-1.5"
                showArrow={false}
              >
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </Button>
            ))}
            
            {/* Then render icon-only buttons (Wijzigen, Bekijken, Dupliceren) */}
            {actions.filter(action => action.iconOnly).map((action) => (
              <Tooltip key={action.action}>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onAction?.(action.action, id)}
                    className="w-[30px] h-[30px] p-0"
                    showArrow={false}
                  >
                    <action.icon className="h-4 w-4" />
                    <span className="sr-only">{action.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{action.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Bottom row: Meta info */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#1F2D58]/70">
          {/* Location */}
          {location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span className="mb-[2px]">{location}</span>
            </div>
          )}

          {/* Employment type */}
          {employmentType && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{employmentType}</span>
            </div>
          )}

          {/* Credits */}
          {config.showCredits && (
            <div className="flex items-center gap-1.5">
              <Coins className="h-4 w-4" />
              <span className="pb-[2px]">{creditsUsed} credits gebruikt</span>
            </div>
          )}

          {/* Publication info */}
          {publicationInfo && (
            <div className="flex items-center gap-1.5">
              <publicationInfo.icon className="h-4 w-4" />
              <span>{publicationInfo.text}</span>
            </div>
          )}
        </div>

        {/* Warning message for expired vacancies */}
        {config.creditMessage && (
          <p className="text-sm text-orange-600">
            {config.creditMessage}
          </p>
        )}
      </div>
    </div>
  )
}

// Skeleton for loading state
export function VacancyCardSkeleton({ variant = "compact" }: { variant?: "compact" | "full" }) {
  if (variant === "compact") {
    return (
      <div className="bg-white rounded-[0.75rem] p-4 sm:p-5 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 bg-gray-200 rounded w-48"></div>
              <div className="h-5 bg-gray-200 rounded w-24"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 bg-gray-200 rounded-full w-24"></div>
            <div className="h-9 bg-gray-200 rounded-full w-24"></div>
          </div>
        </div>
      </div>
    )
  }

  // Full variant skeleton
  return (
    <div className="bg-white rounded-[0.75rem] p-4 sm:p-5 animate-pulse">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="h-5 bg-gray-200 rounded w-48"></div>
              <div className="h-5 bg-gray-200 rounded-full w-24"></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 bg-gray-200 rounded-full w-24"></div>
            <div className="h-9 bg-gray-200 rounded-full w-24"></div>
            <div className="h-9 bg-gray-200 rounded-full w-24"></div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="h-4 bg-gray-200 rounded w-28"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
        </div>
      </div>
    </div>
  )
}
