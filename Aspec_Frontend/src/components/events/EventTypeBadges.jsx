import { MapPin, Repeat, Video } from "lucide-react";

export default function EventTypeBadges({ isOnline, recurring = false, dark = false }) {
  const hasMode = typeof isOnline === "boolean";
  if (!hasMode && recurring !== true) return null;

  const className = `inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
    dark
      ? "border-white/15 bg-white/[0.08] text-white/85"
      : "border-gray-200 bg-gray-50 text-gray-600"
  }`;
  const ModeIcon = isOnline ? Video : MapPin;

  return (
    <>
      {hasMode && (
        <span className={className}>
          <ModeIcon size={11} aria-hidden="true" />
          {isOnline ? "Online" : "Presencial"}
        </span>
      )}
      {recurring === true && (
        <span className={className}>
          <Repeat size={11} aria-hidden="true" /> Recorrente
        </span>
      )}
    </>
  );
}
