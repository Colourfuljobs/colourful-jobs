"use client"

import { useEffect, useState, useCallback } from "react"
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
  Undo2,
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
import { DesktopHeader } from "@/components/dashboard"
import type { TransactionRecord } from "@/lib/airtable"

// UI Transaction types (mapped from Airtable)
type UITransactionType = "purchase" | "job_posting" | "boost" | "refund" | "correction"
type UIInvoiceStatus = "open" | "betaald" | "mislukt" | "terugbetaald"

interface UITransaction {
  id: string
  date: Date
  type: UITransactionType
  description: string
  credits: number // positief = credit, negatief = debit
  invoiceStatus?: UIInvoiceStatus
  invoiceUrl?: string // alleen bij purchase
}

interface CreditsOverview {
  available: number
  total_purchased: number
  total_spent: number
}

// Type configuration
const typeConfig: Record<UITransactionType, {
  label: string
  variant: "success" | "info" | "warning" | "muted" | "destructive"
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
  refund: {
    label: "Terugbetaling",
    variant: "destructive",
    icon: Undo2,
  },
  correction: {
    label: "Correctie",
    variant: "muted",
    icon: RefreshCw,
  },
}

// Invoice status configuration
const invoiceStatusConfig: Record<UIInvoiceStatus, {
  label: string
  variant: "info" | "success" | "warning" | "destructive"
}> = {
  open: {
    label: "Open",
    variant: "info",
  },
  betaald: {
    label: "Betaald",
    variant: "success",
  },
  mislukt: {
    label: "Mislukt",
    variant: "destructive",
  },
  terugbetaald: {
    label: "Terugbetaald",
    variant: "warning",
  },
}

// Filter options
const filterTypes: { value: UITransactionType; label: string }[] = [
  { value: "purchase", label: "Aankoop" },
  { value: "job_posting", label: "Vacature" },
  { value: "boost", label: "Boost" },
  { value: "refund", label: "Terugbetaling" },
  { value: "correction", label: "Correctie" },
]

/**
 * Map Airtable transaction to UI transaction
 */
function mapTransactionToUI(transaction: TransactionRecord): UITransaction {
  // Map type from Airtable to UI
  let uiType: UITransactionType
  let description: string

  switch (transaction.type) {
    case "purchase":
      uiType = "purchase"
      description = `Creditpakket ${transaction.credits_amount} credits`
      break
    case "spend":
      // Check if it's a boost (based on vacancy_name containing "Boost" or reference_type)
      // For now, we'll use a simple heuristic - if vacancy_name exists, it's a vacancy posting
      // You can adjust this logic based on your needs
      if (transaction.reference_type === "vacancy" && transaction.vacancy_name) {
        // Check if it's a boost by looking at the credits amount (boosts are typically less)
        // Or you could add a separate field in Airtable to distinguish
        uiType = "job_posting"
        description = `Vacature: ${transaction.vacancy_name}`
      } else {
        uiType = "job_posting"
        description = transaction.vacancy_name 
          ? `Vacature: ${transaction.vacancy_name}` 
          : "Vacatureplaatsing"
      }
      break
    case "refund":
      uiType = "refund"
      description = transaction.vacancy_name 
        ? `Terugbetaling: ${transaction.vacancy_name}` 
        : "Terugbetaling"
      break
    case "adjustment":
      uiType = "correction"
      description = "Correctie"
      break
    default:
      uiType = "correction"
      description = "Transactie"
  }

  // Map status from Airtable to UI
  let invoiceStatus: UIInvoiceStatus | undefined
  if (transaction.type === "purchase") {
    switch (transaction.status) {
      case "paid":
        invoiceStatus = "betaald"
        break
      case "open":
        invoiceStatus = "open"
        break
      case "failed":
        invoiceStatus = "mislukt"
        break
      case "refunded":
        invoiceStatus = "terugbetaald"
        break
    }
  }

  // Get invoice URL from attachment (first item in array)
  const invoiceUrl = transaction.invoice?.[0]?.url

  // Calculate credits display value
  // For spend transactions, credits should be negative in UI
  let credits = transaction.credits_amount
  if (transaction.type === "spend") {
    credits = -Math.abs(credits) // Ensure it's negative
  } else if (transaction.type === "purchase" || transaction.type === "adjustment") {
    credits = Math.abs(credits) // Ensure it's positive for purchases
  } else if (transaction.type === "refund") {
    // Refunds can be positive (credits returned) or negative (credits taken back)
    // Keep the original sign from the database
  }

  return {
    id: transaction.id,
    date: transaction["created-at"] ? new Date(transaction["created-at"]) : new Date(),
    type: uiType,
    description,
    credits,
    invoiceStatus,
    invoiceUrl,
  }
}

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
  selectedTypes: UITransactionType[]
  onTypeChange: (types: UITransactionType[]) => void
}) {
  const toggleType = (type: UITransactionType) => {
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
  const [transactions, setTransactions] = useState<UITransaction[]>([])
  const [credits, setCredits] = useState<CreditsOverview>({
    available: 0,
    total_purchased: 0,
    total_spent: 0,
  })
  const [selectedTypes, setSelectedTypes] = useState<UITransactionType[]>(
    filterTypes.map((t) => t.value)
  )

  // Set page title
  useEffect(() => {
    document.title = "Orders | Colourful jobs"
  }, [])

  // Fetch orders data
  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch("/api/orders")
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Kon orders niet laden")
      }
      
      const data = await response.json()
      
      // Map transactions to UI format
      const uiTransactions = (data.transactions || []).map(mapTransactionToUI)
      setTransactions(uiTransactions)
      
      // Set credits overview
      setCredits({
        available: data.credits?.available ?? 0,
        total_purchased: data.credits?.total_purchased ?? 0,
        total_spent: data.credits?.total_spent ?? 0,
      })
    } catch (err) {
      console.error("Error fetching orders:", err)
      setError(err instanceof Error ? err.message : "Er ging iets mis")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Filter transactions by selected types
  const filteredTransactions = transactions.filter((t) =>
    selectedTypes.includes(t.type)
  )

  // Handle download click
  const handleDownload = (url: string) => {
    // Open in new tab for download
    window.open(url, "_blank")
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <DesktopHeader title="Orders" />
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fetchOrders()}
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
      {/* Page header with title, credits and actions */}
      <DesktopHeader title="Orders" />

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
                  {credits.available}
                </p>
                <p className="text-sm text-[#1F2D58]/70">beschikbare credits</p>
              </div>

              {/* Progress bar and stats */}
              <div className="mt-6 space-y-3">
                {/* Progress bar */}
                <div className="h-3 w-full bg-[#E8EEF2] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-400 rounded-full transition-all duration-500"
                    style={{ 
                      width: credits.total_purchased > 0 
                        ? `${(credits.total_spent / credits.total_purchased) * 100}%` 
                        : "0%" 
                    }}
                  />
                </div>
                {/* Labels */}
                <div className="flex flex-col sm:flex-row sm:justify-between gap-2 text-sm">
                  <span className="font-medium text-[#1F2D58]">
                    {credits.total_spent} <span className="font-normal text-[#1F2D58]/70">gebruikt</span>
                  </span>
                  <span className="font-medium text-[#1F2D58]">
                    {credits.total_purchased} <span className="font-normal text-[#1F2D58]/70">totaal aangeschaft</span>
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
        ) : transactions.length === 0 ? (
          <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
            <div className="bg-white/50 px-4 pt-4 pb-4">
              <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">Transacties</h2>
            </div>
            <Empty className="bg-white rounded-t-none">
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
            <Empty className="bg-white rounded-t-none">
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
