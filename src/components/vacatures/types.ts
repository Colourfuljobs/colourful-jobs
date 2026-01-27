import type { VacancyRecord, VacancyInputType, ProductRecord, LookupRecord, FeatureRecord } from "@/lib/airtable";

// Extended product with populated features (from API)
export interface ProductWithFeatures extends ProductRecord {
  populatedFeatures: FeatureRecord[];
}

export type WizardStep = 1 | 2 | 3 | 4;

export interface WizardStepConfig {
  number: WizardStep;
  label: string;
  shortLabel: string;
}

export const WIZARD_STEPS: WizardStepConfig[] = [
  { number: 1, label: "Pakketten", shortLabel: "Pakketten" },
  { number: 2, label: "Opstellen", shortLabel: "Opstellen" },
  { number: 3, label: "Bekijken", shortLabel: "Bekijken" },
  { number: 4, label: "Plaatsen", shortLabel: "Plaatsen" },
];

export interface VacancyWizardState {
  currentStep: WizardStep;
  inputType: VacancyInputType;
  isDirty: boolean;
  selectedPackage: ProductWithFeatures | null;
  selectedUpsells: ProductRecord[];
  vacancyData: Partial<VacancyRecord>;
  vacancyId: string | null;
}

export interface StepIndicatorProps {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  onStepClick?: (step: WizardStep) => void;
}

export interface CostSidebarProps {
  selectedPackage: ProductRecord | null;
  selectedUpsells: ProductRecord[];
  availableCredits: number;
  showPackageInfo?: boolean;
  showUpsellOptions?: boolean;
  onChangePackage?: () => void;
  onBuyCredits?: () => void;
}

export interface PackageSelectorProps {
  packages: ProductRecord[];
  selectedPackage: ProductRecord | null;
  onSelectPackage: (pkg: ProductRecord) => void;
  availableCredits: number;
}

export interface VacancyFormProps {
  vacancy: Partial<VacancyRecord>;
  inputType: VacancyInputType;
  lookups: {
    educationLevels: LookupRecord[];
    fields: LookupRecord[];
    functionTypes: LookupRecord[];
    regions: LookupRecord[];
    sectors: LookupRecord[];
  };
  onChange: (updates: Partial<VacancyRecord>) => void;
  validationErrors?: string[];
}

export interface VacancyPreviewProps {
  vacancy: Partial<VacancyRecord>;
  selectedPackage: ProductRecord | null;
  selectedUpsells: ProductRecord[];
  lookups: {
    educationLevels: LookupRecord[];
    fields: LookupRecord[];
    functionTypes: LookupRecord[];
    regions: LookupRecord[];
    sectors: LookupRecord[];
  };
}

export interface SubmitStepProps {
  vacancy: Partial<VacancyRecord>;
  selectedPackage: ProductRecord;
  selectedUpsells: ProductRecord[];
  availableUpsells: ProductRecord[];
  availableCredits: number;
  onToggleUpsell: (upsell: ProductRecord) => void;
  onSubmit: () => Promise<void>;
  onBuyCredits: () => void;
  isSubmitting: boolean;
}
