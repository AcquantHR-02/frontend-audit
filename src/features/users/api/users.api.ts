import { baseApi, providesPage } from "@/store";
import type { Page, PageRequest } from "@/types/api";
import type { Role, User, UserView } from "@/types/domain";

export type UserInput = Pick<User, "fullName" | "email" | "role" | "vendorId" | "peId">;
export type UserListParams = PageRequest & { role?: Role; active?: boolean };

export interface UserWithPassword {
  user: UserView;
  /** Shown once to the admin (mock). The real backend should email it instead. */
  temporaryPassword: string;
}

export const usersApi = baseApi.injectEndpoints({
  // Fast Refresh re-evaluates this module in dev; allow re-registering the same endpoints.
  overrideExisting: process.env.NODE_ENV === "development",
  endpoints: (build) => ({
    getUsers: build.query<Page<UserView>, UserListParams | void>({
      query: (params) => ({ url: "/users", params: params ?? undefined }),
      providesTags: (result) => providesPage("User", result),
    }),
    createUser: build.mutation<UserWithPassword, UserInput>({
      query: (body) => ({ url: "/users", method: "POST", body }),
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),
    updateUser: build.mutation<UserView, UserInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `/users/${id}`, method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "User", id }],
    }),
    setUserStatus: build.mutation<UserView, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({ url: `/users/${id}/status`, method: "PATCH", body: { isActive } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "User", id }],
    }),
    resetUserPassword: build.mutation<UserWithPassword, string>({
      query: (id) => ({ url: `/users/${id}/reset-password`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [{ type: "User", id }],
    }),
    unlockUser: build.mutation<UserView, string>({
      query: (id) => ({ url: `/users/${id}/unlock`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [{ type: "User", id }],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useSetUserStatusMutation,
  useResetUserPasswordMutation,
  useUnlockUserMutation,
} = usersApi;
