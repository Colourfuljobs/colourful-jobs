"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Pencil, Plus, Trash2, Users } from "lucide-react";

interface Recommendation {
  firstName: string;
  lastName: string;
}

interface ColleaguesSidebarProps {
  recommendations: Recommendation[];
  onChange: (recommendations: Recommendation[]) => void;
  packageName?: string;
  variant?: "sidebar" | "modal"; // NEW: modal variant hides wrapper styling and header
}

export function ColleaguesSidebar({
  recommendations,
  onChange,
  packageName,
  variant = "sidebar",
}: ColleaguesSidebarProps) {
  // Track which indices are currently being edited
  const [editingIndices, setEditingIndices] = useState<Set<number>>(new Set());

  const addRecommendation = () => {
    const newIndex = recommendations.length;
    onChange([...recommendations, { firstName: "", lastName: "" }]);
    setEditingIndices((prev) => new Set(prev).add(newIndex));
  };

  const updateRecommendation = (index: number, field: keyof Recommendation, value: string) => {
    const updated = [...recommendations];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const saveRecommendation = (index: number) => {
    const rec = recommendations[index];
    // Only save if at least one field is filled
    if (!rec.firstName?.trim() && !rec.lastName?.trim()) {
      // Remove empty entry instead
      removeRecommendation(index);
      return;
    }
    setEditingIndices((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const startEditing = (index: number) => {
    setEditingIndices((prev) => new Set(prev).add(index));
  };

  const removeRecommendation = (index: number) => {
    onChange(recommendations.filter((_, i) => i !== index));
    // Update editing indices: remove the deleted index and shift higher indices down
    setEditingIndices((prev) => {
      const next = new Set<number>();
      for (const i of prev) {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
        // skip i === index (deleted)
      }
      return next;
    });
  };

  const isEditing = (index: number) => editingIndices.has(index);

  const isFilled = (rec: Recommendation) =>
    rec.firstName?.trim() || rec.lastName?.trim();

  // Modal variant: just show the form without wrapper styling
  if (variant === "modal") {
    return (
      <div className="space-y-3">
        {recommendations.map((rec, index) =>
          isEditing(index) ? (
            /* Editing mode */
            <div key={index} className="bg-[#E8EEF2]/50 rounded-lg p-3">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    value={rec.firstName}
                    onChange={(e) => updateRecommendation(index, "firstName", e.target.value)}
                    placeholder="Voornaam"
                    autoFocus
                  />
                  <Input
                    value={rec.lastName}
                    onChange={(e) => updateRecommendation(index, "lastName", e.target.value)}
                    placeholder="Achternaam"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRecommendation(index);
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1 shrink-0 justify-end">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="tertiary"
                        size="icon"
                        onClick={() => removeRecommendation(index)}
                        className="w-[30px] h-[30px]"
                        showArrow={false}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Verwijderen</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={() => saveRecommendation(index)}
                        className="w-[30px] h-[30px]"
                        showArrow={false}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Opslaan</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          ) : (
            /* Saved mode */
            isFilled(rec) && (
              <div key={index} className="bg-[#E8EEF2]/50 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-[#1F2D58] truncate min-w-0">
                    {[rec.firstName?.trim(), rec.lastName?.trim()].filter(Boolean).join(" ")}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="tertiary"
                          size="icon"
                          onClick={() => startEditing(index)}
                          className="w-[30px] h-[30px]"
                          showArrow={false}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Bewerken</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="tertiary"
                          size="icon"
                          onClick={() => removeRecommendation(index)}
                          className="w-[30px] h-[30px]"
                          showArrow={false}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Verwijderen</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            )
          )
        )}
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
    );
  }

  // Sidebar variant: full styling with wrapper and header
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
        {recommendations.map((rec, index) =>
          isEditing(index) ? (
            /* Editing mode */
            <div key={index} className="bg-[#E8EEF2]/50 rounded-lg p-3">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    value={rec.firstName}
                    onChange={(e) => updateRecommendation(index, "firstName", e.target.value)}
                    placeholder="Voornaam"
                    autoFocus
                  />
                  <Input
                    value={rec.lastName}
                    onChange={(e) => updateRecommendation(index, "lastName", e.target.value)}
                    placeholder="Achternaam"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRecommendation(index);
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1 shrink-0 justify-end">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="tertiary"
                        size="icon"
                        onClick={() => removeRecommendation(index)}
                        className="w-[30px] h-[30px]"
                        showArrow={false}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Verwijderen</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={() => saveRecommendation(index)}
                        className="w-[30px] h-[30px]"
                        showArrow={false}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Opslaan</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          ) : (
            /* Saved mode */
            isFilled(rec) && (
              <div key={index} className="bg-[#E8EEF2]/50 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-[#1F2D58] truncate min-w-0">
                    {[rec.firstName?.trim(), rec.lastName?.trim()].filter(Boolean).join(" ")}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="tertiary"
                          size="icon"
                          onClick={() => startEditing(index)}
                          className="w-[30px] h-[30px]"
                          showArrow={false}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Bewerken</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="tertiary"
                          size="icon"
                          onClick={() => removeRecommendation(index)}
                          className="w-[30px] h-[30px]"
                          showArrow={false}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Verwijderen</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            )
          )
        )}
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
