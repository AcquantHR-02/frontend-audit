import { authHandlers } from "./auth.handlers";
import { mastersHandlers } from "./masters.handlers";
import { usersHandlers } from "./users.handlers";

/** One handler file per feature; register each here. */
export const handlers = [...authHandlers, ...mastersHandlers, ...usersHandlers];
