"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, MapPin, Clock, Briefcase, GraduationCap, Building2, Calendar } from "lucide-react";
import type { VacancyPreviewProps } from "./types";

export function VacancyPreview({
  vacancy,
  selectedPackage,
  selectedUpsells,
  lookups,
}: VacancyPreviewProps) {
  // Helper to get lookup name by ID
  const getLookupName = (
    id: string | null | undefined,
    items: { id: string; name: string }[]
  ): string => {
    if (!id) return "";
    return items.find((item) => item.id === id)?.name || "";
  };

  // Format date
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Parse recommendations
  const recommendations = vacancy.recommendations
    ? JSON.parse(vacancy.recommendations)
    : [];

  return (
    <div className="space-y-6">
      {/* Info alert */}
      <Alert className="bg-[#193DAB]/[0.12] border-none">
        <AlertDescription className="text-[#1F2D58]">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-[#1F2D58]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm">
                Na plaatsing wordt uw vacature beoordeeld door ons team. U ontvangt een
                notificatie zodra uw vacature is goedgekeurd of als er aanpassingen nodig zijn.
              </p>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Preview card */}
      <div className="bg-white rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
        {/* Header section */}
        <div className="p-6 border-b border-[#E8EEF2]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#1F2D58]">Vacature preview</h2>
            <span className="text-sm text-[#1F2D58]/60">Gekozen pakket</span>
          </div>
          
          {/* Title and basic info */}
          <h3 className="text-2xl font-bold text-[#1F2D58] mb-2">
            {vacancy.title || "Vacaturetitel"}
          </h3>
          
          <div className="flex flex-wrap items-center gap-2 text-sm text-[#1F2D58]/70 mb-4">
            {vacancy.contact_company && <span>{vacancy.contact_company}</span>}
            {vacancy.contact_company && vacancy.location && <span>•</span>}
            {vacancy.location && <span>{vacancy.location}</span>}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {selectedPackage && (
              <Badge variant="info">{selectedPackage.display_name}</Badge>
            )}
            {selectedUpsells.map((upsell) => (
              <Badge key={upsell.id} variant="muted">
                {upsell.display_name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Intro text */}
        {vacancy.intro_txt && (
          <div className="p-6 border-b border-[#E8EEF2]">
            <p className="text-[#1F2D58] font-medium">{vacancy.intro_txt}</p>
          </div>
        )}

        {/* Description */}
        {vacancy.description && (
          <div className="p-6 border-b border-[#E8EEF2]">
            <h4 className="text-lg font-bold text-[#1F2D58] mb-3">Functieomschrijving</h4>
            <div
              className="prose prose-sm max-w-none text-[#1F2D58]"
              dangerouslySetInnerHTML={{ __html: vacancy.description }}
            />
          </div>
        )}

        {/* Job details grid */}
        <div className="p-6 border-b border-[#E8EEF2]">
          <h4 className="text-lg font-bold text-[#1F2D58] mb-4">Functie-informatie</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {vacancy.location && (
              <DetailItem icon={MapPin} label="Locatie" value={vacancy.location} />
            )}
            {vacancy.region_id && (
              <DetailItem
                icon={MapPin}
                label="Regio"
                value={getLookupName(vacancy.region_id, lookups.regions)}
              />
            )}
            {vacancy.employment_type && (
              <DetailItem icon={Clock} label="Dienstverband" value={vacancy.employment_type} />
            )}
            {vacancy.hrs_per_week && (
              <DetailItem
                icon={Clock}
                label="Uren per week"
                value={`${vacancy.hrs_per_week} uur`}
              />
            )}
            {vacancy.function_type_id && (
              <DetailItem
                icon={Briefcase}
                label="Functietype"
                value={getLookupName(vacancy.function_type_id, lookups.functionTypes)}
              />
            )}
            {vacancy.education_level_id && (
              <DetailItem
                icon={GraduationCap}
                label="Opleidingsniveau"
                value={getLookupName(vacancy.education_level_id, lookups.educationLevels)}
              />
            )}
            {vacancy.field_id && (
              <DetailItem
                icon={Briefcase}
                label="Vakgebied"
                value={getLookupName(vacancy.field_id, lookups.fields)}
              />
            )}
            {vacancy.sector_id && (
              <DetailItem
                icon={Building2}
                label="Sector"
                value={getLookupName(vacancy.sector_id, lookups.sectors)}
              />
            )}
            {vacancy.salary && (
              <DetailItem icon={Briefcase} label="Salaris" value={vacancy.salary} />
            )}
            {vacancy.closing_date && (
              <DetailItem
                icon={Calendar}
                label="Sluitingsdatum"
                value={formatDate(vacancy.closing_date)}
              />
            )}
          </div>
        </div>

        {/* Contact person */}
        {(vacancy.contact_name || vacancy.contact_email || vacancy.contact_phone) && (
          <div className="p-6 border-b border-[#E8EEF2]">
            <h4 className="text-lg font-bold text-[#1F2D58] mb-4">Contactpersoon</h4>
            <div className="flex items-start gap-4">
              {vacancy.contact_photo_id && (
                <div className="w-16 h-16 rounded-full bg-[#E8EEF2] flex items-center justify-center">
                  <span className="text-[#1F2D58]/50 text-xl">
                    {vacancy.contact_name?.charAt(0) || "?"}
                  </span>
                </div>
              )}
              <div>
                {vacancy.contact_name && (
                  <p className="font-bold text-[#1F2D58]">{vacancy.contact_name}</p>
                )}
                {vacancy.contact_role && (
                  <p className="text-sm text-[#1F2D58]/70">{vacancy.contact_role}</p>
                )}
                {vacancy.contact_company && (
                  <p className="text-sm text-[#1F2D58]/70">{vacancy.contact_company}</p>
                )}
                {vacancy.contact_email && (
                  <p className="text-sm text-[#1F2D58] mt-2">{vacancy.contact_email}</p>
                )}
                {vacancy.contact_phone && (
                  <p className="text-sm text-[#1F2D58]">{vacancy.contact_phone}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="p-6 border-b border-[#E8EEF2]">
            <h4 className="text-lg font-bold text-[#1F2D58] mb-4">Warm aanbevolen door</h4>
            <div className="flex flex-wrap gap-3">
              {recommendations.map(
                (rec: { firstName: string; lastName: string }, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-[#193DAB]/[0.12] rounded-full text-sm text-[#1F2D58]"
                  >
                    {rec.firstName} {rec.lastName}
                  </span>
                )
              )}
            </div>
          </div>
        )}

        {/* Application method */}
        <div className="p-6">
          <h4 className="text-lg font-bold text-[#1F2D58] mb-3">Solliciteren</h4>
          {vacancy.show_apply_form ? (
            <p className="text-sm text-[#1F2D58]/70">
              Kandidaten solliciteren via het Colourful jobs formulier.
              <br />
              Sollicitaties worden verstuurd naar:{" "}
              <span className="font-medium text-[#1F2D58]">
                {vacancy.application_email || "(niet ingesteld)"}
              </span>
            </p>
          ) : (
            <p className="text-sm text-[#1F2D58]/70">
              Kandidaten worden doorverwezen naar:{" "}
              <span className="font-medium text-[#1F2D58]">
                {vacancy.apply_url || "(niet ingesteld)"}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper component for detail items
function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-5 h-5 text-[#1F2D58]/50 mt-0.5" />
      <div>
        <p className="text-xs text-[#1F2D58]/60">{label}</p>
        <p className="text-sm text-[#1F2D58] font-medium">{value}</p>
      </div>
    </div>
  );
}
