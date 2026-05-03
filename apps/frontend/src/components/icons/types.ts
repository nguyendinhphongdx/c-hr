/**
 * Shared props for all icons in this folder. Use `currentColor` in your fills
 * so icons inherit `text-*` utilities from Tailwind.
 */
export interface IconProps {
  /** Tailwind classes — sized via `h-* w-*` (e.g. `h-4 w-4`). */
  className?: string;
  /**
   * Optional accessible label. When set, the SVG becomes a labelled image
   * (`role="img"`); when omitted, it is hidden from assistive tech.
   */
  title?: string;
}
