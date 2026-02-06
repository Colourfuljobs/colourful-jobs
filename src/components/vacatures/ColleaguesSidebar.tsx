"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Trash2, Users } from "lucide-react";

interface Recommendation {
  firstName: string;
  lastName: string;
}

interface ColleaguesSidebarProps {
  recommendations: Recommendation[];
  onChange: (recommendations: Recommendation[]) => void;
  packageName?: string;
}

export function ColleaguesSidebar({
  recommendations,
  onChange,
  packageName,
}: ColleaguesSidebarProps) {
  const addRecommendation = () => {
    onChange([...recommendations, { firstName: "", lastName: "" }]);
  };

  const updateRecommendation = (index: number, field: keyof Recommendation, value: string) => {
    const updated = [...recommendations];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeRecommendation = (index: number) => {
    onChange(recommendations.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white rounded-[0.75rem] p-5 pb-6 border border-[#39ade5]/50">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="w-10 h-10 rounded-full bg-[#193DAB]/[0.12] flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 text-[#1F2D58]" />
        </div>
        {packageName && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">
                <Badge variant="package">Extra boost</Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>Extra bij vacaturepakket {packageName}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <h4 className="text-lg font-bold text-[#1F2D58] mb-1">Vergroot het bereik van je social post</h4>
      <p className="text-sm text-[#1F2D58]/70 mb-4">
        We delen je vacature op onze LinkedIn en Instagram. Tag collega&apos;s om het bereik te vergroten.
      </p>

      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <div key={index} className="bg-[#E8EEF2]/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <Input
                  value={rec.firstName}
                  onChange={(e) => updateRecommendation(index, "firstName", e.target.value)}
                  placeholder="Voornaam"
                />
                <Input
                  value={rec.lastName}
                  onChange={(e) => updateRecommendation(index, "lastName", e.target.value)}
                  placeholder="Achternaam"
                />
              </div>
              <Button
                type="button"
                variant="tertiary"
                size="icon"
                onClick={() => removeRecommendation(index)}
                className="w-[30px] h-[30px] shrink-0 mt-[5px]"
                showArrow={false}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="tertiary"
          size="sm"
          onClick={addRecommendation}
          showArrow={false}
        >
          <Plus className="h-4 w-4 mr-1" />
          Collega toevoegen
        </Button>
      </div>
    </div>
  );
}
