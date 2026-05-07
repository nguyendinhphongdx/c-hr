"use client";

import { create } from "zustand";

import type { ID } from "@/lib/types";

import type { AttendeeDraft } from "../components/event/EventAttendeesPicker";
import type { EventDetail, EventVisibility } from "../types";

export interface EventDraft {
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  isAllDay: boolean;
  location: string;
  conferenceUrl: string;
  organizer: AttendeeDraft | null;
  invitees: AttendeeDraft[];
  resourceIds: ID[];
  visibility: EventVisibility;
  isPrivate: boolean;
  description: string;
  color: string | null;
}

interface HydrateDefaultsInput {
  start?: string; // ISO
  end?: string;   // ISO
  resourceIds?: ID[];
}

interface EventDraftState {
  draft: EventDraft;
  /** Bumped each time the draft is reset/hydrated — lets RHF re-sync. */
  hydrationToken: number;
  setField: <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => void;
  setOrganizer: (organizer: AttendeeDraft | null) => void;
  addInvitee: (invitee: AttendeeDraft) => void;
  removeInvitee: (userId: ID) => void;
  setResourceIds: (ids: ID[]) => void;
  hydrateFromEvent: (event: EventDetail) => void;
  hydrateDefaults: (input: HydrateDefaultsInput) => void;
  reset: () => void;
}

const EMPTY_DRAFT: EventDraft = {
  title: "",
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  isAllDay: false,
  location: "",
  conferenceUrl: "",
  organizer: null,
  invitees: [],
  resourceIds: [],
  visibility: "DEFAULT",
  isPrivate: false,
  description: "",
  color: null,
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function splitIso(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export const useEventDraftStore = create<EventDraftState>((set) => ({
  draft: { ...EMPTY_DRAFT },
  hydrationToken: 0,

  setField: (key, value) =>
    set((s) => ({ draft: { ...s.draft, [key]: value } })),

  setOrganizer: (organizer) =>
    set((s) => ({ draft: { ...s.draft, organizer } })),

  addInvitee: (invitee) =>
    set((s) => {
      if (s.draft.organizer?.userId === invitee.userId) return s;
      if (s.draft.invitees.some((a) => a.userId === invitee.userId)) return s;
      return { draft: { ...s.draft, invitees: [...s.draft.invitees, invitee] } };
    }),

  removeInvitee: (userId) =>
    set((s) => ({
      draft: {
        ...s.draft,
        invitees: s.draft.invitees.filter((a) => a.userId !== userId),
      },
    })),

  setResourceIds: (ids) =>
    set((s) => ({ draft: { ...s.draft, resourceIds: ids } })),

  hydrateFromEvent: (event) =>
    set((s) => {
      const startSplit = splitIso(event.startAt);
      const endSplit = splitIso(event.endAt);
      const orgAttendee = event.attendees.find((a) => a.isOrganizer);
      const organizer: AttendeeDraft | null =
        orgAttendee && orgAttendee.user
          ? {
              userId: orgAttendee.user.id,
              name: orgAttendee.user.name,
              email: orgAttendee.user.email,
            }
          : null;
      const invitees: AttendeeDraft[] = event.attendees
        .filter((a) => !a.isOrganizer && a.user)
        .map((a) => ({
          userId: a.user!.id,
          name: a.user!.name,
          email: a.user!.email,
        }));
      return {
        draft: {
          ...EMPTY_DRAFT,
          title: event.title,
          startDate: startSplit.date,
          startTime: startSplit.time,
          endDate: endSplit.date,
          endTime: endSplit.time,
          isAllDay: event.isAllDay,
          location: event.location ?? "",
          conferenceUrl: event.conferenceUrl ?? "",
          organizer,
          invitees,
          resourceIds: (event.resources ?? []).map((r) => r.resourceId),
          visibility: event.visibility,
          isPrivate: event.isPrivate,
          description: event.description ?? "",
          color: event.color ?? null,
        },
        hydrationToken: s.hydrationToken + 1,
      };
    }),

  hydrateDefaults: ({ start, end, resourceIds }) =>
    set((s) => {
      const startSplit = start ? splitIso(start) : { date: "", time: "" };
      const endSplit = end ? splitIso(end) : { date: "", time: "" };
      return {
        draft: {
          ...EMPTY_DRAFT,
          startDate: startSplit.date,
          startTime: startSplit.time,
          endDate: endSplit.date,
          endTime: endSplit.time,
          resourceIds: resourceIds ?? [],
        },
        hydrationToken: s.hydrationToken + 1,
      };
    }),

  reset: () =>
    set((s) => ({
      draft: { ...EMPTY_DRAFT },
      hydrationToken: s.hydrationToken + 1,
    })),
}));
