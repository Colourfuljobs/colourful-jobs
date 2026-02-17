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

export const WIZARD_STEPS_NEW: WizardStepConfig[] = [
  { number: 1, label: "Pakketten", shortLabel: "Pakketten" },
  { number: 2, label: "Opstellen", shortLabel: "Opstellen" },
  { number: 3, label: "Controleren", shortLabel: "Controleren" },
  { number: 4, label: "Plaatsen", shortLabel: "Plaatsen" },
];

export const WIZARD_STEPS_EDIT: WizardStepConfig[] = [
  { number: 1, label: "Aanpassen", shortLabel: "Aanpassen" },
  { number: 2, label: "Voorbeeld", shortLabel: "Voorbeeld" },
];

// Backward compatibility
export const WIZARD_STEPS = WIZARD_STEPS_NEW;

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
  steps?: WizardStepConfig[];  // Optional custom steps for edit mode
}

export interface CostSidebarProps {
  selectedPackage: ProductRecord | null;
  selectedUpsells: ProductRecord[];
  includedUpsellProducts?: ProductRecord[];
  availableCredits: number;
  showPackageInfo?: boolean;
  showUpsellOptions?: boolean;
  onChangePackage?: () => void;
  onBuyCredits?: () => void;
}

export interface PackageSelectorProps {
  packages: ProductWithFeatures[];
  selectedPackage: ProductWithFeatures | null;
  onSelectPackage: (pkg: ProductWithFeatures) => void;
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
  validationErrors?: Record<string, string>;
  onContactPhotoChange?: (url: string | null) => void;
  onHeaderImageChange?: (url: string | null) => void;
  onLogoChange?: (url: string | null) => void;
  employerSectorId?: string | null;
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
  contactPhotoUrl?: string;
  headerImageUrl?: string;
  logoUrl?: string;
  isExistingVacancy?: boolean;  // NEW: hide title block when editing
  isReadOnly?: boolean;  // NEW: hide title block in read-only mode (wacht_op_goedkeuring)
}

export interface InvoiceDetails {
  contact_name: string;
  email: string;
  street: string;
  postal_code: string;
  city: string;
  reference_nr: string;
}

export interface SubmitStepProps {
  selectedPackage: ProductWithFeatures;
  selectedUpsells: ProductRecord[];
  availableUpsells: ProductRecord[];
  availableCredits: number;
  onToggleUpsell: (upsell: ProductRecord) => void;
  onBuyCredits: () => void;
  onInvoiceDetailsChange: (details: InvoiceDetails | null) => void;
  onChangePackage?: () => void;
  showInvoiceError?: boolean;
  profileComplete?: boolean;
  profileEditUrl?: string;
  /** Extension upsell (until_max) datepicker state */
  extensionDateRange?: { minDate: Date; maxDate: Date; standardEndDate?: Date } | null;
  selectedClosingDate?: Date;
  onClosingDateChange?: (date: Date | undefined) => void;
  currentClosingDate?: string | null;
  inputType?: VacancyInputType;
  /** Helper to check if an upsell is the social post upsell */
  isSocialPostUpsell?: (product: ProductRecord) => boolean;
  /** Callback to open colleagues modal */
  onOpenColleaguesModal?: () => void;
}
