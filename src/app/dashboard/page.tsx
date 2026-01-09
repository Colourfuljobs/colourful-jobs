"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();

  async function handleSignOut() {
    await signOut({ redirect: false });
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


