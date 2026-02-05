"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  Coins,
  Briefcase, 
  Plus,
  AlertTriangle,
  Clock,
  Pencil,
  Eye,
  Rocket,
  Upload,
  Building2,
  CheckCircle2,
  Circle,
  ListChecks,
  PartyPopper,
} from "lucide-react"

import { Button, ArrowIcon } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { DesktopHeader } from "@/components/dashboard"
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
  InfoTooltip,
} from "@/components/ui/tooltip"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { VacancyStatus } from "@/components/dashboard/VacancyCard"
import { CreditsCheckoutModal } from "@/components/checkout/CreditsCheckoutModal"
import { useCredits } from "@/lib/credits-context"
import { useAccount } from "@/lib/account-context"

// Types for vacancy data from API
interface Vacancy {
  id: string
  title?: string
  status: VacancyStatus
  credits_spent?: number
  money_invoiced?: number
  "created-at"?: string
  package_id?: string
  description?: string
}

// Status configuration
const statusConfig: Record<VacancyStatus, {
  label: string
  variant: "muted" | "info" | "success" | "warning" | "error"
  showCredits: boolean
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

// Types for team data
interface TeamMember {
  id: string
  status: "active" | "invited"
}

export default function DashboardPage() {
  const router = useRouter()
  const { credits, isLoading: isCreditsLoading, isPendingUpdate, updateCredits, setOptimisticUpdate } = useCredits()
  const { accountData, refreshAccount } = useAccount()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teamCount, setTeamCount] = useState(0)
  const [invitedCount, setInvitedCount] = useState(0)
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [vacancies, setVacancies] = useState<Vacancy[]>([])
  const [publishedCount, setPublishedCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [hasMediaAssets, setHasMediaAssets] = useState(false)
  const [isOnboardingFadingOut, setIsOnboardingFadingOut] = useState(false)

  // Get onboarding dismissed state from account context (per employer)
  const onboardingDismissed = accountData?.onboarding_dismissed ?? false

  // Get profile status from shared account context (no duplicate API call needed)
  const profileComplete = accountData?.profile_complete ?? true
  const profileMissingFields = accountData?.profile_missing_fields ?? []

  // Check if user has submitted vacancies (not just concepts)
  const hasSubmittedVacancies = vacancies.some(v => v.status !== "concept")

  // Check if all onboarding items are complete
  const allOnboardingComplete = 
    profileComplete && 
    credits.total_purchased > 0 && 
    hasSubmittedVacancies && 
    hasMediaAssets && 
    (teamCount > 1 || invitedCount > 0)

  // Handle dismissing the onboarding card (saves to employer record)
  const handleDismissOnboarding = useCallback(async () => {
    setIsOnboardingFadingOut(true)
    
    // Save to database via API
    try {
      await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "onboarding",
          data: { onboarding_dismissed: true },
        }),
      })
      // Refresh account data to get the updated state
      await refreshAccount()
    } catch (error) {
      console.error("Error dismissing onboarding:", error)
    }
  }, [refreshAccount])

  // Set page title
  useEffect(() => {
    document.title = "Dashboard | Colourful jobs"
  }, [])

  // Fetch team data, vacancies, and media (account data comes from AccountProvider context)
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch team data, vacancies, and media in parallel
        // Note: account data is now shared via AccountProvider context - no duplicate call needed
        const [teamResponse, vacanciesResponse, mediaResponse] = await Promise.all([
          fetch("/api/team"),
          fetch("/api/vacancies"),
          fetch("/api/media"),
        ])

        // Process team data
        if (teamResponse.ok) {
          const teamData = await teamResponse.json()
          if (teamData.team) {
            const activeMembers = teamData.team.filter((m: TeamMember) => m.status === "active")
            const invitedMembers = teamData.team.filter((m: TeamMember) => m.status === "invited")
            setTeamCount(activeMembers.length)
            setInvitedCount(invitedMembers.length)
          }
        }

        // Process vacancies data
        if (vacanciesResponse.ok) {
          const vacanciesData = await vacanciesResponse.json()
          if (vacanciesData.vacancies) {
            // Sort by created-at descending and take the first 5
            const sortedVacancies = vacanciesData.vacancies.sort(
              (a: Vacancy, b: Vacancy) => {
                const dateA = a["created-at"] ? new Date(a["created-at"]).getTime() : 0
                const dateB = b["created-at"] ? new Date(b["created-at"]).getTime() : 0
                return dateB - dateA
              }
            )
            setVacancies(sortedVacancies.slice(0, 5))
            
            // Count published and pending vacancies
            const published = vacanciesData.vacancies.filter(
              (v: Vacancy) => v.status === "gepubliceerd"
            ).length
            const pending = vacanciesData.vacancies.filter(
              (v: Vacancy) => v.status === "wacht_op_goedkeuring"
            ).length
            setPublishedCount(published)
            setPendingCount(pending)
          }
        }

        // Process media data for action checklist
        if (mediaResponse.ok) {
          const mediaData = await mediaResponse.json()
          setHasMediaAssets((mediaData.images?.length ?? 0) > 0)
        }

        setIsLoading(false)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Er ging iets mis bij het laden van je gegevens")
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Determine the furthest step for a vacancy based on its data
  const getFurthestStep = (vacancy: Vacancy): 1 | 2 | 3 | 4 => {
    // If no package selected yet, start at step 1
    if (!vacancy.package_id) return 1
    
    // If package selected but no basic content, start at step 2
    if (!vacancy.title || !vacancy.description) return 2
    
    // If submitted/published, show step 4 (review/summary)
    if (vacancy.status === "wacht_op_goedkeuring" || vacancy.status === "gepubliceerd") return 4
    
    // If content is filled, go to step 2 to make edits
    return 2
  }

  const handleVacancyAction = (action: string, vacancyId: string) => {
    const vacancy = vacancies.find((v) => v.id === vacancyId)
    if (!vacancy) return

    switch (action) {
      case "wijzigen": {
        const step = getFurthestStep(vacancy)
        router.push(`/dashboard/vacatures/nieuw?id=${vacancyId}&step=${step}`)
        break
      }
      case "bekijken": {
        // Navigate to preview step (step 3)
        router.push(`/dashboard/vacatures/nieuw?id=${vacancyId}&step=3`)
        break
      }
      case "boosten":
        // TODO: Implement boost functionality
        console.log("Boosten:", vacancyId)
        break
      case "publiceren":
        // TODO: Implement publish functionality
        console.log("Publiceren:", vacancyId)
        break
    }
  }

  const handleCheckoutSuccess = (newBalance: number, purchasedAmount?: number) => {
    updateCredits(newBalance, purchasedAmount)
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            Er ging iets mis bij het laden van je dashboard. Probeer het later opnieuw.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header with title, credits and actions */}
      <DesktopHeader title="Dashboard" />

      {/* Profile incomplete alert */}
      {!isLoading && !profileComplete && (
        <Alert className="bg-[#193DAB]/[0.12] border-none p-6">
          <AlertDescription className="text-[#1F2D58]">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 text-center sm:text-left">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[#1F2D58]" />
              </div>
              <div className="flex-1">
                <h4 className="mb-1">Maak je werkgeversprofiel aan</h4>
                <p className="text-sm mb-3">
                  Om vacatures te plaatsen is een werkgeversprofiel nodig. Dit verschijnt op colourfuljobs.nl en is jouw kans om geschikte kandidaten aan te trekken.
                </p>
                <Link href="/dashboard/werkgeversprofiel">
                  <Button>
                    Werkgeversprofiel invullen
                  </Button>
                </Link>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats cards - 3 columns when onboarding visible, 2 columns when dismissed */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${!onboardingDismissed ? "lg:grid-cols-3" : ""}`}>
        {/* Credit Wallet Card */}
        <div className="rounded-t-[0.75rem] rounded-bl-[2rem] rounded-br-[0.75rem] overflow-hidden flex flex-col">
          <div className="bg-white/50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                <Coins className="h-5 w-5 text-[#1F2D58]" />
              </div>
              <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">Credits</h2>
            </div>
          </div>
          <div className="bg-white p-6 flex-1 flex flex-col">
            {isLoading || isCreditsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full mt-4" />
              </div>
            ) : (
              <>
                <div>
                  <div className="space-y-2">
                    {isPendingUpdate ? (
                      <div className="flex items-center gap-2">
                        <Spinner className="h-6 w-6" />
                        <p className="text-xl font-bold text-[#1F2D58]/70">Bijwerken...</p>
                      </div>
                    ) : (
                      <p className="text-3xl font-bold text-[#1F2D58]">
                        {credits.available} <span className="text-base font-normal text-[#1F2D58]/70">beschikbare credits</span>
                      </p>
                    )}
                    
                    {/* Credit expiry warning */}
                    {credits.expiring_soon && credits.expiring_soon.total > 0 && (
                      <div className="flex items-start gap-3 text-[#1F2D58] text-sm bg-[#193DAB]/[0.12] rounded-lg px-3 py-2">
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="h-3.5 w-3.5 text-[#F86600] -mt-[2px]" />
                        </div>
                        <span className="flex-1 pt-0.5">
                          Let op: over {credits.expiring_soon.days_until} {credits.expiring_soon.days_until === 1 ? "dag" : "dagen"} verlopen{" "}
                          <strong>{credits.expiring_soon.total} credits</strong>. Gebruik ze snel!
                        </span>
                        <div className="pt-0.5">
                          <InfoTooltip content="Gekochte credits zijn 1 jaar geldig na aankoop. Niet gebruikte credits vervallen automatisch na de vervaldatum." />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 space-y-2">
                    {/* Progress bar */}
                    <div className="h-3 w-full bg-[#E8EEF2] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-slate-400 rounded-full transition-all duration-500"
                        style={{ width: credits.total_purchased > 0 ? `${(credits.total_spent / credits.total_purchased) * 100}%` : '0%' }}
                      />
                    </div>
                    {/* Labels */}
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-[#1F2D58]">
                        {credits.total_spent} <span className="font-normal text-[#1F2D58]/70">gebruikt</span>
                      </span>
                      <span className="font-medium text-[#1F2D58]">
                        {credits.available} <span className="font-normal text-[#1F2D58]/70">beschikbaar</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-auto pt-4">
                  <Button 
                    className="w-full" 
                    variant="secondary" 
                    showArrow={false}
                    onClick={() => setCheckoutModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Credits bijkopen
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Published Vacancies Card */}
        <div className={`overflow-hidden flex flex-col ${
          onboardingDismissed 
            ? "rounded-t-[0.75rem] rounded-bl-[0.75rem] rounded-br-[2rem]" 
            : "rounded-[0.75rem]"
        }`}>
          <div className="bg-white/50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                <Briefcase className="h-5 w-5 text-[#1F2D58]" />
              </div>
              <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">Actieve vacatures</h2>
            </div>
          </div>
          <div className="bg-white p-6 flex-1 flex flex-col">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-12" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-10 w-full mt-4" />
              </div>
            ) : (
              <>
                <div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-[#1F2D58]">
                      {publishedCount}
                    </p>
                    <p className="text-sm text-[#1F2D58]/70">gepubliceerd</p>
                  </div>
                  {pendingCount > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#E8EEF2]">
                      <div className="flex items-center gap-2 text-sm text-[#1F2D58]/70">
                        <Clock className="h-4 w-4" />
                        <span>{pendingCount} wacht op goedkeuring</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-auto pt-4">
                  <Link href="/dashboard/vacatures/nieuw">
                    <Button className="w-full" showArrow={false}>
                      <Plus className="h-4 w-4 mr-1" />
                      Nieuwe vacature
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Checklist Card - Hidden when dismissed */}
        {!onboardingDismissed && (
          <div 
            className={`rounded-t-[0.75rem] rounded-bl-[0.75rem] rounded-br-[2rem] overflow-hidden flex flex-col relative transition-all duration-300 ${
              isOnboardingFadingOut ? "opacity-0 scale-95" : "opacity-100 scale-100"
            }`}
          >
            <div className="bg-white/50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                  <ListChecks className="h-5 w-5 text-[#1F2D58]" />
                </div>
                <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">Aan de slag</h2>
              </div>
            </div>
            <div className="bg-white p-6 flex-1 flex flex-col">
              {isLoading || isCreditsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="divide-y divide-[#E8EEF2]">
                  {/* Werkgeversprofiel */}
                  <li className="py-3 first:pt-0 last:pb-0">
                    <Link 
                      href="/dashboard/werkgeversprofiel"
                      className="flex items-center gap-3 group"
                    >
                      {profileComplete ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-[#1F2D58]/30 flex-shrink-0 group-hover:text-[#1F2D58]/50" />
                      )}
                      <span className={`text-sm flex-1 ${profileComplete ? "text-[#1F2D58]/50 line-through" : "text-[#1F2D58] group-hover:text-[#193DAB]"}`}>
                        Stel je werkgeversprofiel in
                      </span>
                      <InfoTooltip content="Laat kandidaten kennismaken met jouw bedrijf, cultuur en missie. Een compleet profiel trekt meer geschikte sollicitanten aan." />
                    </Link>
                  </li>

                  {/* Creditbundel */}
                  <li className="py-3 first:pt-0 last:pb-0">
                    <button 
                      onClick={() => setCheckoutModalOpen(true)}
                      className="flex items-center gap-3 group w-full text-left"
                    >
                      {credits.total_purchased > 0 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-[#1F2D58]/30 flex-shrink-0 group-hover:text-[#1F2D58]/50" />
                      )}
                      <span className={`text-sm flex-1 ${credits.total_purchased > 0 ? "text-[#1F2D58]/50 line-through" : "text-[#1F2D58] group-hover:text-[#193DAB]"}`}>
                        Koop een creditbundel
                      </span>
                      <InfoTooltip content="Credits gebruik je voor vacatureplaatsingen. Grotere bundels geven meer korting per vacature." />
                    </button>
                  </li>

                  {/* Eerste vacature - alleen afgevinkt bij ingediende vacatures (niet concept) */}
                  <li className="py-3 first:pt-0 last:pb-0">
                    <Link 
                      href="/dashboard/vacatures/nieuw"
                      className="flex items-center gap-3 group"
                    >
                      {hasSubmittedVacancies ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-[#1F2D58]/30 flex-shrink-0 group-hover:text-[#1F2D58]/50" />
                      )}
                      <span className={`text-sm flex-1 ${hasSubmittedVacancies ? "text-[#1F2D58]/50 line-through" : "text-[#1F2D58] group-hover:text-[#193DAB]"}`}>
                        Plaats je eerste vacature
                      </span>
                      <InfoTooltip content="Bereik direct een diverse groep kandidaten die actief op zoek zijn naar een nieuwe uitdaging." />
                    </Link>
                  </li>

                  {/* Beeldbank */}
                  <li className="py-3 first:pt-0 last:pb-0">
                    <Link 
                      href="/dashboard/media-library"
                      className="flex items-center gap-3 group"
                    >
                      {hasMediaAssets ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-[#1F2D58]/30 flex-shrink-0 group-hover:text-[#1F2D58]/50" />
                      )}
                      <span className={`text-sm flex-1 ${hasMediaAssets ? "text-[#1F2D58]/50 line-through" : "text-[#1F2D58] group-hover:text-[#193DAB]"}`}>
                        Vul je beeldbank
                      </span>
                      <InfoTooltip content="Upload je foto's één keer en hergebruik ze eenvoudig in je werkgeversprofiel en vacatures." />
                    </Link>
                  </li>

                  {/* Teamleden uitnodigen */}
                  <li className="py-3 first:pt-0 last:pb-0">
                    <Link 
                      href="/dashboard/team"
                      className="flex items-center gap-3 group"
                    >
                      {teamCount > 1 || invitedCount > 0 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-[#1F2D58]/30 flex-shrink-0 group-hover:text-[#1F2D58]/50" />
                      )}
                      <span className={`text-sm flex-1 ${teamCount > 1 || invitedCount > 0 ? "text-[#1F2D58]/50 line-through" : "text-[#1F2D58] group-hover:text-[#193DAB]"}`}>
                        Nodig collega&apos;s uit
                      </span>
                      <InfoTooltip content="Geef collega's toegang zodat jullie samen vacatures kunnen beheren en kandidaten kunnen beoordelen." />
                    </Link>
                  </li>
                </ul>
              )}
            </div>

            {/* Completion overlay - shown when all items are complete */}
            {allOnboardingComplete && !isLoading && !isCreditsLoading && (
              <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center p-6 rounded-t-[0.75rem] rounded-bl-[0.75rem] rounded-br-[2rem] overflow-hidden">
                {/* Confetti elements */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="confetti-piece confetti-1" />
                  <div className="confetti-piece confetti-2" />
                  <div className="confetti-piece confetti-3" />
                  <div className="confetti-piece confetti-4" />
                  <div className="confetti-piece confetti-5" />
                  <div className="confetti-piece confetti-6" />
                  <div className="confetti-piece confetti-7" />
                  <div className="confetti-piece confetti-8" />
                  <div className="confetti-piece confetti-9" />
                  <div className="confetti-piece confetti-10" />
                  <div className="confetti-piece confetti-11" />
                  <div className="confetti-piece confetti-12" />
                </div>
                
                {/* Content */}
                <div className="relative z-10 text-center">
                  <div className="w-14 h-14 rounded-full bg-[#193DAB]/12 flex items-center justify-center mx-auto mb-4">
                    <PartyPopper className="h-7 w-7 text-[#1F2D58]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#1F2D58] mb-2">Goed bezig!</h3>
                  <p className="text-sm text-[#1F2D58]/70 mb-6">
                    Je haalt nu het maximale uit Colourful jobs.
                  </p>
                  <Button 
                    variant="secondary" 
                    onClick={handleDismissOnboarding}
                    showArrow={false}
                  >
                    Sluiten
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Latest Vacancies Section */}
      <section>
        {isLoading ? (
          <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
            <div className="bg-white/50 px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">Laatste vacatures</h2>
                <Link href="/dashboard/vacatures">
                  <Button variant="tertiary" size="sm" showArrow={false}>
                    Bekijk alle vacatures
                    <ArrowIcon />
                  </Button>
                </Link>
              </div>
            </div>
            <Table className="bg-white">
              <TableHeader>
                <TableRow className="border-b border-[#E8EEF2] hover:bg-transparent">
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Vacature</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Status</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3].map((i) => (
                  <TableRow key={i} className="border-b border-[#E8EEF2] hover:bg-[#193DAB]/[0.04]">
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : vacancies.length === 0 ? (
          <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
            <div className="bg-white/50 px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">Laatste vacatures</h2>
                <Link href="/dashboard/vacatures">
                  <Button variant="tertiary" size="sm" showArrow={false}>
                    Bekijk alle vacatures
                    <ArrowIcon />
                  </Button>
                </Link>
              </div>
            </div>
            <Empty className="bg-white">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Briefcase />
                </EmptyMedia>
                <EmptyTitle>Nog geen vacatures</EmptyTitle>
                <EmptyDescription>
                  Plaats je eerste vacature om kandidaten te bereiken.
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
              <div className="flex items-center justify-between gap-3">
                <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">Laatste vacatures</h2>
                <Link href="/dashboard/vacatures">
                  <Button variant="tertiary" size="sm" showArrow={false}>
                    Bekijk alle vacatures
                    <ArrowIcon />
                  </Button>
                </Link>
              </div>
            </div>
            <Table className="bg-white">
              <TableHeader>
                <TableRow className="border-b border-[#E8EEF2] hover:bg-transparent">
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Vacature</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Status</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vacancies.map((vacancy) => {
                  const config = statusConfig[vacancy.status]
                  const actions = actionsPerStatus[vacancy.status]
                  
                  return (
                    <TableRow key={vacancy.id} className="border-b border-[#E8EEF2] hover:bg-[#193DAB]/[0.04]">
                      <TableCell>
                        <span className="font-bold text-[#1F2D58]">{vacancy.title || "Naamloze vacature"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant}>{config.label}</Badge>
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

      {/* Credits Checkout Modal */}
      <CreditsCheckoutModal
        open={checkoutModalOpen}
        onOpenChange={setCheckoutModalOpen}
        context="dashboard"
        currentBalance={credits.available}
        onSuccess={handleCheckoutSuccess}
        onPendingChange={setOptimisticUpdate}
      />
    </div>
  )
}
