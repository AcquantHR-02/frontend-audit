"use client";

import { KeyRoundIcon, LockOpenIcon, PencilIcon, PlusIcon, PowerIcon, UsersIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  DataTable,
  DataTablePagination,
  DataTableToolbar,
  SortableHeader,
  type DataTableColumn,
} from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { RowActions } from "@/components/shared/row-actions";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatusChangeDialog } from "@/components/shared/status-change-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { activeOptions, toActiveParam, useUrlFilter } from "@/hooks/use-url-filter";
import { roleMeta } from "@/lib/domain";
import { formatDate, initials } from "@/lib/utils";
import type { ApiError } from "@/types/api";
import type { Role, UserView } from "@/types/domain";
import {
  useGetUsersQuery,
  useResetUserPasswordMutation,
  useSetUserStatusMutation,
  useUnlockUserMutation,
  type UserWithPassword,
} from "../api/users.api";
import { TemporaryPasswordDialog } from "./temporary-password-dialog";
import { UserFormDialog } from "./user-form-dialog";

const roleOptions = (Object.keys(roleMeta) as Role[]).map((r) => ({ value: r, label: roleMeta[r].label }));

export function UsersPage() {
  const me = useCurrentUser();
  const table = useTableUrlState("fullName,asc");
  const [role, setRole] = useUrlFilter("role", table.resetPage);
  const [status, setStatus] = useUrlFilter("status", table.resetPage);
  const { data, isLoading, isFetching } = useGetUsersQuery({
    ...table.request,
    role: (role || undefined) as Role | undefined,
    active: toActiveParam(status),
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserView | null>(null);
  const [statusTarget, setStatusTarget] = useState<UserView | null>(null);
  const [resetTarget, setResetTarget] = useState<UserView | null>(null);
  const [issued, setIssued] = useState<{ result: UserWithPassword; context: "created" | "reset" } | null>(null);

  const [setUserStatus, statusState] = useSetUserStatusMutation();
  const [resetPassword, resetState] = useResetUserPasswordMutation();
  const [unlockUser] = useUnlockUserMutation();

  async function handleUnlock(user: UserView) {
    try {
      await unlockUser(user.id).unwrap();
      toast.success("Account unlocked", { description: user.fullName });
    } catch (error) {
      toast.error((error as ApiError).message);
    }
  }

  const columns: DataTableColumn<UserView>[] = [
    {
      accessorKey: "fullName",
      header: ({ column }) => <SortableHeader column={column} title="User" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8">
            <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
              {initials(row.original.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="font-medium">
              {row.original.fullName}
              {row.original.id === me?.id && (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>
              )}
            </span>
            <span className="truncate text-xs text-muted-foreground">{row.original.email}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: ({ column }) => <SortableHeader column={column} title="Role" />,
      cell: ({ row }) => <StatusBadge meta={roleMeta[row.original.role]} dot={false} />,
      meta: { className: "w-44" },
    },
    {
      accessorKey: "scopeName",
      header: ({ column }) => <SortableHeader column={column} title="Scope" />,
      cell: ({ row }) =>
        row.original.scopeName ?? <span className="text-muted-foreground">All Principal Employers & vendors</span>,
      meta: { className: "w-56" },
    },
    {
      id: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.isLocked ? (
            <StatusBadge tone="danger" label="Locked" />
          ) : (
            <StatusBadge
              tone={row.original.isActive ? "success" : "neutral"}
              label={row.original.isActive ? "Active" : "Inactive"}
            />
          )}
          {row.original.mustChangePassword && row.original.isActive && (
            <StatusBadge tone="warning" label="Pending first sign-in" dot={false} />
          )}
        </div>
      ),
      meta: { className: "w-52" },
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => <SortableHeader column={column} title="Updated" />,
      cell: ({ row }) => <span className="text-muted-foreground tabular">{formatDate(row.original.updatedAt)}</span>,
      meta: { className: "w-32" },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      meta: { className: "w-12 text-right" },
      cell: ({ row }) => {
        const user = row.original;
        const isSelf = user.id === me?.id;
        return (
          <RowActions
            label={`Actions for ${user.fullName}`}
            actions={[
              {
                label: "Edit",
                icon: PencilIcon,
                onSelect: () => {
                  setEditing(user);
                  setFormOpen(true);
                },
              },
              { label: "Reset password", icon: KeyRoundIcon, hidden: isSelf, onSelect: () => setResetTarget(user) },
              {
                label: "Unlock account",
                icon: LockOpenIcon,
                hidden: !user.isLocked,
                onSelect: () => handleUnlock(user),
              },
              {
                label: user.isActive ? "Deactivate" : "Reactivate",
                icon: PowerIcon,
                destructive: user.isActive,
                separated: true,
                hidden: isSelf,
                onSelect: () => setStatusTarget(user),
              },
            ]}
          />
        );
      },
    },
  ];

  const hasFilters = !!(table.search || role || status);

  return (
    <>
      <PageHeader
        title="Users & access"
        description="All accounts are created here. There is no self sign-up; party users are scoped to one vendor or Principal Employer."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <PlusIcon /> Add user
          </Button>
        }
      />
      <div className="flex flex-col gap-3">
        <DataTableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search name, email or scope…"
          filters={
            <>
              <FilterSelect label="Role" value={role} onChange={setRole} options={roleOptions} />
              <FilterSelect label="Status" value={status} onChange={setStatus} options={activeOptions} />
            </>
          }
        />
        <DataTable
          columns={columns}
          data={data?.content}
          getRowId={(u) => u.id}
          isLoading={isLoading}
          isFetching={isFetching}
          sort={table.sort}
          onSortChange={table.setSort}
          empty={
            <EmptyState
              icon={UsersIcon}
              title={hasFilters ? "No users match your filters" : "No users yet"}
              className="rounded-none border-0"
            />
          }
        />
        {data && (
          <DataTablePagination
            page={table.page}
            size={table.size}
            totalElements={data.totalElements}
            totalPages={data.totalPages}
            onPageChange={table.setPage}
            onSizeChange={table.setSize}
            noun="users"
          />
        )}
      </div>

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editing}
        onCreated={(result) => setIssued({ result, context: "created" })}
      />
      <TemporaryPasswordDialog
        result={issued?.result ?? null}
        context={issued?.context ?? "created"}
        onClose={() => setIssued(null)}
      />

      <ConfirmDialog
        open={!!resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
        title="Reset password?"
        description={
          <p>
            <b className="text-foreground">{resetTarget?.fullName}</b>&apos;s current password stops working
            immediately. A temporary password is issued and must be changed at next sign-in. This also unlocks the
            account.
          </p>
        }
        confirmLabel="Reset password"
        isPending={resetState.isLoading}
        onConfirm={async () => {
          if (!resetTarget) return;
          try {
            const result = await resetPassword(resetTarget.id).unwrap();
            setResetTarget(null);
            setIssued({ result, context: "reset" });
          } catch (error) {
            toast.error((error as ApiError).message);
          }
        }}
      />

      <StatusChangeDialog
        target={statusTarget ? { name: statusTarget.fullName, isActive: statusTarget.isActive } : null}
        onClose={() => setStatusTarget(null)}
        entityLabel="user"
        deactivateNote={<p>They are signed out and can&apos;t sign in until reactivated.</p>}
        isPending={statusState.isLoading}
        onConfirm={async () => {
          if (!statusTarget) return;
          try {
            await setUserStatus({ id: statusTarget.id, isActive: !statusTarget.isActive }).unwrap();
            toast.success(statusTarget.isActive ? "User deactivated" : "User reactivated", {
              description: statusTarget.fullName,
            });
            setStatusTarget(null);
          } catch (error) {
            toast.error((error as ApiError).message);
          }
        }}
      />
    </>
  );
}
