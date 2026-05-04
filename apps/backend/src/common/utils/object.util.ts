/**
 * Pick specific keys from an object. Returns undefined when input is null/undefined.
 */
export function pick<T extends object, K extends keyof T>(
  obj: T | null | undefined,
  keys: K[],
): Pick<T, K> | undefined {
  if (!obj) return undefined;
  return keys.reduce(
    (result, key) => {
      if (key in obj) result[key] = obj[key];
      return result;
    },
    {} as Pick<T, K>,
  );
}

/**
 * Omit specific keys from an object.
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const out = { ...obj } as any;
  for (const k of keys) delete out[k];
  return out;
}
