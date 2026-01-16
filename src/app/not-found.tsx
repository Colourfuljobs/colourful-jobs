import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center px-4 -mt-8" style={{ minHeight: 'calc(100vh - 160px)' }}>
      <div className="mx-auto max-w-md w-full">
        <Card className="pt-6 sm:pt-8 px-6 sm:px-8 pb-6 sm:pb-8 bg-white rounded-t-[0.75rem] rounded-b-[2rem] border-none">
          <CardHeader className="p-0 mb-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="w-16 h-16 rounded-full bg-[#193DAB]/[0.12] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24">
                  <path fill="#1F2D58" fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2ZM3 12a9 9 0 1 1 18 0 9 9 0 0 1-18 0Zm6.47-3.53a.75.75 0 0 1 1.06 0L12 9.94l1.47-1.47a.75.75 0 1 1 1.06 1.06L13.06 11l1.47 1.47a.75.75 0 1 1-1.06 1.06L12 12.06l-1.47 1.47a.75.75 0 0 1-1.06-1.06L10.94 11 9.47 9.53a.75.75 0 0 1 0-1.06ZM12 15.5a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-1.5 0v-.01a.75.75 0 0 1 .75-.75Z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
            <CardTitle className="h4 mb-3">Pagina niet gevonden</CardTitle>
            <CardDescription className="p-regular text-[#1F2D58]/70">
              De pagina die je zoekt bestaat niet of is verplaatst.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Link href="/">
              <Button className="w-full">
                Terug naar home
              </Button>
            </Link>
          </CardContent>
        </Card>
        <div className="mt-4 text-center">
          <p className="p-small text-[#1F2D58]">
            Nog geen account?{" "}
            <Link 
              href="/onboarding" 
              className="underline hover:text-[#193DAB]"
            >
              Maak een account aan
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
