import type { OnboardingFormData } from "@/lib/validation";
import type { UseFormSetValue, UseFormWatch, UseFormGetValues } from "react-hook-form";
import type { LookupRecord } from "@/lib/airtable";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CustomRegister = (name: keyof OnboardingFormData) => any;

export type Step = 1 | 2 | 3;

export interface ContactData {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface EmployerInfo {
  id: string;
  company_name?: string;
  display_name?: string;
  website_url?: string;
}

export interface KvkCheckResult {
  exists: boolean;
  employer?: EmployerInfo;
}

// Props for Step 1 component
export interface Step1Props {
  contact: ContactData;
  setContact: React.Dispatch<React.SetStateAction<ContactData>>;
  emailSent: boolean;
  emailVerified: boolean;
  loading: boolean;
  isResending: boolean;
  emailError: string | null;
  setEmailError: (error: string | null) => void;
  onSubmit: () => Promise<void>;
  onResendEmail: () => Promise<void>;
  onClearState: () => void;
  onNextStep: () => Promise<boolean>;
  onOpenRestartDialog: () => void;
  saving: boolean;
}

// Props for Step 2 component
export interface Step2Props {
  // Form
  register: CustomRegister;
  setValue: UseFormSetValue<OnboardingFormData>;
  watch: UseFormWatch<OnboardingFormData>;
  getValues: UseFormGetValues<OnboardingFormData>;
  formErrors: Record<string, string>;
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: boolean;
  
  // KVK state
  showKVKSearch: boolean;
  setShowKVKSearch: (show: boolean) => void;
  kvkSelected: boolean;
  setKvkSelected: (selected: boolean) => void;
  kvkCheckResult: KvkCheckResult | null;
  setKvkCheckResult: (result: KvkCheckResult | null) => void;
  checkingKvk: boolean;
  setCheckingKvk: (checking: boolean) => void;
  
  // Duplicate dialog
  duplicateEmployer: EmployerInfo | null;
  setDuplicateEmployer: (employer: EmployerInfo | null) => void;
  duplicateDialogOpen: boolean;
  setDuplicateDialogOpen: (open: boolean) => void;
  
  // Navigation
  onPrevious: () => void;
  onNext: () => Promise<boolean>;
  onStartJoinFlow: (employer: EmployerInfo) => void;
}

// Props for Step 3 component
export interface Step3Props {
  // Form
  register: CustomRegister;
  setValue: UseFormSetValue<OnboardingFormData>;
  watch: UseFormWatch<OnboardingFormData>;
  getValues: UseFormGetValues<OnboardingFormData>;
  formErrors: Record<string, string>;
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: boolean;
  
  // Sectors dropdown
  sectors: LookupRecord[];
  loadingSectors: boolean;
  
  // Image uploads
  logoPreview: string | null;
  headerPreview: string | null;
  logoUploaded: boolean;
  headerUploaded: boolean;
  uploadingLogo: boolean;
  uploadingHeader: boolean;
  logoError: string | null;
  headerError: string | null;
  setLogoError: (error: string | null) => void;
  setHeaderError: (error: string | null) => void;
  onImageUpload: (file: File, type: "logo" | "header") => Promise<void>;
  
  // Navigation & submit
  onPrevious: () => void;
  onSubmit: () => Promise<void>;
  
  // Contact data for final submit
  contact: ContactData;
}

// Props for Join Flow component
export interface JoinFlowProps {
  joinEmployer: EmployerInfo | null;
  joinEmail: string;
  setJoinEmail: (email: string) => void;
  joinDomainError: string | null;
  setJoinDomainError: (error: string | null) => void;
  joinStep: "confirm" | "verification";
  setJoinStep: (step: "confirm" | "verification") => void;
  joinLoading: boolean;
  joinContact: { firstName: string; lastName: string; role: string };
  setJoinContact: React.Dispatch<React.SetStateAction<{ firstName: string; lastName: string; role: string }>>;
  joinResending: boolean;
  sessionEmail: string | null;
  onSubmit: () => Promise<void>;
  onResendEmail: () => Promise<void>;
  onCancel: () => void;
}

// Props for Step Indicator component
export interface StepIndicatorProps {
  currentStep: Step;
  step1Complete: boolean;
  step2Complete: boolean;
  onStepClick: (step: Step) => void;
}
