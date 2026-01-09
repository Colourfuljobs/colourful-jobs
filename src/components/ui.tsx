"use client";

import { ReactNode } from "react";

export function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      className="inline-flex h-10 items-center justify-center rounded-full bg-sky-600 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
      {...props}
    >
      {children}
    </button>
  );
}

export function TextField(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }
) {
  const { label, id, ...rest } = props;
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="space-y-1">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-slate-800"
      >
        {label}
      </label>
      <input
        id={inputId}
        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
        {...rest}
      />
    </div>
  );
}


