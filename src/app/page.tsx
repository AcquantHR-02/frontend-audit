import { redirect } from "next/navigation";

/** The dashboard guard sends anonymous users on to /login. */
export default function RootPage() {
  redirect("/overview");
}
