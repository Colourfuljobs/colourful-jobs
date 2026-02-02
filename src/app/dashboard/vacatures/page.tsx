"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { 
  Plus,
  AlertTriangle,
  Briefcase,
  ChevronDown,
  Coins,
  Pencil,
  Eye,
  Rocket,
  Upload,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { VacancyStatus } from "@/components/dashboard/VacancyCard"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { DesktopHeader } from "@/components/dashboard"

// Filter status options (excluding gepubliceerd which is in separate section)
const filterStatuses: { value: VacancyStatus; label: string }[] = [
  { value: "concept", label: "Concept" },
  { value: "wacht_op_goedkeuring", label: "Wacht op goedkeuring" },
  { value: "verlopen", label: "Verlopen" },
  { value: "gedepubliceerd", label: "Gedepubliceerd" },
]

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
  action: "wijzigen" | "bekijken" | "boosten" | "publiceren"
  iconOnly?: boolean
}>> = {
  concept: [
    { label: "Wijzigen", icon: Pencil, action: "wijzigen", iconOnly: true },
    { label: "Bekijken", icon: Eye, action: "bekijken", iconOnly: true },
  ],
  incompleet: [
    { label: "Wijzigen", icon: Pencil, action: "wijzigen", iconOnly: true },
    { label: "Bekijken", icon: Eye, action: "bekijken", iconOnly: true },
  ],
  wacht_op_goedkeuring: [
    { label: "Bekijken", icon: Eye, action: "bekijken", iconOnly: true },
  ],
  gepubliceerd: [
    { label: "Wijzigen", icon: Pencil, action: "wijzigen", iconOnly: true },
    { label: "Bekijken", icon: Eye, action: "bekijken", iconOnly: true },
    { label: "Boosten", icon: Rocket, action: "boosten", iconOnly: false },
  ],
  verlopen: [
    { label: "Wijzigen", icon: Pencil, action: "wijzigen", iconOnly: true },
    { label: "Boosten", icon: Rocket, action: "boosten", iconOnly: false },
  ],
  gedepubliceerd: [
    { label: "Publiceren", icon: Upload, action: "publiceren", iconOnly: false },
    { label: "Wijzigen", icon: Pencil, action: "wijzigen", iconOnly: true },
    { label: "Bekijken", icon: Eye, action: "bekijken", iconOnly: true },
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
  publishedAt?: string,
  closingDate?: string
): string | null {
  switch (status) {
    case "concept":
    case "wacht_op_goedkeuring":
      return "Nog niet online"
    case "gepubliceerd":
      if (publishedAt && closingDate) {
        const publishedDate = new Date(publishedAt)
        const closeDate = new Date(closingDate)
        const daysRemaining = getDaysRemaining(closeDate)
        return `${formatDate(publishedDate)} · Nog ${daysRemaining} ${daysRemaining === 1 ? "dag" : "dagen"}`
      }
      return null
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

// Vacancy type from API
interface Vacancy {
  id: string
  title?: string
  status: VacancyStatus
  credits_spent?: number
  money_invoiced?: number
  location?: string
  employment_type?: string
  "last-published-at"?: string
  closing_date?: string
  "created-at"?: string
}

// Multi-select filter component
function StatusFilter({
  selectedStatuses,
  onStatusChange,
}: {
  selectedStatuses: VacancyStatus[]
  onStatusChange: (statuses: VacancyStatus[]) => void
}) {
  const toggleStatus = (status: VacancyStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter((s) => s !== status))
    } else {
      onStatusChange([...selectedStatuses, status])
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="tertiary"
          size="sm"
          showArrow={false}
        >
          Filter op status
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="p-2 space-y-2">
          {filterStatuses.map((status) => (
            <label
              key={status.value}
              className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-[#193DAB]/[0.08] cursor-pointer"
            >
              <Checkbox
                checked={selectedStatuses.includes(status.value)}
                onCheckedChange={() => toggleStatus(status.value)}
                className="data-[state=checked]:bg-[#1F2D58] data-[state=checked]:border-[#1F2D58]"
              />
              <span className="text-sm text-[#1F2D58]">{status.label}</span>
            </label>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function VacaturesPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStatuses, setSelectedStatuses] = useState<VacancyStatus[]>(
    filterStatuses.map((s) => s.value)
  )
  const [vacancies, setVacancies] = useState<Vacancy[]>([])

  // Set page title
  useEffect(() => {
    document.title = "Vacatures | Colourful jobs"
  }, [])

  // Fetch vacancies from API
  useEffect(() => {
    const fetchVacancies = async () => {
      try {
        const response = await fetch("/api/vacancies")
        if (!response.ok) {
          throw new Error("Failed to fetch vacancies")
        }
        const data = await response.json()
        if (data.vacancies) {
          // Sort by created-at descending
          const sortedVacancies = data.vacancies.sort(
            (a: Vacancy, b: Vacancy) => {
              const dateA = a["created-at"] ? new Date(a["created-at"]).getTime() : 0
              const dateB = b["created-at"] ? new Date(b["created-at"]).getTime() : 0
              return dateB - dateA
            }
          )
          setVacancies(sortedVacancies)
        }
        setIsLoading(false)
      } catch (err) {
        console.error("Error fetching vacancies:", err)
        setError("Er ging iets mis bij het laden van je vacatures")
        setIsLoading(false)
      }
    }

    fetchVacancies()
  }, [])

  const handleVacancyAction = (action: string, vacancyId: string) => {
    console.log(`Action: ${action}, Vacancy: ${vacancyId}`)
    // TODO: Implement actual actions
  }

  // Split vacancies into two sections
  const publishedVacancies = vacancies.filter((v) => v.status === "gepubliceerd")
  const otherVacancies = vacancies.filter((v) => v.status !== "gepubliceerd")
  
  // Filter other vacancies by selected statuses
  const filteredOtherVacancies = otherVacancies.filter((v) =>
    selectedStatuses.includes(v.status)
  )

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            <div className="flex items-center justify-between">
              <span>Er ging iets mis bij het laden van je vacatures.</span>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => window.location.reload()}
                showArrow={false}
              >
                Opnieuw laden
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page header with title, credits and actions */}
      <DesktopHeader title="Vacatures" />

      {/* Section 1: Gepubliceerde vacatures */}
      <section>
        {isLoading ? (
          <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
            <div className="bg-white/50 px-6 py-4">
              <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">Gepubliceerde vacatures</h2>
            </div>
            <Table className="bg-white table-fixed">
              <TableHeader>
                <TableRow className="border-b border-[#E8EEF2] hover:bg-transparent">
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] w-[40%]">Vacature</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] w-[25%]">Status</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] whitespace-nowrap">Credits</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] text-right w-[25%]">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3].map((i) => (
                  <TableRow key={i} className="border-b border-[#E8EEF2] hover:bg-[#193DAB]/[0.04]">
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : publishedVacancies.length === 0 ? (
          <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
            <div className="bg-white/50 px-6 py-4">
              <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">Gepubliceerde vacatures</h2>
            </div>
            <Empty className="bg-white">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Briefcase />
                </EmptyMedia>
                <EmptyTitle>Geen gepubliceerde vacatures</EmptyTitle>
                <EmptyDescription>
                  Je hebt nog geen actieve vacatures. Maak een nieuwe vacature aan om kandidaten te bereiken.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Link href="/dashboard/vacatures/nieuw">
                  <Button showArrow={false}>
                    <Plus className="h-4 w-4 mr-1" />
                    Nieuwe vacature
                  </Button>
                </Link>
              </EmptyContent>
            </Empty>
          </div>
        ) : (
          <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
            <div className="bg-white/50 px-6 py-4">
              <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">Gepubliceerde vacatures</h2>
            </div>
            <Table className="bg-white table-fixed">
              <TableHeader>
                <TableRow className="border-b border-[#E8EEF2] hover:bg-transparent">
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] w-[40%]">Vacature</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] w-[25%]">Status</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] whitespace-nowrap">Credits</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] text-right w-[25%]">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {publishedVacancies.map((vacancy) => {
                  const config = statusConfig[vacancy.status]
                  const actions = actionsPerStatus[vacancy.status]
                  const publicationInfo = getPublicationInfo(vacancy.status, vacancy["last-published-at"], vacancy.closing_date)
                  
                  return (
                    <TableRow key={vacancy.id} className="border-b border-[#E8EEF2] hover:bg-[#193DAB]/[0.04]">
                      <TableCell>
                        <span className="font-bold text-[#1F2D58]">{vacancy.title || "Naamloze vacature"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant}>{config.label}</Badge>
                        {publicationInfo && (
                          <div className="text-xs text-[#1F2D58]/60 mt-1">{publicationInfo}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {config.showCredits && (vacancy.credits_spent ?? 0) > 0 ? (
                          <div className="flex items-center gap-1.5 text-[#1F2D58]/70">
                            <Coins className="h-4 w-4 flex-shrink-0" />
                            <span>{vacancy.credits_spent}</span>
                          </div>
                        ) : (
                          <span className="text-[#1F2D58]/40">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {actions.filter(action => !action.iconOnly).map((action) => (
                            <Button
                              key={action.action}
                              variant="tertiary"
                              size="sm"
                              onClick={() => handleVacancyAction(action.action, vacancy.id)}
                              className="gap-1.5"
                              showArrow={false}
                            >
                              <action.icon className="h-3.5 w-3.5" />
                              {action.label}
                            </Button>
                          ))}
                          {actions.filter(action => action.iconOnly).map((action) => (
                            <Tooltip key={action.action}>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="tertiary"
                                  size="icon"
                                  onClick={() => handleVacancyAction(action.action, vacancy.id)}
                                  className="w-[30px] h-[30px]"
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
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Section 2: Overige vacatures */}
      <section>
        {isLoading ? (
          <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
            <div className="bg-white/50 px-6 py-4">
              <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">Overige vacatures</h2>
            </div>
            <Table className="bg-white table-fixed">
              <TableHeader>
                <TableRow className="border-b border-[#E8EEF2] hover:bg-transparent">
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] w-[40%]">Vacature</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] w-[25%]">Status</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] whitespace-nowrap">Credits</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] text-right w-[25%]">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3].map((i) => (
                  <TableRow key={i} className="border-b border-[#E8EEF2] hover:bg-[#193DAB]/[0.04]">
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : otherVacancies.length === 0 ? (
          <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
            <div className="bg-white/50 px-6 py-4">
              <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">Overige vacatures</h2>
            </div>
            <Empty className="bg-white">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Briefcase />
                </EmptyMedia>
                <EmptyTitle>Geen overige vacatures</EmptyTitle>
              </EmptyHeader>
            </Empty>
          </div>
        ) : filteredOtherVacancies.length === 0 ? (
          <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
            <div className="bg-white/50 px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">Overige vacatures</h2>
                <StatusFilter
                  selectedStatuses={selectedStatuses}
                  onStatusChange={setSelectedStatuses}
                />
              </div>
            </div>
            <Empty className="bg-white">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Briefcase />
                </EmptyMedia>
                <EmptyTitle>
                  {selectedStatuses.length === 0 
                    ? "Geen filter geselecteerd"
                    : "Geen vacatures gevonden"
                  }
                </EmptyTitle>
                <EmptyDescription>
                  {selectedStatuses.length === 0 
                    ? "Selecteer minimaal één status in de filter om vacatures te zien."
                    : "Er zijn geen vacatures met de geselecteerde statussen."
                  }
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
            <div className="bg-white/50 px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">Overige vacatures</h2>
                <StatusFilter
                  selectedStatuses={selectedStatuses}
                  onStatusChange={setSelectedStatuses}
                />
              </div>
            </div>
            <Table className="bg-white table-fixed">
              <TableHeader>
                <TableRow className="border-b border-[#E8EEF2] hover:bg-transparent">
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] w-[40%]">Vacature</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] w-[25%]">Status</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] whitespace-nowrap">Credits</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] text-right w-[25%]">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOtherVacancies.map((vacancy) => {
                  const config = statusConfig[vacancy.status]
                  const actions = actionsPerStatus[vacancy.status]
                  const publicationInfo = getPublicationInfo(vacancy.status, vacancy["last-published-at"], vacancy.closing_date)
                  
                  return (
                    <TableRow key={vacancy.id} className="border-b border-[#E8EEF2] hover:bg-[#193DAB]/[0.04]">
                      <TableCell>
                        <span className="font-bold text-[#1F2D58]">{vacancy.title || "Naamloze vacature"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant}>{config.label}</Badge>
                        {publicationInfo && (
                          <div className="text-xs text-[#1F2D58]/60 mt-1">{publicationInfo}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {config.showCredits && (vacancy.credits_spent ?? 0) > 0 ? (
                          <div className="flex items-center gap-1.5 text-[#1F2D58]/70">
                            <Coins className="h-4 w-4 flex-shrink-0" />
                            <span>{vacancy.credits_spent}</span>
                          </div>
                        ) : (
                          <span className="text-[#1F2D58]/40">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {actions.filter(action => !action.iconOnly).map((action) => (
                            <Button
                              key={action.action}
                              variant="tertiary"
                              size="sm"
                              onClick={() => handleVacancyAction(action.action, vacancy.id)}
                              className="gap-1.5"
                              showArrow={false}
                            >
                              <action.icon className="h-3.5 w-3.5" />
                              {action.label}
                            </Button>
                          ))}
                          {actions.filter(action => action.iconOnly).map((action) => (
                            <Tooltip key={action.action}>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="tertiary"
                                  size="icon"
                                  onClick={() => handleVacancyAction(action.action, vacancy.id)}
                                  className="w-[30px] h-[30px]"
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
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}
