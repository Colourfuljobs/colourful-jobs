"use client";

import { WIZARD_STEPS_NEW, type StepIndicatorProps, type WizardStep } from "./types";

export function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
  steps,
  maxReachedStep,
}: StepIndicatorProps) {
  // Gebruik meegegeven stappen of fallback naar default
  const wizardSteps = steps || WIZARD_STEPS_NEW;
  
  // Grid cols dynamisch op basis van aantal stappen
  const gridCols = wizardSteps.length === 2 ? "grid-cols-2" : "grid-cols-4";

  const isStepClickable = (step: WizardStep): boolean => {
    if (!onStepClick) return false;
    // When maxReachedStep is provided, only allow navigation up to that step
    if (maxReachedStep !== undefined) return step <= maxReachedStep;
    // Fallback (when maxReachedStep not provided): completed steps or current step
    if (completedSteps.includes(step)) return true;
    if (step === currentStep) return true;
    return false;
  };

  return (
    <div className="w-full">
      {/* Step labels */}
      <nav aria-label="Progress">
        <ol className={`grid ${gridCols}`}>
          {wizardSteps.map((step) => {
            const isActive = step.number === currentStep;
            const isCompleted = completedSteps.includes(step.number);
            const isPast = step.number < currentStep;
            const clickable = isStepClickable(step.number);

            return (
              <li key={step.number} className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => clickable && onStepClick?.(step.number)}
                  disabled={!clickable}
                  className={`flex items-center gap-2 ${
                    clickable ? "cursor-pointer" : "cursor-not-allowed"
                  }`}
                >
                  {/* Step number / icon badge */}
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 ${
                      step.icon ? "" : "text-[13px] font-medium pb-[3px]"
                    } ${
                      isActive
                        ? "bg-[#39ADE5] text-white"
                        : isPast || isCompleted
                        ? "bg-[#1F2D58] text-white"
                        : "bg-[#1F2D58]/[0.12] text-[#1F2D58]"
                    }`}
                  >
                    {step.icon ? (
                      <step.icon className="h-3.5 w-3.5" />
                    ) : (
                      step.number
                    )}
                  </span>

                  {/* Step label - hidden on mobile for non-active steps */}
                  <span
                    className={`text-sm ${
                      isActive ? "font-bold text-[#1F2D58]" : "font-normal text-[#1F2D58]"
                    } ${!isActive ? "hidden sm:inline" : ""}`}
                  >
                    {step.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
