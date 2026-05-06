import type { IconProps } from "./types";

export function MicrosoftIcon({ className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden={!title}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      <path d="M2 2h9.5v9.5H2V2z" fill="#F25022" />
      <path d="M12.5 2H22v9.5h-9.5V2z" fill="#7FBA00" />
      <path d="M2 12.5h9.5V22H2v-9.5z" fill="#00A4EF" />
      <path d="M12.5 12.5H22V22h-9.5v-9.5z" fill="#FFB900" />
    </svg>
  );
}
