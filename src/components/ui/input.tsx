import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("h-12 w-full rounded-xl border border-primary/15 bg-white px-4 text-sm outline-none transition placeholder:text-muted/70 focus:border-secondary focus:ring-3 focus:ring-secondary/10", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn("min-h-32 w-full rounded-xl border border-primary/15 bg-white p-4 text-sm outline-none transition placeholder:text-muted/70 focus:border-secondary focus:ring-3 focus:ring-secondary/10", className)} {...props} />
));
Textarea.displayName = "Textarea";
