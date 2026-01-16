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
} from "lucide-react"

import { Button, ArrowIcon } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { VacancyCard, VacancyCardSkeleton, VacancyStatus } from "@/components/dashboard/VacancyCard"

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Credit Wallet Card */}
        <Card className="bg-white border-none flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="!text-xl font-medium text-[#1F2D58]/70 flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Credit wallet
            </CardTitle>
          </CardHeader>
          <Separator className="mx-6 w-auto bg-[#E8EEF2]" />
          <CardContent className="flex-1 flex flex-col">
            {isLoading ? (
              <div className="space-y-3 pt-2">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full mt-4" />
              </div>
            ) : (
              <>
                <div>
                  <div className="space-y-1 pt-2">
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
          </CardContent>
        </Card>

        {/* Published Vacancies Card */}
        <Card className="bg-white border-none flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="!text-xl font-medium text-[#1F2D58]/70 flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Actieve vacatures
            </CardTitle>
          </CardHeader>
          <Separator className="mx-6 w-auto bg-[#E8EEF2]" />
          <CardContent className="flex-1 flex flex-col">
            {isLoading ? (
              <div className="space-y-3 pt-2">
                <Skeleton className="h-10 w-12" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-10 w-full mt-4" />
              </div>
            ) : (
              <>
                <div>
                  <div className="space-y-1 pt-2">
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
          </CardContent>
        </Card>

        {/* Team Members Card */}
        <Card className="bg-white border-none flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="!text-xl font-medium text-[#1F2D58]/70 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Teamleden
            </CardTitle>
          </CardHeader>
          <Separator className="mx-6 w-auto bg-[#E8EEF2]" />
          <CardContent className="flex-1 flex flex-col">
            {isLoading ? (
              <div className="space-y-3 pt-2">
                <Skeleton className="h-10 w-12" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full mt-4" />
              </div>
            ) : (
              <>
                <div>
                  <div className="space-y-1 pt-2">
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
          </CardContent>
        </Card>
      </div>

      {/* Latest Vacancies Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#1F2D58]">Laatste vacatures</h2>
          <Link href="/dashboard/vacatures">
            <Button variant="ghost" className="text-[#1F2D58] hover:text-[#193DAB]" showArrow={false}>
              Bekijk alle vacatures
              <ArrowIcon />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <VacancyCardSkeleton key={i} />
            ))}
          </div>
        ) : mockVacancies.length === 0 ? (
          <Empty>
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
        ) : (
          <div className="space-y-3">
            {mockVacancies.slice(0, 5).map((vacancy) => (
              <VacancyCard
                key={vacancy.id}
                id={vacancy.id}
                title={vacancy.title}
                status={vacancy.status}
                creditsUsed={vacancy.creditsUsed}
                onAction={handleVacancyAction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
