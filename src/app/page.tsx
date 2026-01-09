import { Button, ArrowIcon } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="h2">
        Werkgeversportaal onboarding
      </h1>
      <p className="p-regular max-w-2xl">
        Start hier als nieuwe werkgever. We begeleiden je in een paar stappen
        door de registratie en sturen je een magic link naar je e-mailadres om
        veilig in te loggen.
      </p>
      <div className="flex gap-4">
        <Button asChild showArrow={true}>
          <Link href="/onboarding" className="inline-flex items-center gap-2">
            <ArrowIcon />
            Start onboarding
          </Link>
        </Button>
        <Button variant="secondary" asChild showArrow={true}>
          <Link href="/login" className="inline-flex items-center gap-2">
            <ArrowIcon />
            Ik heb al een account
          </Link>
        </Button>
      </div>
    </div>
  );
}
