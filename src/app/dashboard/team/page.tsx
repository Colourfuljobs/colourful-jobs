"use client"

import { useEffect, useState } from "react"
import { UserPlus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

// Types for team members
interface TeamMember {
  id: string
  first_name: string
  last_name: string
  email: string
  status: "active" | "invited"
}

// Mock data - will be replaced with real API calls
const mockTeamMembers: TeamMember[] = [
  {
    id: "1",
    first_name: "Jan",
    last_name: "de Vries",
    email: "jan@voorbeeld.nl",
    status: "active",
  },
  {
    id: "2",
    first_name: "Maria",
    last_name: "Jansen",
    email: "maria@voorbeeld.nl",
    status: "active",
  },
  {
    id: "3",
    first_name: "Piet",
    last_name: "Bakker",
    email: "piet@voorbeeld.nl",
    status: "invited",
  },
]

// Helper function to get initials from name
function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export default function TeamPage() {
  // Loading state
  const [isLoading, setIsLoading] = useState(true)

  // Set page title
  useEffect(() => {
    document.title = "Team | Colourful jobs"
  }, [])

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  // State for team members
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(mockTeamMembers)

  // State for invite form
  const [inviteEmail, setInviteEmail] = useState("")

  // State for delete confirmation dialog
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null)

  // Handle invite (mock - just clears input)
  const handleInvite = () => {
    if (inviteEmail.trim()) {
      // TODO: Implement actual invite logic
      setInviteEmail("")
    }
  }

  // Handle remove team member (mock - just removes from state)
  const handleConfirmRemove = () => {
    if (memberToDelete) {
      setTeamMembers(teamMembers.filter((member) => member.id !== memberToDelete.id))
      setMemberToDelete(null)
    }
  }

  // Skeleton components
  const TableRowSkeleton = () => (
    <TableRow className="border-[#E8EEF2]">
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36 sm:hidden" />
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <Skeleton className="h-4 w-40" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-20 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-8 rounded" />
      </TableCell>
    </TableRow>
  )

  const TeamTableSkeleton = () => (
    <Card className="bg-white border-none overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-[#E8EEF2]">
            <TableHead className="text-[#1F2D58]/70 font-medium">Naam</TableHead>
            <TableHead className="text-[#1F2D58]/70 font-medium hidden sm:table-cell">E-mailadres</TableHead>
            <TableHead className="text-[#1F2D58]/70 font-medium">Status</TableHead>
            <TableHead className="text-[#1F2D58]/70 font-medium w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 3 }).map((_, i) => (
            <TableRowSkeleton key={i} />
          ))}
        </TableBody>
      </Table>
    </Card>
  )

  const InviteCardSkeleton = () => (
    <Card className="bg-white border-none">
      <CardHeader className="pb-4">
        <div className="space-y-1">
          <CardTitle className="!text-xl font-medium text-[#1F2D58]">
            Teamlid uitnodigen
          </CardTitle>
          <Skeleton className="h-4 w-80" />
        </div>
      </CardHeader>
      <Separator className="mx-6 w-auto bg-[#E8EEF2]" />
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-3">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          <Skeleton className="h-8 w-full" />
        </div>
      </CardContent>
    </Card>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="contempora-large text-[#1F2D58]">Team</h1>
        <TeamTableSkeleton />
        <InviteCardSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <h1 className="contempora-large text-[#1F2D58]">Team</h1>

      {/* Team Members Table */}
      <Card className="bg-white border-none overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-[#E8EEF2]">
              <TableHead className="text-[#1F2D58]/70 font-medium">Naam</TableHead>
              <TableHead className="text-[#1F2D58]/70 font-medium hidden sm:table-cell">E-mailadres</TableHead>
              <TableHead className="text-[#1F2D58]/70 font-medium">Status</TableHead>
              <TableHead className="text-[#1F2D58]/70 font-medium w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamMembers.map((member) => (
              <TableRow key={member.id} className="border-[#E8EEF2]">
                {/* Name with avatar */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-[#193DAB]/12 text-[#1F2D58] font-medium text-sm">
                        {getInitials(member.first_name, member.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-[#1F2D58]">
                        {member.first_name} {member.last_name}
                      </p>
                      {/* Show email on mobile under name */}
                      <p className="text-sm text-[#1F2D58]/60 sm:hidden">
                        {member.email}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* Email - hidden on mobile */}
                <TableCell className="text-[#1F2D58] hidden sm:table-cell">
                  {member.email}
                </TableCell>

                {/* Status badge */}
                <TableCell>
                  <Badge variant={member.status === "active" ? "success" : "warning"}>
                    {member.status === "active" ? "Actief" : "Uitgenodigd"}
                  </Badge>
                </TableCell>

                {/* Delete button */}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#1F2D58]/70 hover:text-red-600 hover:bg-red-50"
                    onClick={() => setMemberToDelete(member)}
                    showArrow={false}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Verwijder teamlid</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Invite Team Member */}
      <Card className="bg-white border-none">
        <CardHeader className="pb-4">
          <div className="space-y-1">
            <CardTitle className="!text-xl font-medium text-[#1F2D58]">
              Teamlid uitnodigen
            </CardTitle>
            <p className="text-sm text-[#1F2D58]/60">
              Nodig een collega uit om toegang te krijgen tot dit werkgeversaccount.
            </p>
          </div>
        </CardHeader>
        <Separator className="mx-6 w-auto bg-[#E8EEF2]" />
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-mailadres</Label>
              <div className="flex gap-3">
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="collega@bedrijf.nl"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleInvite} disabled={!inviteEmail.trim()} showArrow={false}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Uitnodigen
                </Button>
              </div>
            </div>
            <p className="text-sm text-[#1F2D58]/60">
              De uitgenodigde ontvangt een e-mail met een link om zichzelf toe te voegen aan dit account.
              Na acceptatie krijgt het nieuwe teamlid volledige toegang tot het werkgeversdashboard.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1F2D58]">Teamlid verwijderen</DialogTitle>
            <DialogDescription className="text-[#1F2D58]/70">
              Weet je zeker dat je{" "}
              <span className="font-medium text-[#1F2D58]">
                {memberToDelete?.first_name} {memberToDelete?.last_name}
              </span>{" "}
              wilt verwijderen uit het team?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="secondary"
              onClick={() => setMemberToDelete(null)}
              showArrow={false}
            >
              Annuleren
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRemove}
              showArrow={false}
            >
              Verwijderen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
