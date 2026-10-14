import type { Page } from "@/types/api";
import type { TagType } from "./base-api";

/** `providesTags` for a paginated list: the LIST tag plus one tag per row. */
export function providesPage<T extends { id: string }>(type: TagType, page: Page<T> | undefined) {
  return [{ type, id: "LIST" }, ...(page?.content.map(({ id }) => ({ type, id })) ?? [])];
}

/** `providesTags` for a plain array response. */
export function providesList<T extends { id: string }>(type: TagType, items: T[] | undefined) {
  return [{ type, id: "LIST" }, ...(items?.map(({ id }) => ({ type, id })) ?? [])];
}
