"use client"

import { useEffect, useState } from "react"
import {
  Coins,
  Plus,
  AlertTriangle,
  ChevronDown,
  Download,
  Briefcase,
  Rocket,
  RefreshCw,
  ShoppingCart,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"

// Transaction types
type TransactionType = "job_posting" | "boost" | "purchase" | "correction"
type InvoiceStatus = "open" | "betaald" | "in_afhandeling"

interface Transaction {
  id: string
  date: Date
  type: TransactionType
  description: string
  credits: number // positief = credit, negatief = debit
  invoiceStatus?: InvoiceStatus
  invoiceUrl?: string // alleen bij purchase
}

// Type configuration
const typeConfig: Record<TransactionType, {
  label: string
  variant: "success" | "info" | "warning" | "muted"
  icon: React.ComponentType<{ className?: string }>
}> = {
  purchase: {
    label: "Aankoop",
    variant: "success",
    icon: ShoppingCart,
  },
  job_posting: {
    label: "Vacature",
    variant: "info",
    icon: Briefcase,
  },
  boost: {
    label: "Boost",
    variant: "warning",
    icon: Rocket,
  },
  correction: {
    label: "Correctie",
    variant: "muted",
    icon: RefreshCw,
  },
}

// Invoice status configuration
const invoiceStatusConfig: Record<InvoiceStatus, {
  label: string
  variant: "info" | "success" | "warning"
}> = {
  open: {
    label: "Open",
    variant: "info",
  },
  betaald: {
    label: "Betaald",
    variant: "success",
  },
  in_afhandeling: {
    label: "In afhandeling",
    variant: "warning",
  },
}

// Filter options
const filterTypes: { value: TransactionType; label: string }[] = [
  { value: "purchase", label: "Aankoop" },
  { value: "job_posting", label: "Vacature" },
  { value: "boost", label: "Boost" },
  { value: "correction", label: "Correctie" },
]

// Mock data
const mockCredits = {
  total: 100,
  used: 45,
  available: 55,
}

const mockTransactions: Transaction[] = [
  {
    id: "1",
    date: new Date("2026-01-15"),
    type: "purchase",
    description: "Creditpakket 50 credits",
    credits: 50,
    invoiceStatus: "betaald",
    invoiceUrl: "/invoices/INV-2026-001.pdf",
  },
  {
    id: "2",
    date: new Date("2026-01-14"),
    type: "job_posting",
    description: "Vacature: Senior Frontend Developer",
    credits: -10,
  },
  {
    id: "3",
    date: new Date("2026-01-13"),
    type: "boost",
    description: "Boost: Senior Frontend Developer",
    credits: -5,
  },
  {
    id: "4",
    date: new Date("2026-01-10"),
    type: "job_posting",
    description: "Vacature: UX Designer",
    credits: -10,
  },
  {
    id: "5",
    date: new Date("2026-01-08"),
    type: "purchase",
    description: "Creditpakket 50 credits",
    credits: 50,
    invoiceStatus: "betaald",
    invoiceUrl: "/invoices/INV-2026-002.pdf",
  },
  {
    id: "6",
    date: new Date("2026-01-05"),
    type: "job_posting",
    description: "Vacature: Marketing Manager",
    credits: -10,
  },
  {
    id: "7",
    date: new Date("2026-01-03"),
    type: "correction",
    description: "Compensatie: technische storing",
    credits: 5,
  },
  {
    id: "8",
    date: new Date("2026-01-02"),
    type: "boost",
    description: "Boost: UX Designer",
    credits: -5,
  },
  {
    id: "9",
    date: new Date("2025-12-28"),
    type: "job_posting",
    description: "Vacature: Backend Developer",
    credits: -10,
  },
  {
    id: "10",
    date: new Date("2025-12-20"),
    type: "purchase",
    description: "Creditpakket 25 credits",
    credits: 25,
    invoiceStatus: "open",
    invoiceUrl: "/invoices/INV-2025-003.pdf",
  },
]

// Helper function to format date
function formatDate(date: Date): string {
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// Multi-select filter component
function TypeFilter({
  selectedTypes,
  onTypeChange,
}: {
  selectedTypes: TransactionType[]
  onTypeChange: (types: TransactionType[]) => void
}) {
  const toggleType = (type: TransactionType) => {
    if (selectedTypes.includes(type)) {
      onTypeChange(selectedTypes.filter((t) => t !== type))
    } else {
      onTypeChange([...selectedTypes, type])
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
          Filter op type
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="p-2 space-y-2">
          {filterTypes.map((type) => (
            <label
              key={type.value}
              className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-[#193DAB]/[0.08] cursor-pointer"
            >
              <Checkbox
                checked={selectedTypes.includes(type.value)}
                onCheckedChange={() => toggleType(type.value)}
                className="data-[state=checked]:bg-[#1F2D58] data-[state=checked]:border-[#1F2D58]"
              />
              <span className="text-sm text-[#1F2D58]">{type.label}</span>
            </label>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Table skeleton for loading state
function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-4 w-48 hidden sm:block" />
          <Skeleton className="h-4 w-16 ml-auto" />
          <Skeleton className="h-6 w-16 rounded-full hidden sm:block" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      ))}
    </div>
  )
}

export default function OrdersPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<TransactionType[]>(
    filterTypes.map((t) => t.value)
  )

  // Set page title
  useEffect(() => {
    document.title = "Orders | Colourful jobs"
  }, [])

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  // Filter transactions by selected types
  const filteredTransactions = mockTransactions.filter((t) =>
    selectedTypes.includes(t.type)
  )

  // Handle download click
  const handleDownload = (url: string) => {
    console.log("Download invoice:", url)
    // TODO: Implement actual download
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            <div className="flex items-center justify-between">
              <span>Er ging iets mis bij het laden van je orders.</span>
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
    <div className="space-y-6">
      {/* Page title */}
      <h1 className="contempora-large text-[#1F2D58]">Orders</h1>

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

      {/* Credits Overview Card */}
      <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden mb-10">
        <div className="bg-white/50 px-4 pt-4 pb-4">
          <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58] flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Creditsoverzicht
          </h2>
        </div>
        <div className="bg-white p-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-10 w-40 mt-4" />
            </div>
          ) : (
            <div>
              {/* Available credits - prominent */}
              <div className="space-y-1">
                <p className="text-4xl font-bold text-[#1F2D58]">
                  {mockCredits.available}
                </p>
                <p className="text-sm text-[#1F2D58]/70">beschikbare credits</p>
              </div>

              {/* Progress bar and stats */}
              <div className="mt-6 space-y-3">
                {/* Progress bar */}
                <div className="h-3 w-full bg-[#E8EEF2] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-400 rounded-full transition-all duration-500"
                    style={{ width: `${(mockCredits.used / mockCredits.total) * 100}%` }}
                  />
                </div>
                {/* Labels */}
                <div className="flex flex-col sm:flex-row sm:justify-between gap-2 text-sm">
                  <span className="font-medium text-[#1F2D58]">
                    {mockCredits.used} <span className="font-normal text-[#1F2D58]/70">gebruikt</span>
                  </span>
                  <span className="font-medium text-[#1F2D58]">
                    {mockCredits.total} <span className="font-normal text-[#1F2D58]/70">totaal aangeschaft</span>
                  </span>
                </div>
              </div>

              {/* Buy credits button */}
              <div className="mt-6">
                <Button showArrow={false}>
                  <Plus className="h-4 w-4 mr-1" />
                  Koop credits
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transactions Section */}
      <section>
        {isLoading ? (
          <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
            <div className="bg-white/50 px-4 pt-4 pb-4">
              <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">Transacties</h2>
            </div>
            <div className="bg-white">
              <TableSkeleton />
            </div>
          </div>
        ) : mockTransactions.length === 0 ? (
          <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
            <div className="bg-white/50 px-4 pt-4 pb-4">
              <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">Transacties</h2>
            </div>
            <Empty className="bg-white">
              <EmptyHeader>
                <EmptyMedia>
                  <Coins />
                </EmptyMedia>
                <EmptyTitle>Nog geen transacties</EmptyTitle>
                <EmptyDescription>
                  Je hebt nog geen transacties. Koop credits om je eerste vacature te plaatsen.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button showArrow={false}>
                  <Plus className="h-4 w-4 mr-1" />
                  Koop credits
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
            <div className="bg-white/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 pt-4 pb-4">
              <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">Transacties</h2>
              <TypeFilter
                selectedTypes={selectedTypes}
                onTypeChange={setSelectedTypes}
              />
            </div>
            <Empty className="bg-white">
              <EmptyHeader>
                <EmptyMedia>
                  <Coins />
                </EmptyMedia>
                <EmptyTitle>
                  {selectedTypes.length === 0
                    ? "Geen filter geselecteerd"
                    : "Geen transacties gevonden"
                  }
                </EmptyTitle>
                <EmptyDescription>
                  {selectedTypes.length === 0
                    ? "Selecteer minimaal één type in de filter om transacties te zien."
                    : "Er zijn geen transacties met de geselecteerde types."
                  }
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
            <div className="bg-white/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 pt-4 pb-4">
              <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">Transacties</h2>
              <TypeFilter
                selectedTypes={selectedTypes}
                onTypeChange={setSelectedTypes}
              />
            </div>
            <Table className="bg-white">
              <TableHeader>
                <TableRow className="border-b border-[#E8EEF2] hover:bg-transparent">
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Datum</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Type</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] hidden sm:table-cell">Omschrijving</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] text-right">Credits</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] hidden sm:table-cell">Status</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] w-[60px]">Factuur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => {
                  const config = typeConfig[transaction.type]
                  const statusConfig = transaction.invoiceStatus
                    ? invoiceStatusConfig[transaction.invoiceStatus]
                    : null

                  return (
                    <TableRow key={transaction.id} className="border-b border-[#E8EEF2] hover:bg-[#193DAB]/[0.04]">
                      {/* Date */}
                      <TableCell className="text-[#1F2D58] font-bold whitespace-nowrap">
                        {formatDate(transaction.date)}
                      </TableCell>

                      {/* Type badge */}
                      <TableCell>
                        <Badge variant={config.variant}>
                          {config.label}
                        </Badge>
                      </TableCell>

                      {/* Description - hidden on mobile */}
                      <TableCell className="text-[#1F2D58] hidden sm:table-cell">
                        {transaction.description}
                      </TableCell>

                      {/* Credits - green for positive, default for negative */}
                      <TableCell className={`text-right font-medium whitespace-nowrap ${
                        transaction.credits > 0 ? "text-green-600" : "text-[#1F2D58]"
                      }`}>
                        {transaction.credits > 0 ? "+" : ""}{transaction.credits}
                      </TableCell>

                      {/* Invoice status - hidden on mobile, only for purchase */}
                      <TableCell className="hidden sm:table-cell">
                        {statusConfig && (
                          <Badge variant={statusConfig.variant}>
                            {statusConfig.label}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Invoice download */}
                      <TableCell>
                        {transaction.invoiceUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[#1F2D58]/70 hover:text-[#1F2D58] hover:bg-[#193DAB]/[0.08]"
                            onClick={() => handleDownload(transaction.invoiceUrl!)}
                            showArrow={false}
                          >
                            <Download className="h-4 w-4" />
                            <span className="sr-only">Download factuur</span>
                          </Button>
                        )}
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
