import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isAuthorizationFailure,
  requireAdminPermission,
  validateMutationOrigin,
} from "@/lib/admin/auth";
import { parseNotificationListParams } from "@/lib/admin/notifications";

const mutationSchema = z.object({
  id: z.uuid().optional(),
  ids: z.array(z.uuid()).min(1).max(100).optional(),
  action: z.enum(["read", "unread", "archive", "restore"]).optional(),
  all: z.boolean().optional(),
});

const deleteSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(100),
  confirm: z.literal(true),
});

function uniqueIds(id?: string, ids?: string[]) {
  return [...new Set([...(id ? [id] : []), ...(ids ?? [])])];
}

export async function GET(request: Request) {
  const auth = await requireAdminPermission("dashboard.read");

  if (isAuthorizationFailure(auth)) {
    return auth;
  }

  const { error: reminderError } = await auth.supabase.rpc(
    "refresh_my_admin_reminders",
  );

  if (reminderError) {
    console.error("[admin:notifications] reminder refresh failed", {
      code: reminderError.code,
      message: reminderError.message,
      details: reminderError.details,
      hint: reminderError.hint,
    });
  }

  const url = new URL(request.url);
  const { page, pageSize, type, read, status, q } =
    parseNotificationListParams(url.searchParams);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let listQuery = auth.supabase
    .from("notifications")
    .select(
      "id,title,body,link_url,read_at,status,type,source_type,source_id,metadata,created_at,updated_at",
      { count: "exact" },
    )
    .eq("user_id", auth.user.id)
    .eq("status", status);

  if (type) {
    listQuery = listQuery.eq("type", type);
  }

  if (read === "unread") {
    listQuery = listQuery.is("read_at", null);
  } else if (read === "read") {
    listQuery = listQuery.not("read_at", "is", null);
  }

  if (q) {
    listQuery = listQuery.or(`title.ilike.%${q}%,body.ilike.%${q}%`);
  }

  const [listResult, unreadResult, activeResult, archivedResult] =
    await Promise.all([
      listQuery.order("created_at", { ascending: false }).range(from, to),
      auth.supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", auth.user.id)
        .eq("status", "active")
        .is("read_at", null),
      auth.supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", auth.user.id)
        .eq("status", "active"),
      auth.supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", auth.user.id)
        .eq("status", "archived"),
    ]);

  const error =
    listResult.error ??
    unreadResult.error ??
    activeResult.error ??
    archivedResult.error;

  if (error) {
    console.error("[admin:notifications] list failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return NextResponse.json(
      { message: "Notifikasi tidak dapat dimuat" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: listResult.data ?? [],
    count: listResult.count ?? 0,
    unread: unreadResult.count ?? 0,
    activeCount: activeResult.count ?? 0,
    archivedCount: archivedResult.count ?? 0,
    page,
    pageSize,
    status,
    q,
  });
}

export async function PATCH(request: Request) {
  if (!validateMutationOrigin(request)) {
    return NextResponse.json(
      { message: "Origin tidak valid" },
      { status: 403 },
    );
  }

  const auth = await requireAdminPermission("dashboard.read");

  if (isAuthorizationFailure(auth)) {
    return auth;
  }

  const body = await request.json().catch(() => ({}));
  const parsed = mutationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Perubahan notifikasi tidak valid",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const action = parsed.data.action ?? "read";
  const ids = uniqueIds(parsed.data.id, parsed.data.ids);
  const updateAll = parsed.data.all === true;

  if (updateAll && action !== "read") {
    return NextResponse.json(
      { message: "Aksi massal tanpa pilihan hanya tersedia untuk tandai dibaca" },
      { status: 422 },
    );
  }

  if (!updateAll && ids.length === 0) {
    return NextResponse.json(
      { message: "Pilih setidaknya satu notifikasi" },
      { status: 422 },
    );
  }

  const sourceStatus = action === "restore" ? "archived" : "active";
  const values =
    action === "archive"
      ? { status: "archived" }
      : action === "restore"
        ? { status: "active" }
        : { read_at: action === "unread" ? null : new Date().toISOString() };

  let query = auth.supabase
    .from("notifications")
    .update(values)
    .eq("user_id", auth.user.id)
    .eq("status", sourceStatus);

  if (updateAll) {
    query = query.is("read_at", null);
  } else {
    query = query.in("id", ids);
  }

  const { data, error } = await query.select("id");

  if (error) {
    console.error("[admin:notifications] update failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return NextResponse.json(
      { message: "Notifikasi tidak dapat diperbarui" },
      { status: 500 },
    );
  }

  const [unreadResult, activeResult, archivedResult] = await Promise.all([
    auth.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.user.id)
      .eq("status", "active")
      .is("read_at", null),
    auth.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.user.id)
      .eq("status", "active"),
    auth.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.user.id)
      .eq("status", "archived"),
  ]);

  const countError =
    unreadResult.error ?? activeResult.error ?? archivedResult.error;

  if (countError) {
    console.error("[admin:notifications] count after update failed", {
      code: countError.code,
      message: countError.message,
    });
  }

  return NextResponse.json({
    success: true,
    affected: data?.length ?? 0,
    unread: unreadResult.count ?? 0,
    activeCount: activeResult.count ?? 0,
    archivedCount: archivedResult.count ?? 0,
  });
}

export async function DELETE(request: Request) {
  if (!validateMutationOrigin(request)) {
    return NextResponse.json(
      { message: "Origin tidak valid" },
      { status: 403 },
    );
  }

  const auth = await requireAdminPermission("dashboard.read");

  if (isAuthorizationFailure(auth)) {
    return auth;
  }

  const body = await request.json().catch(() => ({}));
  const parsed = deleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Konfirmasi dan daftar notifikasi wajib diisi",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const now = new Date().toISOString();
  const { data, error } = await auth.supabase
    .from("notifications")
    .update({
      title: "Notifikasi dihapus",
      body: null,
      link_url: null,
      read_at: now,
      status: "deleted",
      type: "system",
      source_type: null,
      source_id: null,
      metadata: {},
      deleted_at: now,
    })
    .eq("user_id", auth.user.id)
    .eq("status", "archived")
    .in("id", [...new Set(parsed.data.ids)])
    .select("id");

  if (error) {
    console.error("[admin:notifications] permanent delete failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return NextResponse.json(
      { message: "Notifikasi tidak dapat dihapus permanen" },
      { status: 500 },
    );
  }

  const [unreadResult, activeResult, archivedResult] = await Promise.all([
    auth.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.user.id)
      .eq("status", "active")
      .is("read_at", null),
    auth.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.user.id)
      .eq("status", "active"),
    auth.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.user.id)
      .eq("status", "archived"),
  ]);

  return NextResponse.json({
    success: true,
    affected: data?.length ?? 0,
    unread: unreadResult.count ?? 0,
    activeCount: activeResult.count ?? 0,
    archivedCount: archivedResult.count ?? 0,
  });
}
