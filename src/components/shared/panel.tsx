import type { CSSProperties, ReactNode } from "react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Titled card used for dashboard-style sections: header strip, optional action, padded body. */
export function Panel({
  title,
  action,
  children,
  className,
  contentClassName,
  style,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  style?: CSSProperties;
}) {
  return (
    <Card className={cn("gap-0 py-0", className)} style={style}>
      <CardHeader className="border-b py-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className={cn("py-4", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
