/**
 * Generate a URL-friendly slug from text. Handles Vietnamese diacritics.
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function generateUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  let slug = baseSlug;
  let counter = 1;
  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}

export async function generateUniqueSlugAsync(
  name: string,
  checkExists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;
  while (await checkExists(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}
