"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  Plus,
  AlertTriangle,
  Briefcase,
  ChevronDown,
  Pencil,
  Eye,
  EyeOff,
  Rocket,
  ArrowUpFromLine,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DesktopHeader } from "@/components/dashboard"
import { BoostModal } from "@/components/vacatures/BoostModal"

// Filter status options (excluding gepubliceerd and wacht_op_goedkeuring which are in "Actieve vacatures" section)
const filterStatuses: { value: VacancyStatus; label: string }[] = [
  { value: "concept", label: "Concept" },
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
  action: "wijzigen" | "bekijken" | "boosten" | "publiceren" | "depubliceren"
  iconOnly?: boolean
}>> = {
  concept: [
    { label: "Wijzigen", icon: Pencil, action: "wijzigen", iconOnly: true },
  ],
  incompleet: [
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
      return "Nog niet online"
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

// Vacancy type from API
interface Vacancy {
  id: string
  title?: string
  status: VacancyStatus
  credits_spent?: number
  money_invoiced?: number
  location?: string
  "last-published-at"?: string
  closing_date?: string
  "created-at"?: string
  package_id?: string
  intro_txt?: string
  description?: string
  public_url?: string
  input_type?: "self_service" | "we_do_it_for_you"
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
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStatuses, setSelectedStatuses] = useState<VacancyStatus[]>(
    filterStatuses.map((s) => s.value)
  )
  const [vacancies, setVacancies] = useState<Vacancy[]>([])
  const [boostModalOpen, setBoostModalOpen] = useState(false)
  const [boostVacancy, setBoostVacancy] = useState<{ id: string; title: string } | null>(null)
  const [depublishConfirmId, setDepublishConfirmId] = useState<string | null>(null)
  
  // Track if toast has been shown to prevent duplicates (e.g. in React Strict Mode)
  const toastShownRef = useRef(false)

  // Set page title
  useEffect(() => {
    document.title = "Vacatures | Colourful jobs"
  }, [])

  // Check for success parameter in URL and show appropriate toast
  useEffect(() => {
    // Prevent duplicate toasts
    if (toastShownRef.current) return
    
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get("success")
    
    if (success === "submitted") {
      toastShownRef.current = true
      toast.success("Vacature ingediend", {
        description: "Je vacature wordt beoordeeld door ons team.",
      })
      // Clean up URL
      router.replace("/dashboard/vacatures", { scroll: false })
    } else if (success === "submitted_invoice") {
      toastShownRef.current = true
      toast.success("Vacature ingediend", {
        description: "Je vacature wordt beoordeeld. Je ontvangt de factuur per e-mail na goedkeuring.",
      })
      // Clean up URL
      router.replace("/dashboard/vacatures", { scroll: false })
    } else if (success === "submitted_wdify") {
      toastShownRef.current = true
      toast.success("Vacature ingestuurd", {
        description: "We zullen de vacature opstellen. Je ontvangt van ons bericht als deze klaar is.",
      })
      // Clean up URL
      router.replace("/dashboard/vacatures", { scroll: false })
    } else if (success === "submitted_wdify_invoice") {
      toastShownRef.current = true
      toast.success("Vacature ingestuurd", {
        description: "We zullen de vacature opstellen. Je ontvangt van ons bericht als deze klaar is. Je ontvangt de factuur per e-mail.",
      })
      // Clean up URL
      router.replace("/dashboard/vacatures", { scroll: false })
    } else if (success === "updated") {
      toastShownRef.current = true
      toast.success("Vacature bijgewerkt", {
        description: "Je wijzigingen zijn opgeslagen en worden doorgevoerd.",
      })
      // Clean up URL
      router.replace("/dashboard/vacatures", { scroll: false })
    }
  }, [router])

  // Fetch vacancies from API
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

  useEffect(() => {
    fetchVacancies()
  }, [])

  // Determine the furthest step for a vacancy based on its data
  const getFurthestStep = (vacancy: Vacancy): 1 | 2 | 3 | 4 => {
    // If no package selected yet, start at step 1
    if (!vacancy.package_id) return 1
    
    // If package selected but no basic content, start at step 2
    if (!vacancy.title || !vacancy.description) return 2
    
    // For submitted/published vacancies, go to step 2 (edit mode) instead of step 4
    // This allows them to edit without going through the payment flow again
    const submittedStatuses = ["wacht_op_goedkeuring", "gepubliceerd", "verlopen", "gedepubliceerd"];
    if (submittedStatuses.includes(vacancy.status)) return 2
    
    // If content is filled, go to step 2 to make edits
    // For concepts with content, let them continue from step 2 to make edits
    return 2
  }

  const handleDepublishConfirm = async () => {
    if (!depublishConfirmId) return
    const vacancyId = depublishConfirmId
    setDepublishConfirmId(null)

    try {
      const response = await fetch(`/api/vacancies/${vacancyId}/depublish`, {
        method: "POST",
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error("Depubliceren mislukt", { description: data.error || "Er ging iets mis" })
        return
      }

      toast.success("Vacature offline gehaald", { description: "De vacature is gedepubliceerd." })
      fetchVacancies()
    } catch {
      toast.error("Depubliceren mislukt", { description: "Er ging iets mis bij het offline halen" })
    }
  }

  const handlePublish = async (vacancyId: string) => {
    try {
      const response = await fetch(`/api/vacancies/${vacancyId}/publish`, {
        method: "POST",
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error("Publiceren mislukt", { description: data.error || "Er ging iets mis" })
        return
      }

      toast.success("Vacature gepubliceerd", { description: "De vacature is weer online." })
      fetchVacancies()
    } catch {
      toast.error("Publiceren mislukt", { description: "Er ging iets mis bij het publiceren" })
    }
  }

  const handleVacancyAction = (action: string, vacancyId: string) => {
    const vacancy = vacancies.find((v) => v.id === vacancyId)
    if (!vacancy) return

    switch (action) {
      case "wijzigen": {
        const step = getFurthestStep(vacancy)
        router.push(`/dashboard/vacatures/nieuw?id=${vacancyId}&step=${step}&returnTo=/dashboard/vacatures`)
        break
      }
      case "bekijken": {
        if (vacancy.public_url) {
          window.open(vacancy.public_url, "_blank")
        } else {
          // Open in wizard read-only mode (for wacht_op_goedkeuring without public_url)
          router.push(`/dashboard/vacatures/nieuw?id=${vacancyId}&step=3&returnTo=/dashboard/vacatures`)
        }
        break
      }
      case "boosten":
        setBoostVacancy({ id: vacancyId, title: vacancy.title || (vacancy.input_type === "we_do_it_for_you" ? "We Do It For You" : "Naamloze vacature") })
        setBoostModalOpen(true)
        break
      case "publiceren":
        handlePublish(vacancyId)
        break
      case "depubliceren":
        setDepublishConfirmId(vacancyId)
        break
    }
  }

  // Split vacancies into two sections
  const activeVacancies = vacancies.filter((v) => v.status === "gepubliceerd" || v.status === "wacht_op_goedkeuring")
  const otherVacancies = vacancies.filter((v) => v.status !== "gepubliceerd" && v.status !== "wacht_op_goedkeuring")
  
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

      {/* Section 1: Actieve vacatures (gepubliceerd + wacht op goedkeuring) */}
      <section>
        {isLoading ? (
          <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
            <div className="bg-white/50 px-6 py-4">
              <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">Actieve vacatures</h2>
            </div>
            <Table className="bg-white">
              <TableHeader>
                <TableRow className="border-b border-[#E8EEF2] hover:bg-transparent">
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Vacature</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] whitespace-nowrap">Sluitingsdatum</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] text-right whitespace-nowrap">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3].map((i) => (
                  <TableRow key={i} className="border-b border-[#E8EEF2] hover:bg-[#193DAB]/[0.04]">
                    <TableCell className="w-full"><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : activeVacancies.length === 0 ? (
          <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
            <div className="bg-white/50 px-6 py-4">
              <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">Actieve vacatures</h2>
            </div>
            <Empty className="bg-white">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Briefcase />
                </EmptyMedia>
                <EmptyTitle>Geen actieve vacatures</EmptyTitle>
                <EmptyDescription>
                  Je hebt nog geen actieve of ingediende vacatures. Maak een nieuwe vacature aan om kandidaten te bereiken.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Link href="/dashboard/vacatures/nieuw?returnTo=/dashboard/vacatures">
                  <Button variant="secondary" showArrow={false}>
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
              <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">Actieve vacatures</h2>
            </div>
            <Table className="bg-white">
              <TableHeader>
                <TableRow className="border-b border-[#E8EEF2] hover:bg-transparent">
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Vacature</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] whitespace-nowrap">Sluitingsdatum</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] text-right whitespace-nowrap">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeVacancies.map((vacancy) => {
                  const config = statusConfig[vacancy.status]
                  const actions = actionsPerStatus[vacancy.status]
                  const publicationInfo = getPublicationInfo(vacancy.status, vacancy["last-published-at"], vacancy.closing_date)
                  
                  return (
                    <TableRow key={vacancy.id} className="border-b border-[#E8EEF2] hover:bg-[#193DAB]/[0.04]">
                      <TableCell className="w-full max-w-0">
                        <Link
                          href={`/dashboard/vacatures/nieuw?id=${vacancy.id}&step=${getFurthestStep(vacancy)}&returnTo=/dashboard/vacatures`}
                          className="font-bold text-[#1F2D58] hover:text-[#39ADE5] hover:underline cursor-pointer block truncate"
                        >
                          {vacancy.title || (vacancy.input_type === "we_do_it_for_you" ? "We Do It For You" : "Naamloze vacature")}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {vacancy.status === "wacht_op_goedkeuring" ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default inline-block">
                                <Badge variant={config.variant}>
                                  {vacancy.input_type === "we_do_it_for_you" ? "Vacature wordt opgesteld" : config.label}
                                </Badge>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[280px]">
                              <p>
                                {vacancy.input_type === "we_do_it_for_you" 
                                  ? "We stellen de vacature voor je op. Je ontvangt een email zodra de vacature klaar is voor beoordeling."
                                  : "De vacature wordt z.s.m. beoordeeld. Bij goedkeuring ontvang je een email van ons."
                                }
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ) : publicationInfo ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default inline-block">
                                <Badge variant={config.variant}>{config.label}</Badge>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{publicationInfo}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Badge variant={config.variant}>{config.label}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {vacancy.closing_date ? (
                          <span className="text-[#1F2D58]/70 text-sm">
                            {formatDate(new Date(vacancy.closing_date))}
                          </span>
                        ) : (
                          <span className="text-[#1F2D58]/40">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
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
            <Table className="bg-white">
              <TableHeader>
                <TableRow className="border-b border-[#E8EEF2] hover:bg-transparent">
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Vacature</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] text-right whitespace-nowrap">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3].map((i) => (
                  <TableRow key={i} className="border-b border-[#E8EEF2] hover:bg-[#193DAB]/[0.04]">
                    <TableCell className="w-full"><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
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
            <Table className="bg-white">
              <TableHeader>
                <TableRow className="border-b border-[#E8EEF2] hover:bg-transparent">
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Vacature</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] text-right whitespace-nowrap">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOtherVacancies.map((vacancy) => {
                  const config = statusConfig[vacancy.status]
                  const actions = actionsPerStatus[vacancy.status]
                  const publicationInfo = getPublicationInfo(vacancy.status, vacancy["last-published-at"], vacancy.closing_date)
                  
                  return (
                    <TableRow key={vacancy.id} className="border-b border-[#E8EEF2] hover:bg-[#193DAB]/[0.04]">
                      <TableCell className="w-full max-w-0">
                        <Link
                          href={`/dashboard/vacatures/nieuw?id=${vacancy.id}&step=${getFurthestStep(vacancy)}&returnTo=/dashboard/vacatures`}
                          className="font-bold text-[#1F2D58] hover:text-[#39ADE5] hover:underline cursor-pointer block truncate"
                        >
                          {vacancy.title || (vacancy.input_type === "we_do_it_for_you" ? "We Do It For You" : "Naamloze vacature")}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {publicationInfo ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default inline-block">
                                <Badge variant={config.variant}>{config.label}</Badge>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{publicationInfo}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Badge variant={config.variant}>{config.label}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
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

      {/* Boost Modal */}
      {boostVacancy && (
        <BoostModal
          open={boostModalOpen}
          onOpenChange={setBoostModalOpen}
          vacancyId={boostVacancy.id}
          vacancyTitle={boostVacancy.title}
          onSuccess={fetchVacancies}
        />
      )}

      {/* Depubliceer bevestiging */}
      <AlertDialog open={!!depublishConfirmId} onOpenChange={(open) => !open && setDepublishConfirmId(null)}>
        <AlertDialogContent className="bg-[#E8EEF2] rounded-t-[0.75rem] rounded-b-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#1F2D58]">Vacature offline halen?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#1F2D58]/70">
              Weet je zeker dat je deze vacature wilt depubliceren? De vacature is dan niet meer zichtbaar voor kandidaten. Je kunt de vacature later weer publiceren.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full border-[#193DAB]/12 text-[#1F2D58] hover:bg-[#193DAB]/12 hover:text-[#1F2D58]">Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDepublishConfirm}
              className="rounded-full bg-[#BC0000] text-white hover:bg-[#BC0000]/80"
            >
              Depubliceren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
