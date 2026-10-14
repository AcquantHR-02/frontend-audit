"use client";

import { useEffect } from "react";
import { selectSessionStatus } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { authApi } from "../api/auth.api";

/** One restore attempt per page load, even under Strict Mode double effects or several guards mounting. */
let restoreStarted = false;

/**
 * Returns the session status, kicking off a one-time session restore (POST /auth/refresh)
 * while it is still "idle". Guards render a loader until it settles.
 */
export function useSessionStatus() {
  const status = useAppSelector(selectSessionStatus);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (status !== "idle" || restoreStarted) return;
    restoreStarted = true;
    dispatch(authApi.endpoints.refreshSession.initiate()).finally(() => {
      restoreStarted = false;
    });
  }, [status, dispatch]);

  return status;
}
