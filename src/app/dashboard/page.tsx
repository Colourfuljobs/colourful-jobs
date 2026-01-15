"use client";

import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Set page title
  useEffect(() => {
    document.title = "Dashboard | Colourful jobs";
  }, []);

  // Redirect pending_onboarding users to onboarding
  // This is needed because middleware can't check status with database sessions
  useEffect(() => {
    if (status === "authenticated" && session?.user?.status === "pending_onboarding") {
      router.replace("/onboarding");
    }
  }, [status, session, router]);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  async function handleSignOut() {
    await signOut({ redirect: false });
    toast.success("Je bent succesvol uitgelogd");
    router.push("/login");
  }

  // Show loading state while checking session
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#F86600] border-t-transparent"></div>
      </div>
    );
  }

  // Don't render dashboard content for unauthenticated or pending users
  if (status === "unauthenticated" || session?.user?.status === "pending_onboarding") {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#F86600] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="h2">Dashboard</h1>
      <Link 
        href="#" 
        onClick={(e) => {
          e.preventDefault();
          handleSignOut();
        }}
        className="p-regular text-[#1F2D58] underline hover:text-[#193DAB]"
      >
        Uitloggen
      </Link>
    </div>
  );
}


