import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function InlineAlert(props: { message: string | null; className?: string }) {
  if (!props.message) return null;
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100",
        props.className,
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>{props.message}</p>
    </div>
  );
}
