import { baseApi } from "@/store";
import type { NotificationPage } from "@/types/domain";

export interface NotificationListParams {
  unread?: boolean;
  page?: number;
  size?: number;
}

const LIST = { type: "Notification" as const, id: "LIST" };

export const notificationsApi = baseApi.injectEndpoints({
  // Fast Refresh re-evaluates this module in dev; allow re-registering the same endpoints.
  overrideExisting: process.env.NODE_ENV === "development",
  endpoints: (build) => ({
    getNotifications: build.query<NotificationPage, NotificationListParams>({
      query: ({ unread, page = 0, size = 20 }) => ({
        url: "/notifications",
        params: { page, size, ...(unread ? { unread: true } : {}) },
      }),
      providesTags: [LIST],
    }),
    markNotificationRead: build.mutation<void, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "POST" }),
      invalidatesTags: [LIST],
    }),
    markAllNotificationsRead: build.mutation<void, void>({
      query: () => ({ url: "/notifications/read-all", method: "POST" }),
      invalidatesTags: [LIST],
    }),
  }),
});

export const { useGetNotificationsQuery, useMarkNotificationReadMutation, useMarkAllNotificationsReadMutation } =
  notificationsApi;
