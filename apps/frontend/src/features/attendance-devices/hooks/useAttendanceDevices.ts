"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ID } from "@/lib/types";

import { attendanceDevicesService } from "../services/attendanceDevicesService";
import type { CreateDeviceInput, UpdateDeviceInput } from "../types";

export const attendanceDeviceKeys = {
  list: ["attendance-devices", "list"] as const,
  detail: (id: ID) => ["attendance-devices", "detail", id] as const,
};

export function useAttendanceDevices() {
  return useQuery({
    queryKey: attendanceDeviceKeys.list,
    queryFn: () => attendanceDevicesService.list(),
    staleTime: 30 * 1000,
  });
}

export function useCreateAttendanceDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDeviceInput) => attendanceDevicesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-devices"] });
    },
  });
}

export function useUpdateAttendanceDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: UpdateDeviceInput }) =>
      attendanceDevicesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-devices"] });
    },
  });
}

export function useGetAttendanceDeviceToken() {
  return useMutation({
    mutationFn: (id: ID) => attendanceDevicesService.getToken(id),
  });
}

export function useRegenerateAttendanceDeviceToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => attendanceDevicesService.regenerateToken(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-devices"] });
    },
  });
}

export function useDeleteAttendanceDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => attendanceDevicesService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-devices"] });
    },
  });
}
