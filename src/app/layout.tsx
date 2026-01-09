import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { Toaster } from "@/components/ui/sonner";

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
            <header className="border-b bg-white/80 backdrop-blur">
              <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                <div className="p-regular font-semibold">
                  Colourful Jobs – Werkgeversportaal
                </div>
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
