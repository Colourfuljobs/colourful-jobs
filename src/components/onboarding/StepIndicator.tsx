"use client";

import type { StepIndicatorProps, Step } from "./types";

const stepLabels = [
  "Persoonlijke gegevens",
  "Bedrijfsgegevens",
  "Bedrijfsprofiel",
];

export function StepIndicator({ 
  currentStep, 
  step1Complete, 
  step2Complete, 
  onStepClick 
}: StepIndicatorProps) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center">
        {stepLabels.map((label, index) => {
          const stepNumber = (index + 1) as Step;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber === 1 ? step1Complete : stepNumber === 2 ? step2Complete : false;
          const isClickable = stepNumber === 1 || (stepNumber === 2 && step1Complete) || (stepNumber === 3 && step2Complete);
          // Line should only be dark if step is completed AND we're past that step
          const lineCompleted = isCompleted && currentStep > stepNumber;
          
          // Determine text alignment for labels
          let labelAlignment = 'left-0';
          if (index === 1) labelAlignment = 'left-1/2 -translate-x-1/2'; // centered
          if (index === 2) labelAlignment = 'right-0'; // right-aligned
          
          return (
            <li key={label} className={`relative ${index !== stepLabels.length - 1 ? 'flex-1' : ''}`}>
              <div className="flex items-center">
                {/* Step button/indicator */}
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(stepNumber)}
                  disabled={!isClickable}
                  className={`relative flex items-center justify-center ${
                    isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 ${
                      stepNumber <= currentStep
                        ? 'bg-[#1F2D58] text-white'
                        : 'bg-[#1F2D58]/[0.12] text-[#1F2D58]'
                    } ${isClickable && stepNumber > currentStep ? 'hover:bg-[#1F2D58]/[0.20]' : ''}`}
                  >
                    <span className="text-[13px] font-medium -mt-0.5">{stepNumber}</span>
                  </span>
                  <span className={`absolute -bottom-6 ${labelAlignment} whitespace-nowrap text-xs ${
                    isActive ? 'font-bold text-[#1F2D58]' : 'font-normal text-[#1F2D58]'
                  } ${!isActive ? 'hidden sm:inline' : ''}`}>
                    {label}
                  </span>
                </button>
                
                {/* Connecting line */}
                {index !== stepLabels.length - 1 && (
                  <div className="flex-1 px-3">
                    <div className={`h-0.5 w-full transition-colors duration-200 ${
                      lineCompleted ? 'bg-[#1F2D58]' : 'bg-[#1F2D58]/[0.12]'
                    }`} />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
