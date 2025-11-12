'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white">
          {label}
          {props.required && <span className="text-red-400 ml-1">*</span>}
        </label>
        <input
          ref={ref}
          className={`
            w-full px-4 py-2.5 
            bg-black border border-gray-700 rounded-lg
            text-white text-sm
            placeholder:text-gray-500
            focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
            transition-all
            ${error ? 'border-red-500 focus:ring-red-500/50' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

