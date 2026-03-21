"use client";

import { Loader2, CheckCircle2, AlertCircle, Upload, Clock } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Loader2; colorClass: string }> = {
  uploaded: {
    label: "Queued",
    icon: Clock,
    colorClass: "text-accent-blue bg-accent-blue/10 border-accent-blue/20",
  },
  processing: {
    label: "Processing",
    icon: Loader2,
    colorClass: "text-accent-peach bg-accent-peach/10 border-accent-peach/20",
  },
  processed: {
    label: "Ready",
    icon: CheckCircle2,
    colorClass: "text-accent-cyan bg-accent-cyan/10 border-accent-cyan/20",
  },
  failed: {
    label: "Failed",
    icon: AlertCircle,
    colorClass: "text-accent-coral bg-accent-coral/10 border-accent-coral/20",
  },
};

interface Props {
  status: string;
  size?: "sm" | "md";
}

export default function ProcessingBadge({ status, size = "sm" }: Props) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.uploaded;
  const Icon = config.icon;
  const isSpinning = status === "processing";

  const sizeClass = size === "sm" ? "px-2 py-0.5 text-[10px] gap-1" : "px-3 py-1 text-xs gap-1.5";

  return (
    <span
      className={`inline-flex items-center font-mono font-medium rounded-full border
                  ${config.colorClass} ${sizeClass}`}
    >
      <Icon className={`w-3 h-3 ${isSpinning ? "animate-spin" : ""}`} />
      {config.label}
    </span>
  );
}
