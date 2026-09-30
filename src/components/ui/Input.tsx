import { cn } from "@/lib/utils/cn";
import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className={cn(
          "w-full h-11 px-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-lg text-body-lg placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-highest focus:ring-2 focus:ring-primary-fixed/40",
          className,
        )}
      />
    );
  },
);

export const NumericInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function NumericInput({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        inputMode="decimal"
        {...props}
        className={cn(
          "w-full h-11 bg-surface-container-lowest text-center font-label-numeric text-label-numeric text-on-surface rounded-lg focus:outline-none focus:bg-surface-container-highest placeholder:text-on-surface-variant",
          className,
        )}
      />
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        {...props}
        className={cn(
          "w-full min-h-[88px] px-3 py-2 rounded-lg bg-surface-container-lowest text-on-surface font-body-lg text-body-lg placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-highest focus:ring-2 focus:ring-primary-fixed/40 resize-none",
          className,
        )}
      />
    );
  },
);