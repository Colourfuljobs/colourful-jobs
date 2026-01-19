"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { 
  Coins,
  Briefcase, 
  Users, 
  Plus,
  AlertTriangle,
  Clock,
  Pencil,
  Eye,
  Rocket,
  Upload,
  Copy,
} from "lucide-react"

import { Button, ArrowIcon } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
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
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { VacancyStatus } from "@/components/dashboard/VacancyCard"

// Mock data - will be replaced with real API calls
const mockCredits = {
  total: 50,
  used: 30,
  available: 20,
}

const mockVacancies = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    status: "gepubliceerd" as VacancyStatus,
    creditsUsed: 10,
    createdAt: new Date("2026-01-15"),
  },
  {
    id: "2",
    title: "UX Designer",
    status: "wacht_op_goedkeuring" as VacancyStatus,
    creditsUsed: 10,
    createdAt: new Date("2026-01-14"),
  },
  {
    id: "3",
    title: "Marketing Manager",
    status: "concept" as VacancyStatus,
    creditsUsed: 0,
    createdAt: new Date("2026-01-13"),
  },
  {
    id: "4",
    title: "Backend Developer",
    status: "verlopen" as VacancyStatus,
    creditsUsed: 10,
    createdAt: new Date("2026-01-10"),
  },
  {
    id: "5",
    title: "Product Owner",
    status: "gedepubliceerd" as VacancyStatus,
    creditsUsed: 10,
    createdAt: new Date("2026-01-08"),
  },
]

const mockTeamMembers = 4
const mockPublishedCount = 1
const mockPendingCount = 1

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

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Set page title
  useEffect(() => {
    document.title = "Dashboard | Colourful jobs"
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
      {/* Page title */}
      <h1 className="contempora-large text-[#1F2D58]">Dashboard</h1>

      {/* Low credits warning */}
      {!isLoading && mockCredits.available < 10 && (
        <Alert className="bg-[#193DAB]/[0.12] border-none">
          <AlertDescription className="text-[#1F2D58]">
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-[#F86600]" />
              </div>
              <div className="flex-1">
                <strong className="block mb-1">Bijna op – koop credits</strong>
                <p className="text-sm">
                  Je hebt nog maar {mockCredits.available} credits over. Koop credits bij om nieuwe vacatures te kunnen plaatsen.
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats cards - 3 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {/* Credit Wallet Card */}
        <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden flex flex-col">
          <div className="bg-white/50 px-4 pt-4 pb-4">
            <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58] flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Credit wallet
            </h2>
          </div>
          <div className="bg-white p-6 flex-1 flex flex-col">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full mt-4" />
              </div>
            ) : (
              <>
                <div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-[#1F2D58]">
                      {mockCredits.available}
                    </p>
                    <p className="text-sm text-[#1F2D58]/70">beschikbare credits</p>
                  </div>
                  <div className="mt-4 space-y-2">
                    {/* Progress bar */}
                    <div className="h-3 w-full bg-[#E8EEF2] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-slate-400 rounded-full transition-all duration-500"
                        style={{ width: `${(mockCredits.used / mockCredits.total) * 100}%` }}
                      />
                    </div>
                    {/* Labels */}
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-[#1F2D58]">
                        {mockCredits.used} <span className="font-normal text-[#1F2D58]/70">gebruikt</span>
                      </span>
                      <span className="font-medium text-[#1F2D58]">
                        {mockCredits.total} <span className="font-normal text-[#1F2D58]/70">totaal</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-auto pt-4">
                  <Button className="w-full" variant="secondary" showArrow={false}>
                    <Plus className="h-4 w-4 mr-1" />
                    Credits bijkopen
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Published Vacancies Card */}
        <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden flex flex-col">
          <div className="bg-white/50 px-4 pt-4 pb-4">
            <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58] flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Actieve vacatures
            </h2>
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
                      {mockPublishedCount}
                    </p>
                    <p className="text-sm text-[#1F2D58]/70">gepubliceerd</p>
                  </div>
                  {mockPendingCount > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#E8EEF2]">
                      <div className="flex items-center gap-2 text-sm text-[#1F2D58]/70">
                        <Clock className="h-4 w-4" />
                        <span>{mockPendingCount} wacht op goedkeuring</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-auto pt-4">
                  <Button className="w-full" showArrow={false}>
                    <Plus className="h-4 w-4 mr-1" />
                    Nieuwe vacature
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Team Members Card */}
        <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden flex flex-col">
          <div className="bg-white/50 px-4 pt-4 pb-4">
            <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58] flex items-center gap-2">
              <Users className="h-5 w-5" />
              Teamleden
            </h2>
          </div>
          <div className="bg-white p-6 flex-1 flex flex-col">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-12" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full mt-4" />
              </div>
            ) : (
              <>
                <div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-[#1F2D58]">
                      {mockTeamMembers}
                    </p>
                    <p className="text-sm text-[#1F2D58]/70">teamleden</p>
                  </div>
                </div>
                <div className="mt-auto pt-4">
                  <Link href="/dashboard/team">
                    <Button className="w-full" variant="secondary">
                      Bekijk teamleden
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Latest Vacancies Section */}
      <section>
        {isLoading ? (
          <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
            <div className="bg-white/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 pt-4 pb-4">
              <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">Laatste vacatures</h2>
              <Link href="/dashboard/vacatures">
                <Button variant="secondary" size="sm" showArrow={false}>
                  Bekijk alle vacatures
                  <ArrowIcon />
                </Button>
              </Link>
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
        ) : mockVacancies.length === 0 ? (
          <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
            <div className="bg-white/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 pt-4 pb-4">
              <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">Laatste vacatures</h2>
              <Link href="/dashboard/vacatures">
                <Button variant="secondary" size="sm" showArrow={false}>
                  Bekijk alle vacatures
                  <ArrowIcon />
                </Button>
              </Link>
            </div>
            <Empty className="bg-white">
              <EmptyHeader>
                <EmptyMedia>
                  <Briefcase />
                </EmptyMedia>
                <EmptyTitle>Nog geen vacatures</EmptyTitle>
                <EmptyDescription>
                  Plaats je eerste vacature om kandidaten te bereiken.
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
            <div className="bg-white/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 pt-4 pb-4">
              <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">Laatste vacatures</h2>
              <Link href="/dashboard/vacatures">
                <Button variant="secondary" size="sm" showArrow={false}>
                  Bekijk alle vacatures
                  <ArrowIcon />
                </Button>
              </Link>
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
                {mockVacancies.slice(0, 5).map((vacancy) => {
                  const config = statusConfig[vacancy.status]
                  const actions = actionsPerStatus[vacancy.status]
                  
                  return (
                    <TableRow key={vacancy.id} className="border-b border-[#E8EEF2] hover:bg-[#193DAB]/[0.04]">
                      <TableCell>
                        <span className="font-bold text-[#1F2D58]">{vacancy.title}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant}>{config.label}</Badge>
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
