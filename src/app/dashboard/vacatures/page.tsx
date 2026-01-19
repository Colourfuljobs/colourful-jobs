"use client"

import { useEffect, useState } from "react"
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
  Copy,
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
  action: "wijzigen" | "bekijken" | "boosten" | "publiceren" | "dupliceren"
  iconOnly?: boolean
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
): string | null {
  switch (status) {
    case "concept":
    case "wacht_op_goedkeuring":
      return "Nog niet online"
    case "gepubliceerd":
      if (publishedAt && closingDate) {
        const daysRemaining = getDaysRemaining(closingDate)
        return `${formatDate(publishedAt)} · Nog ${daysRemaining} ${daysRemaining === 1 ? "dag" : "dagen"}`
      }
      return null
    case "verlopen":
      if (publishedAt) {
        return `${formatDate(publishedAt)} · Verlopen`
      }
      return null
    case "gedepubliceerd":
      if (publishedAt) {
        return `${formatDate(publishedAt)} · Offline`
      }
      return null
    default:
      return null
  }
}

// Mock data with extended vacancy info
interface MockVacancy {
  id: string
  title: string
  status: VacancyStatus
  creditsUsed: number
  location: string
  employmentType: string
  publishedAt?: Date
  closingDate?: Date
  createdAt: Date
}

