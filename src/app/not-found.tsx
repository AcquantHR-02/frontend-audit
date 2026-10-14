import { FileQuestionIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <EmptyState
        icon={FileQuestionIcon}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <Button asChild>
            <Link href="/overview">Go to overview</Link>
          </Button>
        }
        className="w-full max-w-md"
      />
    </main>
  );
}
