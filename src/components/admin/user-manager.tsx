"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, MailPlus, RefreshCw, Save, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminRoleOptions } from "@/lib/permissions/roles";

type MinistryOption = { id: string; name: string };

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  status: string;
  role: string | null;
  roleName: string | null;
  ministryId: string | null;
  invitedAt: string | null;
  lastSignInAt: string | null;
  createdAt: string;
  isCurrentUser: boolean;
};

type UserUpdate = {
  role: string;
  ministryId: string;
  status: string;
};

export function UserManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [ministries, setMinistries] = useState<MinistryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState("editor");

  async function load() {
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/admin/users", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));

    if (response.ok) {
      setUsers(result.data ?? []);
      setMinistries(result.ministries ?? []);
    } else {
      setUsers([]);
      setMinistries([]);
      setMessage(result.message ?? "Pengguna tidak dapat dimuat");
    }

    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving("invite");
    setMessage(null);

    const values = Object.fromEntries(new FormData(formElement));
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json().catch(() => ({}));

    if (response.ok) {
      setUsers((current) => [result.data, ...current]);
      formElement.reset();
      setInviteRole("editor");
      setMessage("Undangan admin berhasil dikirim.");
    } else {
      setMessage(result.message ?? "Undangan gagal");
    }

    setSaving(null);
  }

  async function update(user: UserRow, values: UserUpdate) {
    setSaving(user.id);
    setMessage(null);

    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json().catch(() => ({}));

    if (response.ok) {
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id
            ? {
                ...item,
                role: values.role,
                ministryId:
                  values.role === "department_admin"
                    ? values.ministryId
                    : null,
                status: values.status,
              }
            : item,
        ),
      );
      setMessage("Pengguna berhasil diperbarui.");
    } else {
      setMessage(result.message ?? "Perubahan gagal");
    }

    setSaving(null);
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={invite}
        className="grid gap-4 rounded-2xl border border-primary/10 bg-white p-5 xl:grid-cols-[1fr_1fr_220px_240px_auto] xl:items-end"
      >
        <label className="text-sm font-semibold text-primary">
          Nama lengkap
          <Input
            name="fullName"
            required
            minLength={2}
            className="mt-2 bg-cream"
          />
        </label>
        <label className="text-sm font-semibold text-primary">
          Email
          <Input
            name="email"
            type="email"
            required
            className="mt-2 bg-cream"
          />
        </label>
        <label className="text-sm font-semibold text-primary">
          Role
          <select
            name="role"
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value)}
            required
            className="mt-2 h-12 w-full rounded-xl border border-primary/15 bg-cream px-3"
          >
            {adminRoleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-primary">
          Departemen
          <select
            name="ministryId"
            defaultValue=""
            required={inviteRole === "department_admin"}
            disabled={inviteRole !== "department_admin"}
            className="mt-2 h-12 w-full rounded-xl border border-primary/15 bg-cream px-3 disabled:opacity-50"
          >
            <option value="">Pilih departemen</option>
            {ministries.map((ministry) => (
              <option key={ministry.id} value={ministry.id}>
                {ministry.name}
              </option>
            ))}
          </select>
        </label>
        <Button disabled={saving === "invite"}>
          {saving === "invite" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MailPlus className="size-4" />
          )}
          Kirim Undangan
        </Button>
      </form>

      {message && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-primary/10 bg-white">
        <div className="flex items-center justify-between border-b border-primary/10 p-5">
          <div>
            <h2 className="font-serif text-2xl text-primary">Akun Admin</h2>
            <p className="text-xs text-muted">
              {users.length} akun pada halaman ini
            </p>
          </div>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => void load()}
            aria-label="Muat ulang"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left">
            <thead className="bg-cream text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-4">Pengguna</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Departemen</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Login Terakhir</th>
                <th className="px-5 py-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/8">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center">
                    <Loader2 className="mx-auto size-5 animate-spin text-secondary" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-sm text-muted">
                    Belum ada data pengguna atau Supabase belum dikonfigurasi.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <UserRowEditor
                    key={user.id}
                    user={user}
                    ministries={ministries}
                    saving={saving === user.id}
                    onSave={(values) => void update(user, values)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UserRowEditor({
  user,
  ministries,
  saving,
  onSave,
}: {
  user: UserRow;
  ministries: MinistryOption[];
  saving: boolean;
  onSave: (values: UserUpdate) => void;
}) {
  const [role, setRole] = useState(user.role ?? "editor");
  const [ministryId, setMinistryId] = useState(user.ministryId ?? "");
  const [status, setStatus] = useState(user.status);
  const departmentRole = role === "department_admin";
  const changed =
    role !== user.role ||
    status !== user.status ||
    (departmentRole ? ministryId !== (user.ministryId ?? "") : Boolean(user.ministryId));

  return (
    <tr>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-cream text-secondary">
            <ShieldCheck className="size-4" />
          </span>
          <div>
            <p className="font-semibold text-primary">
              {user.fullName || "Tanpa nama"}
              {user.isCurrentUser && (
                <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-secondary">
                  Akun Anda
                </span>
              )}
            </p>
            <p className="text-xs text-muted">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <select
          value={role}
          disabled={user.isCurrentUser}
          aria-label={`Role untuk ${user.fullName || user.email}`}
          onChange={(event) => {
            const nextRole = event.target.value;
            setRole(nextRole);
            if (nextRole !== "department_admin") {
              setMinistryId("");
            }
          }}
          className="h-10 rounded-lg border border-primary/15 px-2 text-sm"
        >
          {adminRoleOptions.map((roleOption) => (
            <option key={roleOption.value} value={roleOption.value}>
              {roleOption.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-5 py-4">
        <select
          value={ministryId}
          onChange={(event) => setMinistryId(event.target.value)}
          disabled={!departmentRole || user.isCurrentUser}
          aria-label={`Departemen untuk ${user.fullName || user.email}`}
          className="h-10 min-w-48 rounded-lg border border-primary/15 px-2 text-sm disabled:opacity-50"
        >
          <option value="">Pilih departemen</option>
          {ministries.map((ministry) => (
            <option key={ministry.id} value={ministry.id}>
              {ministry.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-5 py-4">
        <select
          value={status}
          disabled={user.isCurrentUser}
          aria-label={`Status untuk ${user.fullName || user.email}`}
          onChange={(event) => setStatus(event.target.value)}
          className="h-10 rounded-lg border border-primary/15 px-2 text-sm"
        >
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </td>
      <td className="px-5 py-4 text-xs text-muted">
        {user.lastSignInAt
          ? new Date(user.lastSignInAt).toLocaleString("id-ID")
          : "Belum pernah"}
      </td>
      <td className="px-5 py-4">
        <Button
          className="h-9"
          variant="secondary"
          disabled={
            saving ||
            user.isCurrentUser ||
            !changed ||
            (departmentRole && !ministryId)
          }
          onClick={() =>
            onSave({
              role,
              ministryId: departmentRole ? ministryId : "",
              status,
            })
          }
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Simpan
        </Button>
      </td>
    </tr>
  );
}
