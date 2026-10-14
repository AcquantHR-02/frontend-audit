// Public API of the "users" feature.
// Other modules must import from "@/features/users" only, never from its internal folders.
export { usersApi, useGetUsersQuery } from "./api/users.api";
export { UsersPage } from "./components/users-page";
