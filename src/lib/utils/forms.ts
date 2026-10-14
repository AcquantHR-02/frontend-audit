import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ApiError } from "@/types/api";

/**
 * Maps a server ApiError onto a react-hook-form instance.
 * Known field errors go inline; anything else lands on `root` for a form-level message.
 */
export function applyApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
) {
  const apiError = error as ApiError;
  let mapped = false;
  for (const [field, message] of Object.entries(apiError.fieldErrors ?? {})) {
    if ((fields as readonly string[]).includes(field)) {
      setError(field as Path<T>, { type: "server", message }, { shouldFocus: !mapped });
      mapped = true;
    }
  }
  if (!mapped)
    setError("root.server" as Path<T>, { type: "server", message: apiError.message ?? "Something went wrong." });
}
