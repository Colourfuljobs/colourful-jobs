import {
  Pencil,
  Eye,
  EyeOff,
  Rocket,
  ArrowUpFromLine,
} from "lucide-react"

export type VacancyStatus =
  | "concept"
  | "incompleet"
  | "needs_adjustment"
  | "wacht_op_goedkeuring"
  | "gepubliceerd"
  | "verlopen"
  | "gedepubliceerd"

export interface StatusConfig {
  label: string
  variant: "muted" | "info" | "success" | "warning" | "error" | "attention"
  showCredits: boolean
  creditMessage?: string
}

export const statusConfig: Record<VacancyStatus, StatusConfig> = {
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
  needs_adjustment: {
    label: "Aanpassing nodig",
    variant: "attention",
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

export interface VacancyAction {
  label: string
  icon: React.ComponentType<{ className?: string }>
  action: "wijzigen" | "bekijken" | "boosten" | "publiceren" | "depubliceren"
  iconOnly?: boolean
}

/**
 * Actions for table views (dashboard overview, vacatures page).
 * Concept/incompleet/needs_adjustment only show "Wijzigen" — no "Bekijken" since there's nothing to preview.
 */
export const tableActionsPerStatus: Record<VacancyStatus, VacancyAction[]> = {
  concept: [
    { label: "Wijzigen", icon: Pencil, action: "wijzigen", iconOnly: true },
  ],
  incompleet: [
    { label: "Wijzigen", icon: Pencil, action: "wijzigen", iconOnly: true },
  ],
  needs_adjustment: [
    { label: "Wijzigen", icon: Pencil, action: "wijzigen", iconOnly: true },
  ],
  wacht_op_goedkeuring: [
    { label: "Bekijken", icon: Eye, action: "bekijken", iconOnly: true },
  ],
  gepubliceerd: [
    { label: "Depubliceren", icon: EyeOff, action: "depubliceren", iconOnly: true },
    { label: "Wijzigen", icon: Pencil, action: "wijzigen", iconOnly: true },
    { label: "Bekijk live vacature", icon: Eye, action: "bekijken", iconOnly: true },
    { label: "Boosten", icon: Rocket, action: "boosten", iconOnly: false },
  ],
  verlopen: [
    { label: "Wijzigen", icon: Pencil, action: "wijzigen", iconOnly: true },
    { label: "Boosten", icon: Rocket, action: "boosten", iconOnly: false },
  ],
  gedepubliceerd: [
    { label: "Boosten", icon: Rocket, action: "boosten", iconOnly: false },
    { label: "Publiceren", icon: ArrowUpFromLine, action: "publiceren", iconOnly: false },
    { label: "Wijzigen", icon: Pencil, action: "wijzigen", iconOnly: true },
  ],
}

/**
 * Actions for card views (VacancyCard component).
 * Includes "Bekijken" on more statuses since cards are used in detailed contexts.
 */
export const cardActionsPerStatus: Record<VacancyStatus, VacancyAction[]> = {
  concept: [
    { label: "Wijzigen", icon: Pencil, action: "wijzigen", iconOnly: true },
    { label: "Bekijken", icon: Eye, action: "bekijken", iconOnly: true },
  ],
  incompleet: [
    { label: "Wijzigen", icon: Pencil, action: "wijzigen", iconOnly: true },
    { label: "Bekijken", icon: Eye, action: "bekijken", iconOnly: true },
  ],
  needs_adjustment: [
    { label: "Wijzigen", icon: Pencil, action: "wijzigen", iconOnly: true },
    { label: "Bekijken", icon: Eye, action: "bekijken", iconOnly: true },
  ],
  wacht_op_goedkeuring: [
    { label: "Bekijken", icon: Eye, action: "bekijken", iconOnly: true },
  ],
  gepubliceerd: [
    { label: "Depubliceren", icon: EyeOff, action: "depubliceren", iconOnly: true },
    { label: "Wijzigen", icon: Pencil, action: "wijzigen", iconOnly: true },
    { label: "Bekijken", icon: Eye, action: "bekijken", iconOnly: true },
    { label: "Boosten", icon: Rocket, action: "boosten", iconOnly: false },
  ],
  verlopen: [
    { label: "Wijzigen", icon: Pencil, action: "wijzigen", iconOnly: true },
    { label: "Boosten", icon: Rocket, action: "boosten", iconOnly: false },
  ],
  gedepubliceerd: [
    { label: "Publiceren", icon: ArrowUpFromLine, action: "publiceren", iconOnly: false },
    { label: "Wijzigen", icon: Pencil, action: "wijzigen", iconOnly: true },
    { label: "Bekijken", icon: Eye, action: "bekijken", iconOnly: true },
  ],
}

export function getDaysRemaining(closingDate: Date): number {
  const now = new Date()
  const diffTime = closingDate.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/**
 * Returns a human-readable publication info string for table views.
 * Accepts raw ISO date strings as they come from the API.
 */
export function getPublicationInfoText(
  status: VacancyStatus,
  publishedAt?: string,
  closingDate?: string
): string | null {
  switch (status) {
    case "concept":
      return "Nog niet online"
    case "needs_adjustment":
      return "Aanpassing nodig"
    case "wacht_op_goedkeuring":
      return null
    case "gepubliceerd":
      if (publishedAt) {
        return `Laatst gepubliceerd op ${formatDate(new Date(publishedAt))} · Online`
      }
      return "Online"
    case "verlopen":
      if (publishedAt) {
        return `${formatDate(new Date(publishedAt))} · Verlopen`
      }
      return null
    case "gedepubliceerd":
      if (publishedAt) {
        return `${formatDate(new Date(publishedAt))} · Offline`
      }
      return null
    default:
      return null
  }
}

/**
 * Returns structured publication info for card views (includes icon reference).
 * Accepts Date objects for richer display with days-remaining calculations.
 */
export function getPublicationInfoForCard(
  status: VacancyStatus,
  publishedAt?: Date,
  closingDate?: Date
): { iconType: "calendar" | "clock"; text: string } | null {
  switch (status) {
    case "concept":
    case "needs_adjustment":
    case "wacht_op_goedkeuring":
      return { iconType: "calendar", text: "Nog niet online" }
    case "gepubliceerd":
      if (publishedAt && closingDate) {
        const daysRemaining = getDaysRemaining(closingDate)
        return {
          iconType: "clock",
          text: `Gepubliceerd ${formatDate(publishedAt)} · Nog ${daysRemaining} ${daysRemaining === 1 ? "dag" : "dagen"} online`,
        }
      }
      return null
    case "verlopen":
      if (publishedAt) {
        return {
          iconType: "clock",
          text: `Gepubliceerd ${formatDate(publishedAt)} · Looptijd verlopen`,
        }
      }
      return null
    case "gedepubliceerd":
      if (publishedAt) {
        return {
          iconType: "clock",
          text: `Gepubliceerd ${formatDate(publishedAt)} · Handmatig offline gehaald`,
        }
      }
      return null
    default:
      return null
  }
}

interface VacancyForStep {
  package_id?: string
  title?: string
  description?: string
  status: VacancyStatus
}

const SUBMITTED_STATUSES: VacancyStatus[] = [
  "wacht_op_goedkeuring",
  "gepubliceerd",
  "verlopen",
  "gedepubliceerd",
  "needs_adjustment",
]

export function getFurthestStep(vacancy: VacancyForStep): 1 | 2 | 3 | 4 {
  if (!vacancy.package_id) return 1
  if (!vacancy.title || !vacancy.description) return 2
  if (SUBMITTED_STATUSES.includes(vacancy.status)) return 2
  return 2
}

export function getVacancyDisplayTitle(
  title?: string,
  inputType?: "self_service" | "we_do_it_for_you"
): string {
  return title || (inputType === "we_do_it_for_you" ? "We Do It For You" : "Naamloze vacature")
}
