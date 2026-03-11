"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Coins, MapPin, Clock, Calendar } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  type VacancyStatus,
  statusConfig,
  cardActionsPerStatus,
  formatDate,
  getPublicationInfoForCard,
} from "@/lib/vacancy-utils"

export type { VacancyStatus } from "@/lib/vacancy-utils"

interface VacancyCardProps {
  id: string
  title: string
  status: VacancyStatus
  creditsUsed?: number
  location?: string
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
  publishedAt,
  closingDate,
  variant = "compact",
  onAction,
}: VacancyCardProps) {
  const config = statusConfig[status]
  const actions = cardActionsPerStatus[status]
  const publicationInfo = getPublicationInfoForCard(status, publishedAt, closingDate)

  const PublicationIcon = publicationInfo?.iconType === "calendar" ? Calendar : Clock

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
            
            {/* Then render icon-only buttons (Wijzigen, Bekijken) */}
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
            
            {/* Then render icon-only buttons (Wijzigen, Bekijken) */}
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
              <PublicationIcon className="h-4 w-4" />
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
