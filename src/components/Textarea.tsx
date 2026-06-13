import { TextareaHTMLAttributes } from 'react';

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full bg-white border-2 border-surface-300 hover:border-surface-400 transition-colors rounded-xl p-6 focus:ring-2 focus:ring-black focus:outline-none focus:border-transparent text-black font-light leading-[1.8] resize-none shadow-[0_2px_10px_rgba(0,0,0,0.04)] placeholder:text-surface-500 disabled:opacity-50 disabled:bg-surface-50 disabled:cursor-not-allowed ${className}`}
    />
  );
}
