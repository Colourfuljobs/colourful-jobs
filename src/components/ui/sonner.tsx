"use client"

import {
  Check,
  Info,
  X,
  AlertTriangle,
} from "lucide-react"
import { Toaster as Sonner } from "sonner"
import { Spinner } from "@/components/ui/spinner"

type ToasterProps = React.ComponentProps<typeof Sonner>

// Custom icon components with colored circle backgrounds
// Colors: success=#41712F, error=#BC0000, warning=#F86600, info=#39ADE5
const SuccessIcon = () => (
  <div style={{ 
    display: 'flex', 
    height: '36px', 
    width: '36px',
    minWidth: '36px',
    flexShrink: 0,
    alignItems: 'center', 
    justifyContent: 'center', 
    borderRadius: '50%', 
    backgroundColor: '#41712F' 
  }}>
    <Check style={{ height: '18px', width: '18px', color: 'white', strokeWidth: 3 }} />
  </div>
)

const ErrorIcon = () => (
  <div style={{ 
    display: 'flex', 
    height: '36px', 
    width: '36px',
    minWidth: '36px',
    flexShrink: 0,
    alignItems: 'center', 
    justifyContent: 'center', 
    borderRadius: '50%', 
    backgroundColor: '#BC0000' 
  }}>
    <X style={{ height: '18px', width: '18px', color: 'white', strokeWidth: 3 }} />
  </div>
)

const WarningIcon = () => (
  <div style={{ 
    display: 'flex', 
    height: '36px', 
    width: '36px',
    minWidth: '36px',
    flexShrink: 0,
    alignItems: 'center', 
    justifyContent: 'center', 
    borderRadius: '50%', 
    backgroundColor: '#F86600' 
  }}>
    <AlertTriangle style={{ height: '18px', width: '18px', color: 'white', strokeWidth: 2.5 }} />
  </div>
)

const InfoIcon = () => (
  <div style={{ 
    display: 'flex', 
    height: '36px', 
    width: '36px',
    minWidth: '36px',
    flexShrink: 0,
    alignItems: 'center', 
    justifyContent: 'center', 
    borderRadius: '50%', 
    backgroundColor: '#39ADE5' 
  }}>
    <Info style={{ height: '18px', width: '18px', color: 'white', strokeWidth: 2.5 }} />
  </div>
)

const LoadingIcon = () => (
  <div style={{ 
    display: 'flex', 
    height: '36px', 
    width: '36px',
    minWidth: '36px',
    flexShrink: 0,
    alignItems: 'center', 
    justifyContent: 'center', 
    borderRadius: '50%', 
    backgroundColor: 'rgba(57, 173, 229, 0.2)' 
  }}>
    <Spinner style={{ height: '18px', width: '18px', color: '#39ADE5' }} />
  </div>
)

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <SuccessIcon />,
        info: <InfoIcon />,
        warning: <WarningIcon />,
        error: <ErrorIcon />,
        loading: <LoadingIcon />,
      }}
      toastOptions={{
        style: {
          background: 'white',
          border: 'none',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: '16px',
          fontFamily: '"sofia-pro", sans-serif',
        },
        classNames: {
          toast: "group toast [&>[data-icon]]:static [&>[data-icon]]:mr-0 [&>[data-icon]]:shrink-0",
          icon: "!static !m-0 !mr-0 !shrink-0",
          title: "!text-[#1F2D58] !font-bold !text-[18px] !leading-tight",
          description: "!text-[#1F2D58]/70 !text-[14px] !leading-snug !font-normal",
          actionButton: "!bg-[#F86600] !text-white",
          cancelButton: "!bg-slate-100 !text-[#1F2D58]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
