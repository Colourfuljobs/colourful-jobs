import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { Toaster } from "@/components/ui/sonner";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Werkgeversportaal",
  description: "Onboarding & portaal voor werkgevers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/ywx2cuu.css" />
      </head>
      <body className="antialiased bg-[#E8EEF2]">
        <SessionProvider>
          <div className="min-h-screen">
            <header className="bg-white/80 backdrop-blur">
              <div className="mx-auto flex max-w-5xl items-center justify-center px-6 py-4">
                <Image 
                  src="/logo.svg" 
                  alt="Colourful Jobs" 
                  width={200} 
                  height={40}
                  priority
                />
              </div>
            </header>
            <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
          </div>
          <Toaster position="bottom-center" richColors />
        </SessionProvider>
      </body>
    </html>
  );
}
