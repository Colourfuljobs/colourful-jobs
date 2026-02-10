"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { nl } from "react-day-picker/locale";
import type { ProductRecord } from "@/lib/airtable";

export interface ExtensionCardProps {
  extensionUpsell: ProductRecord;
  isChecked: boolean;
  onToggle: (checked: boolean) => void;
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
  datePickerOpen: boolean;
  onDatePickerOpenChange: (open: boolean) => void;
  dateRange: { minDate: Date; maxDate: Date; standardEndDate?: Date };
  currentClosingDate?: string;
  required?: boolean;
  /** Prefix for the checkbox id to avoid conflicts between BoostModal and SubmitStep */
  idPrefix?: string;
}

export function ExtensionCard({
  extensionUpsell,
  isChecked,
  onToggle,
  selectedDate,
  onSelectDate,
  datePickerOpen,
  onDatePickerOpenChange,
  dateRange,
  currentClosingDate,
  required = false,
  idPrefix = "ext",
}: ExtensionCardProps) {
  const checkboxId = `${idPrefix}-upsell-${extensionUpsell.id}`;

  // Format a date in Dutch locale
  const formatDate = (date: Date) =>
    date.toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <label
      htmlFor={checkboxId}
      className={cn(
        "block p-4 border rounded-lg cursor-pointer transition-colors",
        isChecked
          ? "border-[#41712F]/30 bg-[#DEEEE3]"
          : "border-[#1F2D58]/10 hover:border-[#1F2D58]/30"
      )}
    >
      {/* Checkbox row - same layout as regular upsells */}
      <div className="flex items-center gap-3">
        <Checkbox
          id={checkboxId}
          checked={isChecked}
          onCheckedChange={(checked) => onToggle(!!checked)}
        />
        <span className="font-medium text-[#1F2D58] flex-1">
          {extensionUpsell.display_name}
          {required && (
            <span className="ml-2 text-xs font-medium text-[#BC0000] bg-[#F4DCDC] px-1.5 py-0.5 rounded">
              Verplicht
            </span>
          )}
        </span>
        <span className="text-sm text-[#1F2D58] font-medium shrink-0">
          +{extensionUpsell.credits} credits
        </span>
      </div>

      {/* Description from database */}
      {extensionUpsell.description && (
        <p className="text-sm text-[#1F2D58]/60 mt-1 ml-7">
          {extensionUpsell.description}
        </p>
      )}

      {/* Datepicker + details - only visible when checked */}
      {isChecked && (
        <div
          className="mt-3 ml-7 space-y-2"
          onClick={(e) => e.preventDefault()}
        >
          {/* Datepicker */}
          <Popover open={datePickerOpen} onOpenChange={onDatePickerOpenChange}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-10 w-[265px] items-center justify-between rounded-lg border border-[rgba(31,45,88,0.2)] bg-white px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <span
                  className={
                    selectedDate ? "text-[#1F2D58]" : "text-[#1F2D58]/40"
                  }
                >
                  {selectedDate
                    ? formatDate(selectedDate)
                    : "Selecteer nieuwe sluitingsdatum"}
                </span>
                <CalendarDays className="h-4 w-4 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[265px] p-0 bg-white" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                defaultMonth={dateRange.minDate}
                onSelect={(date) => {
                  onSelectDate(date ?? undefined);
                  onDatePickerOpenChange(false);
                }}
                disabled={{
                  before: dateRange.minDate,
                  after: dateRange.maxDate,
                }}
                locale={nl}
                className="w-full"
              />
            </PopoverContent>
          </Popover>

          {/* Standard end date explanation - moved below datepicker */}
          {dateRange.standardEndDate && (
            <p className="text-xs text-[#1F2D58]/50">
              Je vacature staat standaard online tot{" "}
              <span className="font-medium text-[#1F2D58]">
                {formatDate(dateRange.standardEndDate)}
              </span>
              . Kies een nieuwe einddatum (maximaal 1 jaar na publicatie).
              {currentClosingDate && (
                <>
                  {" "}Huidige sluitingsdatum:{" "}
                  {formatDate(new Date(currentClosingDate))}
                </>
              )}
            </p>
          )}

          {/* Selected date confirmation */}
          {selectedDate && (
            <div className="flex items-center gap-3">
              <p className="text-sm text-[#41712F] font-medium">
                Nieuwe sluitingsdatum: {formatDate(selectedDate)}
              </p>
              <button
                type="button"
                onClick={() => onSelectDate(undefined)}
                className="text-xs text-[#1F2D58]/50 hover:text-[#1F2D58] underline"
              >
                Wissen
              </button>
            </div>
          )}
        </div>
      )}
    </label>
  );
}
