"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Coins,
  Plus,
  AlertTriangle,
  ChevronDown,
  Download,
  FileText,
  Wallet,
  TrendingDown,
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
import { DesktopHeader } from "@/components/dashboard"
import { CreditsCheckoutModal } from "@/components/checkout/CreditsCheckoutModal"
import { InfoTooltip } from "@/components/ui/tooltip"
import { useCredits } from "@/lib/credits-context"
import type { TransactionRecord } from "@/lib/airtable"

// UI Transaction types (1-on-1 mapped from Airtable type field)
type UITransactionType = "purchase" | "spend" | "refund" | "adjustment" | "expiration"
// Category derived from Airtable context field
type UITransactionCategory = "vacancy" | "boost" | "credits" | "included" | null
type UIInvoiceStatus = "open" | "betaald" | "mislukt" | "terugbetaald"

interface UITransaction {
  id: string
  date: Date
  type: UITransactionType
  category: UITransactionCategory
  description: string
  credits: number // positief = credit, negatief = debit
  invoiceStatus?: UIInvoiceStatus
  invoiceUrl?: string // alleen bij purchase
  expiresAt?: Date // alleen bij purchase (creditpakketten)
}

interface CreditsOverview {
  available: number
  total_purchased: number
  total_spent: number
}

// Type configuration (for the Type column — maps 1-on-1 from Airtable type)
// Note: These are displayed as plain text, not badges
const typeConfig: Record<UITransactionType, {
  label: string
}> = {
  purchase: {
    label: "Aankoop",
  },
  spend: {
    label: "Besteed",
  },
  refund: {
    label: "Terugbetaling",
  },
  adjustment: {
    label: "Aanpassing",
  },
  expiration: {
    label: "Verlopen",
  },
}

// Category configuration (for the Category column — derived from Airtable context)
const categoryConfig: Record<NonNullable<UITransactionCategory>, {
  label: string
  variant: "success" | "info" | "warning" | "muted" | "destructive"
}> = {
  vacancy: {
    label: "Vacature",
    variant: "info",
  },
  boost: {
    label: "Boost",
    variant: "success",
  },
  credits: {
    label: "Credits",
    variant: "success",
  },
  included: {
    label: "Inbegrepen",
    variant: "muted",
  },
}

// Invoice status configuration
// Note: These are displayed as plain text, not badges
const invoiceStatusConfig: Record<UIInvoiceStatus, {
  label: string
}> = {
  open: {
    label: "Open",
  },
  betaald: {
    label: "Betaald",
  },
  mislukt: {
    label: "Mislukt",
  },
  terugbetaald: {
    label: "Terugbetaald",
  },
}

// Filter options (based on category)
const filterCategories: { value: NonNullable<UITransactionCategory>; label: string }[] = [
  { value: "vacancy", label: "Vacature" },
  { value: "boost", label: "Boost" },
  { value: "credits", label: "Credits" },
  { value: "included", label: "Inbegrepen" },
]

/**
 * Map Airtable transaction to UI transaction
 */
