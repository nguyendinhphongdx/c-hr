import { apiClient } from "@/lib/api/client";

/** Bulk map of the actor's USER-scope preferences. Keys are dot-notated
 *  (`<feature>.<setting>`) and values are arbitrary JSON. */
export type PreferenceMap = Record<string, unknown>;

export const preferencesService = {
  get: async (): Promise<PreferenceMap> => {
    const res = await apiClient.get<PreferenceMap>("/preferences");
    return res.data;
  },

  set: async (key: string, value: unknown): Promise<void> => {
    await apiClient.patch("/preferences", { key, value });
  },
};
