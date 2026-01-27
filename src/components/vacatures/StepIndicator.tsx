"use client";

import { WIZARD_STEPS, type StepIndicatorProps, type WizardStep } from "./types";

export function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
}: StepIndicatorProps) {
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
    <div className="bg-white rounded-[0.75rem] p-4">
      {/* Progress bar */}
      <div className="relative mb-2">
        <div className="h-1 bg-[#1F2D58]/[0.12] rounded-full">
          <div
            className="h-1 bg-[#1F2D58] rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / WIZARD_STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step labels */}
      <nav aria-label="Progress">
        <ol className="flex items-center justify-between">
          {WIZARD_STEPS.map((step, index) => {
            const isActive = step.number === currentStep;
            const isCompleted = completedSteps.includes(step.number);
            const isPast = step.number < currentStep;
            const clickable = isStepClickable(step.number);

            return (
              <li key={step.number} className="flex items-center gap-2">
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
                      isActive || isPast || isCompleted
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
