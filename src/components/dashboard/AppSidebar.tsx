"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Briefcase,
  Coins,
  FileText,
  Images,
  Users,
  LogOut,
  User,
  ExternalLink,
  Building2,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { EmployerSwitcher } from "@/components/intermediary/EmployerSwitcher"

// Navigation items
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
    title: "Werkgeversprofiel",
    url: "/dashboard/werkgeversprofiel",
    icon: Building2,
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
  {
    title: "Gegevens",
    url: "/dashboard/gegevens",
    icon: FileText,
  },
  {
    title: "Orders",
    url: "/dashboard/orders",
    icon: Coins,
  },
]

interface AppSidebarProps {
  user?: {
    name?: string | null
    email?: string | null
  }
  profileComplete?: boolean
}

export function AppSidebar({ user, profileComplete = true }: AppSidebarProps) {
  const pathname = usePathname()

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    window.location.href = "/login"
  }

  return (
    <Sidebar collapsible="none">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center mb-4">
          <img
            src="/logo.svg"
            alt="Colourful jobs"
            width={160}
            height={32}
            className="h-8 w-auto"
          />
        </Link>
        {/* Employer switcher for intermediaries - negative margins to match menu item width */}
        <div className="-ml-4 -mr-4">
          <EmployerSwitcher />
        </div>
      </SidebarHeader>

      <SidebarContent className="h-full">
        <SidebarGroup className="h-full pl-0 pr-0">
          <SidebarGroupContent className="h-full">
            <SidebarMenu className="h-full">
              {navItems.map((item) => {
                const isActive = pathname === item.url || 
                  (item.url !== "/dashboard" && pathname.startsWith(item.url))
                const showNotification = item.url === "/dashboard/werkgeversprofiel" && !profileComplete
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={isActive ? "bg-[#193DAB]/12 text-[#1F2D58] font-medium" : "text-[#1F2D58]"}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {showNotification && (
                          <span className="-ml-1 self-start mt-0.5 w-1.5 h-1.5 rounded-full bg-[#F86600]" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-[#E8EEF2] p-0 gap-0">
        {/* User info */}
        <div className="flex items-center gap-3 pl-2 pr-4 py-3">
          <Avatar className="h-8 w-8 rounded-full">
            <AvatarFallback className="rounded-full bg-[#193DAB]/12 text-[#1F2D58]">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
            <span className="truncate font-semibold text-[#1F2D58]">
              {user?.name || "Gebruiker"}
            </span>
            <span className="truncate text-xs text-[#1F2D58]/60">
              {user?.email || ""}
            </span>
          </div>
        </div>
        
        {/* Divider */}
        <div className="border-t border-[#E8EEF2]" />
        
        {/* Actions - same styling as main menu */}
        <SidebarMenu className="pt-2 pb-0">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Colourful jobs website"
              className="text-[#1F2D58]"
            >
              <a
                href="https://colourfuljobs.nl"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Colourful jobs website</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip="Uitloggen"
              className="text-[#1F2D58]"
            >
              <LogOut className="h-4 w-4" />
              <span>Uitloggen</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

    </Sidebar>
  )
}
