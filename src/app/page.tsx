import { redirect } from "next/navigation";

/** Temporary: points at the Step 1 showcase. Step 2 redirects to /overview (or /login). */
export default function RootPage() {
  redirect("/showcase");
}
