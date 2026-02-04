"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { UserPlus, Pencil, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DesktopHeader } from "@/components/dashboard"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

// Types for team members
interface TeamMember {
  id: string
  first_name: string
  last_name: string
  email: string
  status: "active" | "invited"
  role?: string
}

// Helper function to get initials from name or email
function getInitials(firstName: string, lastName: string, email: string): string {
  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }
  if (firstName) {
    return firstName.charAt(0).toUpperCase()
  }
  // For invited users without name, use first letter of email
  return email.charAt(0).toUpperCase()
}

export default function TeamPage() {
  // Get current user session
  const { data: session } = useSession()
  const currentUserEmail = session?.user?.email?.toLowerCase()

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isInviting, setIsInviting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null)

  // Set page title
  useEffect(() => {
    document.title = "Team | Colourful jobs"
  }, [])

  // State for team members
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  // State for invite form
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteError, setInviteError] = useState<string | null>(null)

  // Fetch team members
  const fetchTeamMembers = useCallback(async () => {
    try {
      const response = await fetch("/api/team")
      const data = await response.json()

      if (response.ok && data.team) {
        setTeamMembers(data.team)
      } else {
        console.error("Failed to fetch team members:", data.error)
      }
    } catch (error) {
      console.error("Error fetching team members:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load team members on mount
  useEffect(() => {
    fetchTeamMembers()
  }, [fetchTeamMembers])

  // Handle invite
  const handleInvite = async () => {
    if (!inviteEmail.trim()) return

    setIsInviting(true)
    setInviteError(null)

    try {
      const response = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase() }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success("Uitnodiging verstuurd", {
          description: `Een uitnodiging is verstuurd naar ${inviteEmail}.`,
        })
        setInviteEmail("")
        // Refresh team list to show the new invited member
        fetchTeamMembers()
      } else {
        setInviteError(data.error || "Er ging iets mis bij het versturen van de uitnodiging.")
      }
    } catch (error) {
      console.error("Error sending invitation:", error)
      setInviteError("Er ging iets mis bij het versturen van de uitnodiging.")
    } finally {
      setIsInviting(false)
    }
  }

  // Handle Enter key in invite input
  const handleInviteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inviteEmail.trim() && !isInviting) {
      handleInvite()
    }
  }

  // Open delete confirmation dialog
  const openDeleteDialog = (member: TeamMember) => {
    setMemberToDelete(member)
    setDeleteDialogOpen(true)
  }

  // Handle delete team member
  const handleDelete = async () => {
    if (!memberToDelete) return

    setIsDeleting(true)

    try {
      const response = await fetch("/api/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: memberToDelete.id }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const isSelf = currentUserEmail === memberToDelete.email.toLowerCase()
        const isInvited = memberToDelete.status === "invited"

        if (isSelf) {
          // User deleted themselves - redirect to login
          toast.success("Account losgekoppeld", {
            description: "Je hebt geen toegang meer tot dit werkgeversaccount.",
          })
          window.location.href = "/login"
        } else if (isInvited) {
          toast.success("Uitnodiging ingetrokken", {
            description: `De uitnodiging voor ${memberToDelete.email} is ingetrokken.`,
          })
        } else {
          toast.success("Teamlid verwijderd", {
            description: `${memberToDelete.first_name} ${memberToDelete.last_name} is verwijderd uit het team.`,
          })
        }

        // Refresh team list
        fetchTeamMembers()
      } else {
        toast.error("Fout bij verwijderen", {
          description: data.error || "Er ging iets mis bij het verwijderen.",
        })
      }
    } catch (error) {
      console.error("Error deleting team member:", error)
      toast.error("Fout bij verwijderen", {
        description: "Er ging iets mis bij het verwijderen.",
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setMemberToDelete(null)
    }
  }

  // Calculate if delete is allowed (more than 1 active member)
  const activeMembers = teamMembers.filter((m) => m.status === "active")
  const canDeleteActiveMembers = activeMembers.length > 1

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
      <TableCell className="text-right">
        <Skeleton className="h-8 w-20 ml-auto" />
      </TableCell>
    </TableRow>
  )

  const TeamTableSkeleton = () => (
    <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
      <div className="bg-white/50 px-4 pt-4 pb-4">
        <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58]">
          Alle teamleden
        </h2>
      </div>
      <Table className="bg-white">
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-[#E8EEF2]">
            <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Naam</TableHead>
            <TableHead className="text-slate-400 font-semibold uppercase text-[12px] hidden sm:table-cell">E-mailadres</TableHead>
            <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Status</TableHead>
            <TableHead className="text-slate-400 font-semibold uppercase text-[12px] text-right">Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 3 }).map((_, i) => (
            <TableRowSkeleton key={i} />
          ))}
        </TableBody>
      </Table>
    </div>
  )

  const InviteCardSkeleton = () => (
    <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
      <div className="bg-white/50 px-6 py-4">
        <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">
          Teamlid uitnodigen
        </h2>
        <Skeleton className="h-4 w-80 max-w-[600px]" />
      </div>
      <div className="bg-white p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <DesktopHeader title="Team" />
        <TeamTableSkeleton />
        <InviteCardSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header with title, credits and actions */}
      <DesktopHeader title="Team" />

      {/* Team Members Table */}
      <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
        <div className="bg-white/50 px-6 py-4">
          <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">
            Alle teamleden
          </h2>
        </div>
        <Table className="bg-white">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-[#E8EEF2]">
              <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Naam</TableHead>
              <TableHead className="text-slate-400 font-semibold uppercase text-[12px] hidden sm:table-cell">E-mailadres</TableHead>
              <TableHead className="text-slate-400 font-semibold uppercase text-[12px]">Status</TableHead>
              <TableHead className="text-slate-400 font-semibold uppercase text-[12px] text-right">Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-[#1F2D58]/60">
                  Nog geen teamleden. Nodig je eerste collega uit!
                </TableCell>
              </TableRow>
            ) : (
              teamMembers.map((member) => {
                const isCurrentUser = currentUserEmail === member.email.toLowerCase()
                return (
                <TableRow key={member.id} className="border-b border-[#E8EEF2] hover:bg-[#193DAB]/[0.04]">
                  {/* Name with avatar */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={`${isCurrentUser ? "bg-[#F86600]/20 text-[#F86600]" : "bg-[#193DAB]/12 text-[#1F2D58]"} font-medium text-sm`}>
                          {getInitials(member.first_name, member.last_name, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-[#1F2D58]">
                          {member.first_name && member.last_name
                            ? `${member.first_name} ${member.last_name}`
                            : member.email}
                          {isCurrentUser && (
                            <span className="ml-2 text-sm font-normal text-[#1F2D58]/60">(jij)</span>
                          )}
                        </p>
                        {/* Show email on mobile under name (only if name exists) */}
                        {member.first_name && member.last_name && (
                          <p className="text-sm text-[#1F2D58]/60 sm:hidden">
                            {member.email}
                          </p>
                        )}
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

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isCurrentUser && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href="/dashboard/gegevens">
                              <Button variant="tertiary" size="icon" className="w-[30px] h-[30px]" showArrow={false}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>Wijzigen</TooltipContent>
                        </Tooltip>
                      )}
                      {/* Show delete button if: invited user OR (active user AND more than 1 active member) */}
                      {(member.status === "invited" || canDeleteActiveMembers) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="tertiary"
                              size="icon"
                              className="w-[30px] h-[30px]"
                              showArrow={false}
                              onClick={() => openDeleteDialog(member)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {member.status === "invited" ? "Uitnodiging intrekken" : "Verwijderen"}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )})
            )}
          </TableBody>
        </Table>
      </div>

      {/* Invite Team Member */}
      <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
        <div className="bg-white/50 px-6 py-4">
          <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">
            Teamlid uitnodigen
          </h2>
          <p className="text-sm text-[#1F2D58]/60 max-w-[600px]">
            Nodig een collega uit om toegang te krijgen tot dit werkgeversaccount.
          </p>
        </div>
        <div className="bg-white p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-mailadres</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="collega@bedrijf.nl"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value)
                    if (inviteError) setInviteError(null)
                  }}
                  onKeyDown={handleInviteKeyDown}
                  className={`sm:max-w-sm ${inviteError ? "border-red-500" : ""}`}
                />
                <Button 
                  onClick={handleInvite} 
                  disabled={!inviteEmail.trim() || isInviting} 
                  showArrow={false}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  {isInviting ? "Bezig..." : "Uitnodigen"}
                </Button>
              </div>
              {inviteError && (
                <p className="text-sm text-red-600">{inviteError}</p>
              )}
            </div>
            <p className="text-sm text-[#1F2D58]/60">
              De uitgenodigde ontvangt een e-mail met een link om zichzelf toe te voegen aan dit account.
              Na acceptatie krijgt het nieuwe teamlid volledige toegang tot het werkgeversdashboard.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          {/* Close button */}
          <Button
            variant="tertiary"
            size="icon"
            className="absolute right-4 top-4 w-[30px] h-[30px]"
            onClick={() => setDeleteDialogOpen(false)}
            showArrow={false}
          >
            <X className="h-4 w-4" />
          </Button>
          <DialogHeader>
            <DialogTitle>
              {memberToDelete?.status === "invited"
                ? "Uitnodiging intrekken"
                : currentUserEmail === memberToDelete?.email.toLowerCase()
                  ? "Jezelf verwijderen"
                  : "Teamlid verwijderen"}
            </DialogTitle>
            <DialogDescription className="mb-4">
              {memberToDelete?.status === "invited" ? (
                <>
                  Weet je zeker dat je de uitnodiging voor{" "}
                  <strong>{memberToDelete.email}</strong> wilt intrekken?
                </>
              ) : currentUserEmail === memberToDelete?.email.toLowerCase() ? (
                <>
                  Weet je zeker dat je jezelf wilt verwijderen?{" "}
                  <strong>Let op: je verliest hiermee toegang tot dit werkgeversaccount.</strong>
                </>
              ) : (
                <>
                  Weet je zeker dat je{" "}
                  <strong>
                    {memberToDelete?.first_name} {memberToDelete?.last_name}
                  </strong>{" "}
                  wilt verwijderen? Deze persoon verliest hiermee toegang tot dit werkgeversaccount.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
              showArrow={false}
            >
              Annuleren
            </Button>
            <Button
              variant="default"
              onClick={handleDelete}
              disabled={isDeleting}
              showArrow={false}
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting
                ? "Bezig..."
                : memberToDelete?.status === "invited"
                  ? "Intrekken"
                  : "Verwijderen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
