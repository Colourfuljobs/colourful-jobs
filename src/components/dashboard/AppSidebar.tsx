"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { toast } from "sonner"
import {
  LayoutDashboard,
  Briefcase,
  Coins,
  FileText,
  Images,
  Users,
  LogOut,
  ChevronsUpDown,
  User,
  Settings,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

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

interface AppSidebarProps {
  user?: {
    name?: string | null
    email?: string | null
  }
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()

  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: "/login" })
    toast.success("Je bent succesvol uitgelogd")
  }

  return (
    <Sidebar collapsible="none">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center">
          <img
            src="/logo.svg"
            alt="Colourful jobs"
            width={160}
            height={32}
            className="h-8 w-auto"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent className="h-full">
        <SidebarGroup className="h-full pl-0">
          <SidebarGroupContent className="h-full">
            <SidebarMenu className="h-full">
              {navItems.map((item) => {
                const isActive = pathname === item.url || 
                  (item.url !== "/dashboard" && pathname.startsWith(item.url))
                
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
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="border border-[#E8EEF2] data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-full">
                    <AvatarFallback className="rounded-full bg-[#193DAB]/12 text-[#1F2D58]">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate font-semibold text-[#1F2D58] text-sm">
                    {user?.name?.split(" ")[0] || "Gebruiker"}
                  </span>
                  <ChevronsUpDown className="ml-auto size-4 text-[#1F2D58]/60" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="start"
                sideOffset={4}
              >
                <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-[#193DAB]/12 text-[#1F2D58]">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-[#1F2D58]">
                      {user?.name || "Gebruiker"}
                    </span>
                    <span className="truncate text-xs text-[#1F2D58]/60">
                      {user?.email || ""}
                    </span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="text-[#1F2D58] cursor-pointer">
                  <Link href="/dashboard/gegevens">
                    <Settings className="mr-2 h-4 w-4" />
                    Gegevens
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-[#1F2D58] cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Uitloggen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

    </Sidebar>
  )
}
