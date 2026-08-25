"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminRoleOptions } from "@/lib/permissions/roles";

type MinistryOption = { id: string; name: string };

type UserRow = {
  id: string;
  username: string;
  fullName: string;
  status: string;
  role: string | null;
  roleName: string | null;
  ministryId: string | null;
  lastSignInAt: string | null;
  createdAt: string;
  isCurrentUser: boolean;
};

type UserUpdate = {
  role: string;
  ministryId: string;
  status: string;
};

type ApiResult = {
  message?: string;
  data?: UserRow;
};

type UserListApiResult = {
  message?: string;
  data?: UserRow[];
  ministries?: MinistryOption[];
};

export function UserManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [ministries, setMinistries] = useState<MinistryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [createRole, setCreateRole] = useState("editor");
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);

  async function load() {
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/admin/users", { cache: "no-store" });
    const result = (await response.json().catch(() => ({}))) as UserListApiResult;

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

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving("create");
    setMessage(null);

    const values = Object.fromEntries(new FormData(formElement));
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = (await response.json().catch(() => ({}))) as ApiResult;

    if (response.ok && result.data) {
      const createdUser = result.data;
      setUsers((current) => [createdUser, ...current]);
      formElement.reset();
      setCreateRole("editor");
      setShowCreatePassword(false);
      setMessage(
        `Akun @${createdUser.username} berhasil dibuat dan langsung aktif.`,
      );
    } else {
      setMessage(result.message ?? "Akun tidak dapat dibuat");
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
    const result = (await response.json().catch(() => ({}))) as ApiResult;

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

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetTarget) return;

    const formElement = event.currentTarget;
    const values = Object.fromEntries(new FormData(formElement));
    setSaving(`password:${resetTarget.id}`);
    setMessage(null);

    const response = await fetch(
      `/api/admin/users/${resetTarget.id}/password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    );
    const result = (await response.json().catch(() => ({}))) as ApiResult;

    if (response.ok) {
      setMessage(`Kata sandi @${resetTarget.username} berhasil direset.`);
      setResetTarget(null);
      setShowResetPassword(false);
      formElement.reset();
    } else {
      setMessage(result.message ?? "Kata sandi tidak dapat direset");
    }

    setSaving(null);
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={createUser}
        className="grid gap-4 rounded-2xl border border-primary/10 bg-white p-5 md:grid-cols-2 xl:grid-cols-3"
      >
        <div className="md:col-span-2 xl:col-span-3">
          <h2 className="font-serif text-2xl text-primary">Buat Akun Admin</h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            Akun langsung aktif. Tidak ada undangan email. Bagikan username dan kata sandi melalui saluran yang aman.
          </p>
        </div>

        <label className="text-sm font-semibold text-primary">
          Nama lengkap
          <Input
            name="fullName"
            required
            minLength={2}
            maxLength={100}
            className="mt-2 bg-cream"
          />
        </label>

        <label className="text-sm font-semibold text-primary">
          Username
          <Input
            name="username"
            required
            minLength={3}
            maxLength={32}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            placeholder="contoh: budi.musik"
            className="mt-2 bg-cream"
          />
          <span className="mt-1 block text-[11px] font-normal text-muted">
            Huruf kecil, angka, titik, garis bawah, atau tanda hubung.
          </span>
        </label>

        <label className="text-sm font-semibold text-primary">
          Role
          <select
            name="role"
            value={createRole}
            onChange={(event) => setCreateRole(event.target.value)}
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
          Kata sandi
          <span className="relative mt-2 block">
            <Input
              name="password"
              type={showCreatePassword ? "text" : "password"}
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              className="bg-cream pr-12"
            />
            <button
              type="button"
              onClick={() => setShowCreatePassword((value) => !value)}
              className="absolute right-1 top-1 grid size-10 place-items-center rounded-lg text-muted hover:bg-white"
              aria-label={
                showCreatePassword
                  ? "Sembunyikan kata sandi"
                  : "Tampilkan kata sandi"
              }
            >
              {showCreatePassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </span>
          <span className="mt-1 block text-[11px] font-normal text-muted">
            Minimal 12 karakter, huruf besar, huruf kecil, dan angka.
          </span>
        </label>

        <label className="text-sm font-semibold text-primary">
          Konfirmasi kata sandi
          <Input
            name="confirmation"
            type={showCreatePassword ? "text" : "password"}
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            className="mt-2 bg-cream"
          />
        </label>

        <label className="text-sm font-semibold text-primary">
          Departemen
          <select
            name="ministryId"
            defaultValue=""
            required={createRole === "department_admin"}
            disabled={createRole !== "department_admin"}
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

        <div className="flex items-end md:col-span-2 xl:col-span-3">
          <Button type="submit" disabled={saving === "create"}>
            {saving === "create" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserPlus className="size-4" />
            )}
            Buat Akun
          </Button>
        </div>
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
          <table className="w-full min-w-[1100px] text-left">
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
                    onResetPassword={() => setResetTarget(user)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {resetTarget && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-primary/55 p-5 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setResetTarget(null);
          }}
        >
          <form
            onSubmit={resetPassword}
            className="w-full max-w-md rounded-3xl border border-primary/10 bg-white p-7 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-secondary">
                  Reset Password
                </p>
                <h2 className="mt-2 font-serif text-3xl text-primary">
                  @{resetTarget.username}
                </h2>
                <p className="mt-2 text-sm text-muted">
                  Password lama tidak dapat dilihat. Masukkan password baru untuk akun ini.
                </p>
              </div>
              <button
                type="button"
                className="grid size-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-cream"
                onClick={() => setResetTarget(null)}
                aria-label="Tutup"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-7 space-y-5">
              <label className="block text-sm font-semibold text-primary">
                Kata sandi baru
                <span className="relative mt-2 block">
                  <Input
                    name="password"
                    type={showResetPassword ? "text" : "password"}
                    required
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword((value) => !value)}
                    className="absolute right-1 top-1 grid size-10 place-items-center rounded-lg text-muted hover:bg-cream"
                    aria-label={
                      showResetPassword
                        ? "Sembunyikan kata sandi"
                        : "Tampilkan kata sandi"
                    }
                  >
                    {showResetPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </span>
              </label>

              <label className="block text-sm font-semibold text-primary">
                Konfirmasi kata sandi baru
                <Input
                  name="confirmation"
                  type={showResetPassword ? "text" : "password"}
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  className="mt-2"
                />
              </label>

              <p className="text-xs leading-5 text-muted">
                Minimal 12 karakter dengan huruf besar, huruf kecil, dan angka.
              </p>

              <Button
                type="submit"
                className="w-full"
                disabled={saving === `password:${resetTarget.id}`}
              >
                {saving === `password:${resetTarget.id}` ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <KeyRound className="size-4" />
                )}
                Simpan Password Baru
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function UserRowEditor({
  user,
  ministries,
  saving,
  onSave,
  onResetPassword,
}: {
  user: UserRow;
  ministries: MinistryOption[];
  saving: boolean;
  onSave: (values: UserUpdate) => void;
  onResetPassword: () => void;
}) {
  const [role, setRole] = useState(user.role ?? "editor");
  const [ministryId, setMinistryId] = useState(user.ministryId ?? "");
  const [status, setStatus] = useState(user.status);
  const departmentRole = role === "department_admin";
  const changed =
    role !== user.role ||
    status !== user.status ||
    (departmentRole
      ? ministryId !== (user.ministryId ?? "")
      : Boolean(user.ministryId));

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
            <p className="text-xs text-muted">@{user.username || "username-belum-ada"}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <select
          value={role}
          disabled={user.isCurrentUser}
          aria-label={`Role untuk ${user.fullName || user.username}`}
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
          aria-label={`Departemen untuk ${user.fullName || user.username}`}
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
          aria-label={`Status untuk ${user.fullName || user.username}`}
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
        <div className="flex min-w-max gap-2">
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

          <Button
            className="h-9"
            variant="secondary"
            onClick={onResetPassword}
          >
            <KeyRound className="size-4" />
            Reset Password
          </Button>
        </div>
      </td>
    </tr>
  );
}
