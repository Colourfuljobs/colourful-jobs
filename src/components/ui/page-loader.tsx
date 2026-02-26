"use client";

import Link from "next/link";
import Image from "next/image";
import { Spinner } from "@/components/ui/spinner";

interface PageLoaderProps {
  /** Optionele titel tekst onder de spinner */
  title?: string;
  /** Optionele beschrijving onder de titel */
  description?: string;
}

export function PageLoader({ title, description }: PageLoaderProps) {
  return (
    <div className="min-h-screen relative">
      {/* Logo linksboven */}
      <div className="absolute top-6 left-6">
        <Link href="https://www.colourfuljobs.nl/">
          <Image src="/logo.svg" alt="Colourful jobs" width={180} height={29} priority />
        </Link>
      </div>
      
      {/* Spinner gecentreerd */}
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="flex flex-col items-center">
          <Spinner className="size-12 text-[#1F2D58]" />
          {(title || description) && (
            <div className="mt-4 text-center">
              {title && <p className="p-large text-[#1F2D58]">{title}</p>}
              {description && <p className="p-regular text-slate-500 mt-2">{description}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
