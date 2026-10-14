import { ShieldOffIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";

export function Forbidden() {
  return (
    <EmptyState
      icon={ShieldOffIcon}
      title="You don't have access to this page"
      description="Your role doesn't include this area. If you think this is a mistake, contact your Auditor Admin."
      action={
        <Button asChild variant="outline">
          <Link href="/overview">Back to overview</Link>
        </Button>
      }
    />
  );
}
