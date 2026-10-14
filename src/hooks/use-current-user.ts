import { can, type Permission } from "@/lib/auth";
import { selectCurrentUser } from "@/store";
import { useAppSelector } from "@/store/hooks";

/** The signed-in user, or null. */
export function useCurrentUser() {
  return useAppSelector(selectCurrentUser);
}

/** `const canPublish = useCan(Permission.AUDIT_RUNS_PUBLISH)` */
export function useCan(permission: Permission) {
  return can(useCurrentUser(), permission);
}
