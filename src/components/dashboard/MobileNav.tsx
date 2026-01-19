"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Briefcase,
  Coins,
  FileText,
  Images,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Navigation items (same as sidebar)
const navItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Vacatures",
    url: "/dashboard/vacatures",
    icon: Briefcase,
  },
  {
    title: "Orders",
    url: "/dashboard/orders",
    icon: Coins,
  },
  {
    title: "Gegevens",
    url: "/dashboard/gegevens",
    icon: FileText,
  },
  {
    title: "Beeldbank",
    url: "/dashboard/media-library",
    icon: Images,
  },
  {
    title: "Team",
    url: "/dashboard/team",
    icon: Users,
  },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="sm:hidden sticky top-[48px] z-40 bg-[#E8EEF2] border-b border-[#1F2D58]/10">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 min-w-max">
          {navItems.map((item) => {
            const isActive = pathname === item.url || 
              (item.url !== "/dashboard" && pathname.startsWith(item.url))
            
            return (
              <Link
                key={item.title}
                href={item.url}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors",
                  "border-b-2 -mb-[1px]",
                  isActive
                    ? "text-[#1F2D58] border-[#1F2D58]"
                    : "text-[#1F2D58]/60 border-transparent hover:text-[#1F2D58] hover:border-[#1F2D58]/30"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
