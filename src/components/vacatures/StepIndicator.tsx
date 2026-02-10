"use client";

import { WIZARD_STEPS_NEW, type StepIndicatorProps, type WizardStep } from "./types";

export function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
  steps,  // NIEUW: optionele custom stappen
}: StepIndicatorProps) {
  // Gebruik meegegeven stappen of fallback naar default
  const wizardSteps = steps || WIZARD_STEPS_NEW;
  
  // Grid cols dynamisch op basis van aantal stappen
  const gridCols = wizardSteps.length === 2 ? "grid-cols-2" : "grid-cols-4";

  const isStepClickable = (step: WizardStep): boolean => {
    if (!onStepClick) return false;
    // Can always go back to completed steps
    if (completedSteps.includes(step)) return true;
    // Can go to current step
    if (step === currentStep) return true;
    // Can go to next step if current is completed
    if (step === currentStep + 1 && completedSteps.includes(currentStep as WizardStep)) return true;
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
                    clickable ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  {/* Step number badge */}
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-medium transition-all duration-200 pb-[3px] ${
                      isActive
                        ? "bg-[#39ADE5] text-white"
                        : isPast || isCompleted
                        ? "bg-[#1F2D58] text-white"
                        : "bg-[#1F2D58]/[0.12] text-[#1F2D58]"
                    }`}
                  >
                    {step.number}
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
