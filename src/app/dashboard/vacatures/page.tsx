"use client"

import { useEffect, useState } from "react"
import { 
  Plus,
  AlertTriangle,
  Briefcase,
  ChevronDown,
  Check,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { VacancyCard, VacancyCardSkeleton, VacancyStatus } from "@/components/dashboard/VacancyCard"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"

// Filter status options (excluding gepubliceerd which is in separate section)
const filterStatuses: { value: VacancyStatus; label: string }[] = [
  { value: "concept", label: "Concept" },
  { value: "wacht_op_goedkeuring", label: "Wacht op goedkeuring" },
  { value: "verlopen", label: "Verlopen" },
  { value: "gedepubliceerd", label: "Gedepubliceerd" },
]

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
        <button 
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1F2D58] hover:text-[#1F2D58]/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F2D58] focus-visible:ring-offset-2 rounded-sm underline underline-offset-2"
        >
          Filter op status
          <ChevronDown className="h-4 w-4" />
        </button>
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
      {/* Page title */}
      <h1 className="contempora-large text-[#1F2D58]">Vacatures</h1>

      {/* Section 1: Gepubliceerde vacatures */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[#1F2D58]">Gepubliceerde vacatures</h2>
        
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <VacancyCardSkeleton key={i} variant="full" />
            ))}
          </div>
        ) : publishedVacancies.length === 0 ? (
          <Empty>
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
        ) : (
          <div className="space-y-3">
            {publishedVacancies.map((vacancy) => (
              <VacancyCard
                key={vacancy.id}
                id={vacancy.id}
                title={vacancy.title}
                status={vacancy.status}
                creditsUsed={vacancy.creditsUsed}
                location={vacancy.location}
                employmentType={vacancy.employmentType}
                publishedAt={vacancy.publishedAt}
                closingDate={vacancy.closingDate}
                variant="full"
                onAction={handleVacancyAction}
              />
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Overige vacatures */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-[#1F2D58]">Overige vacatures</h2>
          
          {/* Status filter */}
          {!isLoading && otherVacancies.length > 0 && (
            <StatusFilter
              selectedStatuses={selectedStatuses}
              onStatusChange={setSelectedStatuses}
            />
          )}
        </div>
        
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <VacancyCardSkeleton key={i} variant="full" />
            ))}
          </div>
        ) : otherVacancies.length === 0 ? (
          <Empty>
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
        ) : filteredOtherVacancies.length === 0 ? (
          <Empty>
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
        ) : (
          <div className="space-y-3">
            {filteredOtherVacancies.map((vacancy) => (
              <VacancyCard
                key={vacancy.id}
                id={vacancy.id}
                title={vacancy.title}
                status={vacancy.status}
                creditsUsed={vacancy.creditsUsed}
                location={vacancy.location}
                employmentType={vacancy.employmentType}
                publishedAt={vacancy.publishedAt}
                closingDate={vacancy.closingDate}
                variant="full"
                onAction={handleVacancyAction}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
