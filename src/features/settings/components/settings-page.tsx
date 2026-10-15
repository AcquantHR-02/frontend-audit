"use client";

import {
  BellIcon,
  KeyRoundIcon,
  Loader2Icon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  SettingsIcon,
  SunIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { usePageTitle } from "@/components/layout/page-title";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useCurrentUser } from "@/hooks/use-current-user";
import { isAuditor } from "@/lib/auth";
import { roleMeta } from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/types/api";
import type { NotificationType } from "@/types/domain";
import { useGetPreferencesQuery, useUpdatePreferencesMutation, useUpdateProfileMutation } from "../api/settings.api";

const partyTypes: { type: NotificationType; label: string; hint: string }[] = [
  { type: "WINDOW_OPENED", label: "Upload window opens", hint: "Window 1 or Window 2 opens for your evidence." },
  { type: "WINDOW_CLOSING", label: "Window closing soon", hint: "Two days before an upload window closes." },
  { type: "RUN_PUBLISHED", label: "Results published", hint: "Final score and any findings are out." },
  { type: "FINDING_RESOLVED", label: "Finding resolved", hint: "The auditor accepted your remediation." },
  { type: "FINDING_REOPENED", label: "Finding reopened", hint: "A finding needs more remediation." },
];
const auditorTypes: { type: NotificationType; label: string; hint: string }[] = [
  { type: "EVIDENCE_SUBMITTED", label: "Evidence submitted", hint: "A party uploads evidence for an item." },
  { type: "NA_PROPOSED", label: "Not applicable proposed", hint: "A party proposes an item as not applicable." },
  { type: "REMEDIATION_SUBMITTED", label: "Remediation submitted", hint: "A party responds to a finding." },
  { type: "REVIEW_READY", label: "Ready for review", hint: "Window 1 closed and the run moved to review." },
  { type: "PUBLISH_READY", label: "Ready to publish", hint: "A run reached final review." },
  { type: "RETENTION_NOTICE", label: "Retention notices", hint: "30 and 7 days before evidence is purged." },
];

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row items-start gap-3 border-b py-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="space-y-0.5">
          <CardTitle className="text-sm">{title}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="py-5">{children}</CardContent>
    </Card>
  );
}

/** Personal settings: profile, sign-in, notifications, appearance. */
export function SettingsPage() {
  usePageTitle("Settings");
  return (
    <>
      <PageHeader
        title="Settings"
        icon={SettingsIcon}
        description="Your profile, sign-in and how the app keeps you informed."
      />
      <div className="grid max-w-5xl gap-4 lg:grid-cols-2">
        <ProfileSection />
        <div className="flex flex-col gap-4">
          <SecuritySection />
          <AppearanceSection />
        </div>
        <div className="lg:col-span-2">
          <NotificationsSection />
        </div>
      </div>
    </>
  );
}

function ProfileSection() {
  const user = useCurrentUser()!;
  const [name, setName] = useState(user.fullName);
  const [error, setError] = useState<string | null>(null);
  const [save, { isLoading }] = useUpdateProfileMutation();
  const dirty = name.trim() !== user.fullName;

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await save({ fullName: name }).unwrap();
      toast.success("Profile updated");
    } catch (e) {
      const apiError = e as ApiError;
      setError(apiError.fieldErrors?.fullName ?? apiError.message);
    }
  }

  return (
    <Section icon={UserRoundIcon} title="Profile" description="How your name appears to auditors and parties.">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field data-invalid={!!error}>
          <FieldLabel htmlFor="settings-name">Full name</FieldLabel>
          <Input
            id="settings-name"
            value={name}
            maxLength={80}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />
          {error && <FieldError>{error}</FieldError>}
        </Field>
        <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-y-2.5 text-[13px]">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="truncate">{user.email}</dd>
          <dt className="text-muted-foreground">Role</dt>
          <dd>
            <StatusBadge meta={roleMeta[user.role]} dot={false} />
          </dd>
        </dl>
        <p className="text-xs text-muted-foreground">Email and role are managed by your Auditor Admin.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" disabled={!dirty || isLoading} onClick={() => setName(user.fullName)}>
            Reset
          </Button>
          <Button type="submit" disabled={!dirty || isLoading}>
            {isLoading && <Loader2Icon className="animate-spin" />} Save changes
          </Button>
        </div>
      </form>
    </Section>
  );
}

function SecuritySection() {
  return (
    <Section icon={KeyRoundIcon} title="Sign-in" description="Password and account security.">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          Use a strong password you don&apos;t use anywhere else. Five wrong attempts lock the account.
        </p>
        <Button asChild variant="outline">
          <Link href="/change-password">Change password</Link>
        </Button>
      </div>
    </Section>
  );
}

const themes: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
];

function AppearanceSection() {
  const { theme = "system", setTheme } = useTheme();
  return (
    <Section icon={PaletteIcon} title="Appearance" description="Saved on this device.">
      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
        {themes.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={theme === value}
            onClick={() => setTheme(value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-[13px] font-medium text-muted-foreground transition-colors outline-none hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50",
              theme === value && "border-primary bg-accent text-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </button>
        ))}
      </div>
    </Section>
  );
}

function NotificationsSection() {
  const user = useCurrentUser();
  const { data, isLoading } = useGetPreferencesQuery();
  const [update] = useUpdatePreferencesMutation();
  const types = isAuditor(user) ? auditorTypes : partyTypes;
  const muted = new Set(data?.mutedNotifications ?? []);

  function toggle(type: NotificationType, on: boolean) {
    const next = new Set(muted);
    if (on) next.delete(type);
    else next.add(type);
    update({ mutedNotifications: [...next] })
      .unwrap()
      .catch(() => toast.error("Couldn't save. Try again."));
  }

  return (
    <Section
      icon={BellIcon}
      title="In-app notifications"
      description="Choose what appears in the bell. Switched-off types aren't delivered at all."
    >
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {types.map((t) => (
            <Skeleton key={t.type} className="h-14" />
          ))}
        </div>
      ) : (
        <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {types.map((t) => {
            const id = `notify-${t.type}`;
            return (
              <li key={t.type} className="flex items-start justify-between gap-4 rounded-lg px-1 py-2.5">
                <label htmlFor={id} className="cursor-pointer">
                  <span className="block text-[13px] font-medium">{t.label}</span>
                  <span className="block text-xs text-muted-foreground">{t.hint}</span>
                </label>
                <Switch id={id} checked={!muted.has(t.type)} onCheckedChange={(on) => toggle(t.type, on)} />
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