function mapTransactionToUI(
  transaction: TransactionRecord,
  productNames?: Record<string, string>
): UITransaction {
  // Type is 1-on-1 from Airtable
  const uiType: UITransactionType = transaction.type

  // Derive category from Airtable context field
  let category: UITransactionCategory = null
  switch (transaction.context) {
    case "vacancy":
      category = "vacancy"
      break
    case "boost":
    case "renew":
      category = "boost"
      break
    case "transactions":
    case "dashboard":
      category = "credits"
      break
    case "included":
      category = "included"
      break
    default:
      category = null
  }

  // Helper: resolve product display names from product_ids
  const getProductDisplayNames = (): string[] => {
    if (!productNames || !transaction.product_ids) return []
    return transaction.product_ids
      .map((id) => productNames[id])
      .filter((name): name is string => !!name)
  }

  // Build description: product + vacancy name combined
  let description: string
  switch (transaction.type) {
    case "purchase":
      description = `Creditpakket ${transaction.total_credits || 0} credits`
      break
    case "spend": {
      const productNamesList = getProductDisplayNames()
      const productLabel = productNamesList.length > 0 ? productNamesList.join(", ") : null
      if (productLabel && transaction.vacancy_name) {
        description = `${productLabel} — ${transaction.vacancy_name}`
      } else if (transaction.vacancy_name) {
        description = transaction.vacancy_name
      } else if (productLabel) {
        description = productLabel
      } else {
        description = "Transactie"
      }
      break
    }
    case "refund":
      description = transaction.vacancy_name
        ? `Terugbetaling — ${transaction.vacancy_name}`
        : "Terugbetaling"
      break
    case "adjustment":
      description = "Correctie"
      break
    case "expiration":
      description = "Credits verlopen"
      break
    default:
      description = "Transactie"
  }

  // Map status from Airtable to UI for all transaction types
  let invoiceStatus: UIInvoiceStatus | undefined
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

  // Get invoice URL from attachment (first item in array)
  const invoiceUrl = transaction.invoice?.[0]?.url

  // Calculate credits display value
  // For spend/expiration transactions, credits should be negative in UI
  let credits = transaction.total_credits || 0
  if (transaction.type === "spend" || transaction.type === "expiration") {
    credits = -Math.abs(credits) // Ensure it's negative
  } else if (transaction.type === "purchase" || transaction.type === "adjustment") {
    credits = Math.abs(credits) // Ensure it's positive for purchases
  } else if (transaction.type === "refund") {
    // Refunds can be positive (credits returned) or negative (credits taken back)
    // Keep the original sign from the database
  }

  // Parse expires_at for purchase transactions (credit packages)
  const expiresAt = transaction.type === "purchase" && transaction.expires_at
    ? new Date(transaction.expires_at)
    : undefined

  return {
    id: transaction.id,
    date: transaction["created-at"] ? new Date(transaction["created-at"]) : new Date(),
    type: uiType,
    category,
    description,
    credits,
    invoiceStatus,
    invoiceUrl,
    expiresAt,
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

// Multi-select filter component (filters by category)
function CategoryFilter({
  selectedCategories,
  onCategoryChange,
}: {
  selectedCategories: NonNullable<UITransactionCategory>[]
  onCategoryChange: (categories: NonNullable<UITransactionCategory>[]) => void
}) {
  const toggleCategory = (category: NonNullable<UITransactionCategory>) => {
    if (selectedCategories.includes(category)) {
      onCategoryChange(selectedCategories.filter((c) => c !== category))
    } else {
      onCategoryChange([...selectedCategories, category])
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
          Filter op categorie
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="p-2 space-y-2">
          {filterCategories.map((cat) => (
            <label
              key={cat.value}
              className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-[#193DAB]/[0.08] cursor-pointer"
            >
              <Checkbox
                checked={selectedCategories.includes(cat.value)}
                onCheckedChange={() => toggleCategory(cat.value)}
                className="data-[state=checked]:bg-[#1F2D58] data-[state=checked]:border-[#1F2D58]"
              />
              <span className="text-sm text-[#1F2D58]">{cat.label}</span>
            </label>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Table skeleton for loading state (7 columns)
function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full hidden sm:block" />
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
  // Get refetch from context to sync header credits after purchase
  const { credits: contextCredits, refetch: refetchCreditsContext } = useCredits()
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<UITransaction[]>([])
  const [credits, setCredits] = useState<CreditsOverview>({
    available: 0,
    total_purchased: 0,
    total_spent: 0,
  })
  const [selectedCategories, setSelectedCategories] = useState<NonNullable<UITransactionCategory>[]>(
    filterCategories.map((c) => c.value)
  )
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)

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
      
      // Map transactions to UI format, passing product names for display
      const productNames: Record<string, string> = data.productNames || {}
      const uiTransactions = (data.transactions || []).map(
        (tx: TransactionRecord) => mapTransactionToUI(tx, productNames)
      )
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

  // Filter transactions by selected categories
  // Transactions with category=null are always shown (they don't belong to a filterable category)
  const filteredTransactions = transactions.filter((t) =>
    t.category === null || selectedCategories.includes(t.category)
  )

  // Handle download click
  const handleDownload = (url: string) => {
    // Open in new tab for download
    window.open(url, "_blank")
  }

  // Handle checkout success
  const handleCheckoutSuccess = async () => {
    // Refresh the orders data to show the new transaction
    await fetchOrders()
    // Also sync the global credits context so header updates
    await refetchCreditsContext()
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
        <div className="bg-white/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
              <Coins className="h-5 w-5 text-[#1F2D58]" />
            </div>
            <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">
              Creditsoverzicht
            </h2>
          </div>
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
              {/* Credit stats grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Available - green */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#DEEEE3]">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                    <Wallet className="h-5 w-5 text-[#41712F]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-bold text-[#1F2D58] leading-tight">{credits.available}</p>
                    <p className="text-sm text-[#1F2D58]/70">beschikbaar</p>
                  </div>
                </div>

                {/* Used - red */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F4DCDC]">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                    <TrendingDown className="h-5 w-5 text-[#BC0000]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-bold text-[#1F2D58] leading-tight">{credits.total_spent}</p>
                    <p className="text-sm text-[#1F2D58]/70">gebruikt</p>
                  </div>
                </div>

                {/* Purchased - blue */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#193DAB]/[0.08]">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                    <ShoppingCart className="h-5 w-5 text-[#193DAB]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-bold text-[#1F2D58] leading-tight">{credits.total_purchased}</p>
                    <p className="text-sm text-[#1F2D58]/70">aangeschaft</p>
                  </div>
                </div>
              </div>

              {/* Credit expiry warning */}
              {contextCredits.expiring_soon && contextCredits.expiring_soon.total > 0 && (
                <div className="flex items-start gap-3 text-[#1F2D58] text-sm bg-[#193DAB]/[0.12] rounded-lg px-3 py-2 mt-4">
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-3.5 w-3.5 text-[#F86600] -mt-[2px]" />
                  </div>
                  <span className="flex-1 pt-0.5">
                    Let op: over {contextCredits.expiring_soon.days_until} {contextCredits.expiring_soon.days_until === 1 ? "dag" : "dagen"} verlopen{" "}
                    <strong>{contextCredits.expiring_soon.total} credits</strong>. Gebruik ze snel!
                  </span>
                  <div className="pt-0.5">
                    <InfoTooltip content="Gekochte credits zijn 1 jaar geldig na aankoop. Niet gebruikte credits vervallen automatisch na de vervaldatum." />
                  </div>
                </div>
              )}

              {/* Buy credits button */}
              <div className="mt-6">
                <Button showArrow={false} onClick={() => setCheckoutModalOpen(true)}>
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
            <div className="bg-white/50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-[#1F2D58]" />
                </div>
                <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">Transacties</h2>
              </div>
            </div>
            <div className="bg-white">
              <TableSkeleton />
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
            <div className="bg-white/50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-[#1F2D58]" />
                </div>
                <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">Transacties</h2>
              </div>
            </div>
            <Empty className="bg-white rounded-t-none">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Coins />
                </EmptyMedia>
                <EmptyTitle>Nog geen transacties</EmptyTitle>
                <EmptyDescription>
                  Je hebt nog geen transacties. Koop credits om je eerste vacature te plaatsen.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="secondary" showArrow={false} onClick={() => setCheckoutModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Koop credits
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
            <div className="bg-white/50 px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-[#1F2D58]" />
                  </div>
                  <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">Transacties</h2>
                </div>
                <div className="hidden">
                  <CategoryFilter
                    selectedCategories={selectedCategories}
                    onCategoryChange={setSelectedCategories}
                  />
                </div>
              </div>
            </div>
            <Empty className="bg-white rounded-t-none">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Coins />
                </EmptyMedia>
                <EmptyTitle>
                  {selectedCategories.length === 0
                    ? "Geen filter geselecteerd"
                    : "Geen transacties gevonden"
                  }
                </EmptyTitle>
                <EmptyDescription>
                  {selectedCategories.length === 0
                    ? "Selecteer minimaal één categorie in de filter om transacties te zien."
                    : "Er zijn geen transacties met de geselecteerde categorieën."
                  }
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
            <div className="bg-white/50 px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-[#1F2D58]" />
                  </div>
                  <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">Transacties</h2>
                </div>
                <div className="hidden">
                  <CategoryFilter
                    selectedCategories={selectedCategories}
                    onCategoryChange={setSelectedCategories}
                  />
                </div>
              </div>
            </div>
            <Table className="bg-white">
              <TableHeader>
                <TableRow className="border-b border-[#E8EEF2] hover:bg-transparent">
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Categorie</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] hidden sm:table-cell">Omschrijving</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Datum</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] hidden sm:table-cell">Type</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] text-right whitespace-nowrap">Credits</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] hidden sm:table-cell">Status</TableHead>
                  <TableHead className="text-slate-400 font-semibold uppercase text-[12px] w-[60px]">Factuur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => {
                  const tConfig = typeConfig[transaction.type]
                  const catConfig = transaction.category
                    ? categoryConfig[transaction.category]
                    : null
                  const statusConfig = transaction.invoiceStatus
                    ? invoiceStatusConfig[transaction.invoiceStatus]
                    : null

                  return (
                    <TableRow key={transaction.id} className="border-b border-[#E8EEF2] hover:bg-[#193DAB]/[0.04]">
                      {/* Category badge */}
                      <TableCell>
                        {catConfig && (
                          <Badge variant={catConfig.variant}>
                            {catConfig.label}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Description - hidden on mobile */}
                      <TableCell className="text-[#1F2D58] hidden sm:table-cell">
                        {transaction.description}
                        {transaction.expiresAt && (
                          <span className="text-[#1F2D58]/60">
                            {" "}(geldig t/m {transaction.expiresAt.toLocaleDateString("nl-NL", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })})
                          </span>
                        )}
                      </TableCell>

                      {/* Date */}
                      <TableCell className="text-[#1F2D58] whitespace-nowrap">
                        {formatDate(transaction.date)}
                      </TableCell>

                      {/* Type - plain text, hidden on mobile */}
                      <TableCell className="hidden sm:table-cell text-[#1F2D58]/60">
                        {tConfig.label}
                      </TableCell>

                      {/* Credits - green for positive, default for negative */}
                      <TableCell className={`text-right font-medium whitespace-nowrap ${
                        transaction.credits > 0 ? "text-[#41712F]" : "text-[#1F2D58]"
                      }`}>
                        {transaction.credits > 0 ? "+" : ""}{transaction.credits}
                      </TableCell>

                      {/* Invoice status - plain text, hidden on mobile */}
                      <TableCell className="hidden sm:table-cell text-[#1F2D58]/60">
                        {statusConfig?.label}
                      </TableCell>

                      {/* Invoice download */}
                      <TableCell>
                        {transaction.invoiceUrl && (
                          <Button
                            variant="tertiary"
                            size="icon"
                            className="h-8 w-8"
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

      {/* Credits Checkout Modal */}
      <CreditsCheckoutModal
        open={checkoutModalOpen}
        onOpenChange={setCheckoutModalOpen}
        context="transactions"
        currentBalance={credits.available}
        onSuccess={handleCheckoutSuccess}
      />
    </div>
  )
}
