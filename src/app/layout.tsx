import type { Metadata } from "next";
import Script from "next/script";
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
        <Script
          id="marker-config"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.markerConfig = {
                project: '6968b60c2e66047e4497fd1d', 
                source: 'snippet'
              };
            `,
          }}
        />
        <Script
          id="marker-io"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(e,r,a){if(!e.__Marker){e.__Marker={};var t=[],n={__cs:t};["show","hide","isVisible","capture","cancelCapture","unload","reload","isExtensionInstalled","setReporter","clearReporter","setCustomData","on","off"].forEach(function(e){n[e]=function(){var r=Array.prototype.slice.call(arguments);r.unshift(e),t.push(r)}}),e.Marker=n;var s=r.createElement("script");s.async=1,s.src="https://edge.marker.io/latest/shim.js";var i=r.getElementsByTagName("script")[0];i.parentNode.insertBefore(s,i)}}(window,document);
            `,
          }}
        />
        <SessionProvider>
          <div className="min-h-screen">
            <main className="mx-auto max-w-5xl px-6 py-8">
              <div className="flex justify-center mb-8">
                <a 
                  href="https://colourfuljobs.nl" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="transition-opacity hover:opacity-80"
                >
                  <img 
                    src="/logo.svg" 
                    alt="Colourful jobs" 
                    width={200} 
                    height={40}
                    style={{ width: '200px', height: '40px' }}
                  />
                </a>
              </div>
              {children}
            </main>
          </div>
          <Toaster position="bottom-center" richColors />
        </SessionProvider>
      </body>
    </html>
  );
}
