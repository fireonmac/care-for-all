import { TextareaHTMLAttributes } from 'react';

export const commonInputClasses = "w-full bg-white border-2 border-surface-300 hover:border-surface-400 transition-colors rounded-xl focus:ring-2 focus:ring-black focus:outline-none focus:border-transparent text-black font-light placeholder:text-surface-500 disabled:opacity-50 disabled:bg-surface-50 disabled:cursor-not-allowed";

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${commonInputClasses} p-6 leading-[1.8] resize-none ${className}`}
    />
  );
}
