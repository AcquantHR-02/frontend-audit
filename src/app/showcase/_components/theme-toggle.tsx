"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <Button variant="outline" onClick={() => setTheme(isDark ? "light" : "dark")} aria-label="Toggle colour theme">
      <SunIcon className="hidden dark:block" />
      <MoonIcon className="dark:hidden" />
      <span className="hidden dark:inline">Light mode</span>
      <span className="dark:hidden">Dark mode</span>
    </Button>
  );
}
