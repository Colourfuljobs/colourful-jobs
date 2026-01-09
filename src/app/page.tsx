import { Button, ArrowIcon } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1>
          Werkgeversportaal
        </h1>
        <p className="p-large text-[#1F2D58]">
          Beheer je vacatures en account op één centrale plek.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="h5">
          Kies hoe je wilt starten
        </h2>
        <ul className="space-y-3 list-none">
          <li className="p-regular flex gap-2">
            <span className="text-[#1F2D58] font-bold">•</span>
            <span>
              <strong>Nieuw bij Colourful Jobs?</strong> Maak een account aan en start in een paar stappen. Inloggen gaat veilig via een magic link per e-mail.
            </span>
          </li>
          <li className="p-regular flex gap-2">
            <span className="text-[#1F2D58] font-bold">•</span>
            <span>
              <strong>Heb je al een account?</strong> Log direct in via e-mail.
            </span>
          </li>
        </ul>
      </div>

      <div className="flex gap-4">
        <Button asChild showArrow={true}>
          <Link href="/onboarding" className="inline-flex items-center gap-2">
            <ArrowIcon />
            Account aanmaken
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
