"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export default function DashboardPage() {
  const router = useRouter();

  // Set page title
  useEffect(() => {
    document.title = "Dashboard | Colourful jobs";
  }, []);

  async function handleSignOut() {
    await signOut({ redirect: false });
    toast.success("Je bent succesvol uitgelogd");
    router.push("/login");
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


