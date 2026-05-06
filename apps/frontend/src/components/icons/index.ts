/**
 * Brand and inline SVG icons — one icon per file.
 *
 * Why per-file:
 *   - Tree-shakeable when only some icons are used.
 *   - Easy to add new ones: drop `<name>-icon.tsx` and add the export below.
 *   - Easy to find: filename mirrors the export name.
 *
 * Why have this folder at all (instead of just lucide-react):
 *   - The bundled `lucide-react` major version doesn't always export brand
 *     icons (e.g. `Github`, `Google` are missing in v1.x). Inline SVGs are
 *     more stable across lucide upgrades and lighter than full brand libs.
 *
 * For UI icons (arrow, eye, settings, …) keep using `lucide-react`.
 * For brand marks not in lucide, paste the SVG path here from
 * https://simpleicons.org/ (MIT-licensed) or your design source.
 *
 * See docs/frontend/recipes/icons.md (at the repo root) for the full pattern
 * + when to use which library.
 */
export { GithubIcon } from "./github-icon";
export { GoogleIcon } from "./google-icon";
export { MicrosoftIcon } from "./microsoft-icon";
export type { IconProps } from "./types";