const mockVacancies: MockVacancy[] = [
  // Gepubliceerde vacatures
  {
    id: "1",
    title: "Senior Frontend Developer",
    status: "gepubliceerd",
    creditsUsed: 10,
    location: "Amsterdam",
    employmentType: "Fulltime",
    publishedAt: new Date("2026-01-10"),
    closingDate: new Date("2026-02-10"),
    createdAt: new Date("2026-01-08"),
  },
  {
    id: "2",
    title: "UX Designer",
    status: "gepubliceerd",
    creditsUsed: 10,
    location: "Rotterdam",
    employmentType: "Fulltime",
    publishedAt: new Date("2026-01-05"),
    closingDate: new Date("2026-01-25"),
    createdAt: new Date("2026-01-03"),
  },
  {
    id: "3",
    title: "Product Manager",
    status: "gepubliceerd",
    creditsUsed: 10,
    location: "Utrecht",
    employmentType: "Parttime",
    publishedAt: new Date("2026-01-12"),
    closingDate: new Date("2026-02-12"),
    createdAt: new Date("2026-01-10"),
  },
  // Concept vacatures
  {
    id: "4",
    title: "Marketing Manager",
    status: "concept",
    creditsUsed: 0,
    location: "Den Haag",
    employmentType: "Fulltime",
    createdAt: new Date("2026-01-15"),
  },
  {
    id: "5",
    title: "Sales Representative",
    status: "concept",
    creditsUsed: 10,
    location: "Eindhoven",
    employmentType: "Parttime",
    createdAt: new Date("2026-01-14"),
  },
  // Wacht op goedkeuring
  {
    id: "6",
    title: "Backend Developer",
    status: "wacht_op_goedkeuring",
    creditsUsed: 10,
    location: "Amsterdam",
    employmentType: "Fulltime",
    createdAt: new Date("2026-01-13"),
  },
  // Verlopen
  {
    id: "7",
    title: "Data Analyst",
    status: "verlopen",
    creditsUsed: 10,
    location: "Rotterdam",
    employmentType: "Fulltime",
    publishedAt: new Date("2025-12-01"),
    closingDate: new Date("2026-01-01"),
    createdAt: new Date("2025-11-28"),
  },
  {
    id: "8",
    title: "HR Manager",
    status: "verlopen",
    creditsUsed: 10,
    location: "Utrecht",
    employmentType: "Fulltime",
    publishedAt: new Date("2025-11-15"),
    closingDate: new Date("2025-12-15"),
    createdAt: new Date("2025-11-10"),
  },
  // Gedepubliceerd
  {
    id: "9",
    title: "Customer Support Lead",
    status: "gedepubliceerd",
    creditsUsed: 10,
    location: "Groningen",
    employmentType: "Parttime",
    publishedAt: new Date("2025-12-20"),
    closingDate: new Date("2026-01-20"),
    createdAt: new Date("2025-12-18"),
  },
]

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
          variant="secondary"
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

  // Set page title
  useEffect(() => {
    document.title = "Vacatures | Colourful jobs"
  }, [])

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleVacancyAction = (action: string, vacancyId: string) => {
    console.log(`Action: ${action}, Vacancy: ${vacancyId}`)
    // TODO: Implement actual actions
  }

  // Split vacancies into two sections
  const publishedVacancies = mockVacancies.filter((v) => v.status === "gepubliceerd")
  const otherVacancies = mockVacancies.filter((v) => v.status !== "gepubliceerd")
  
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
            <div className="bg-white/50 px-4 pt-4 pb-4">
              <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">Gepubliceerde vacatures</h2>
            </div>
            <Table className="bg-white">
              <TableHeader>
                <TableRow className="border-b border-[#E8EEF2] hover:bg-transparent">
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Vacature</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Status</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Credits</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] text-right">Acties</TableHead>
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
            <div className="bg-white/50 px-4 pt-4 pb-4">
              <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">Gepubliceerde vacatures</h2>
            </div>
            <Empty className="bg-white">
              <EmptyHeader>
                <EmptyMedia>
                  <Briefcase />
                </EmptyMedia>
                <EmptyTitle>Geen gepubliceerde vacatures</EmptyTitle>
                <EmptyDescription>
                  Je hebt nog geen actieve vacatures. Maak een nieuwe vacature aan om kandidaten te bereiken.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button showArrow={false}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nieuwe vacature
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        ) : (
          <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
            <div className="bg-white/50 px-4 pt-4 pb-4">
              <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">Gepubliceerde vacatures</h2>
            </div>
            <Table className="bg-white">
              <TableHeader>
                <TableRow className="border-b border-[#E8EEF2] hover:bg-transparent">
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Vacature</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Status</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Credits</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {publishedVacancies.map((vacancy) => {
                  const config = statusConfig[vacancy.status]
                  const actions = actionsPerStatus[vacancy.status]
                  const publicationInfo = getPublicationInfo(vacancy.status, vacancy.publishedAt, vacancy.closingDate)
                  
                  return (
                    <TableRow key={vacancy.id} className="border-b border-[#E8EEF2] hover:bg-[#193DAB]/[0.04]">
                      <TableCell>
                        <span className="font-bold text-[#1F2D58]">{vacancy.title}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant}>{config.label}</Badge>
                        {publicationInfo && (
                          <div className="text-xs text-[#1F2D58]/60 mt-1">{publicationInfo}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {config.showCredits && (
                          <div className="flex items-center gap-1.5 text-[#1F2D58]/70">
                            <Coins className="h-4 w-4" />
                            <span>{vacancy.creditsUsed}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {actions.filter(action => !action.iconOnly).map((action) => (
                            <Button
                              key={action.action}
                              variant="ghost"
                              size="sm"
                              onClick={() => handleVacancyAction(action.action, vacancy.id)}
                              className="gap-1.5 bg-[#F3EFEF]/40 border border-[#193DAB]/[0.12] hover:border-[#193DAB]/40 hover:bg-[#193DAB]/[0.12]"
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
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleVacancyAction(action.action, vacancy.id)}
                                  className="w-[30px] h-[30px] p-0 bg-[#F3EFEF]/40 border border-[#193DAB]/[0.12] hover:border-[#193DAB]/40 hover:bg-[#193DAB]/[0.12]"
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
            <div className="bg-white/50 px-4 pt-4 pb-2">
              <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">Overige vacatures</h2>
            </div>
            <Table className="bg-white">
              <TableHeader>
                <TableRow className="border-b border-[#E8EEF2] hover:bg-transparent">
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Vacature</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Status</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Credits</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] text-right">Acties</TableHead>
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
            <div className="bg-white/50 px-4 pt-4 pb-2">
              <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">Overige vacatures</h2>
            </div>
            <Empty className="bg-white">
              <EmptyHeader>
                <EmptyMedia>
                  <Briefcase />
                </EmptyMedia>
                <EmptyTitle>Geen overige vacatures</EmptyTitle>
                <EmptyDescription>
                  Je hebt nog geen concepten, wachtende of verlopen vacatures.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : filteredOtherVacancies.length === 0 ? (
          <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
            <div className="bg-white/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 pt-4 pb-4">
              <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">Overige vacatures</h2>
              <StatusFilter
                selectedStatuses={selectedStatuses}
                onStatusChange={setSelectedStatuses}
              />
            </div>
            <Empty className="bg-white">
              <EmptyHeader>
                <EmptyMedia>
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
            <div className="bg-white/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 pt-4 pb-4">
              <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">Overige vacatures</h2>
              <StatusFilter
                selectedStatuses={selectedStatuses}
                onStatusChange={setSelectedStatuses}
              />
            </div>
            <Table className="bg-white">
              <TableHeader>
                <TableRow className="border-b border-[#E8EEF2] hover:bg-transparent">
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Vacature</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Status</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Credits</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOtherVacancies.map((vacancy) => {
                  const config = statusConfig[vacancy.status]
                  const actions = actionsPerStatus[vacancy.status]
                  const publicationInfo = getPublicationInfo(vacancy.status, vacancy.publishedAt, vacancy.closingDate)
                  
                  return (
                    <TableRow key={vacancy.id} className="border-b border-[#E8EEF2] hover:bg-[#193DAB]/[0.04]">
                      <TableCell>
                        <span className="font-bold text-[#1F2D58]">{vacancy.title}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant}>{config.label}</Badge>
                        {publicationInfo && (
                          <div className="text-xs text-[#1F2D58]/60 mt-1">{publicationInfo}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {config.showCredits ? (
                          <div className="flex items-center gap-1.5 text-[#1F2D58]/70">
                            <Coins className="h-4 w-4" />
                            <span>{vacancy.creditsUsed}</span>
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
                              variant="ghost"
                              size="sm"
                              onClick={() => handleVacancyAction(action.action, vacancy.id)}
                              className="gap-1.5 bg-[#F3EFEF]/40 border border-[#193DAB]/[0.12] hover:border-[#193DAB]/40 hover:bg-[#193DAB]/[0.12]"
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
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleVacancyAction(action.action, vacancy.id)}
                                  className="w-[30px] h-[30px] p-0 bg-[#F3EFEF]/40 border border-[#193DAB]/[0.12] hover:border-[#193DAB]/40 hover:bg-[#193DAB]/[0.12]"
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
