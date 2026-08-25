import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const newPassword = process.env.RESET_PASSWORD;
const userId = process.argv[2];

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL tidak ditemukan.");
}

if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY tidak ditemukan.");
}

if (!userId) {
  throw new Error("User ID Super Admin belum diberikan.");
}

if (!newPassword || newPassword.length < 12) {
  throw new Error("Password baru minimal 12 karakter.");
}

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

const { data, error } = await supabase.auth.admin.updateUserById(
  userId,
  {
    password: newPassword,
  },
);

if (error) {
  console.error("Gagal reset password:", error.message);
  process.exit(1);
}

console.log(`Password berhasil direset untuk: ${data.user.email}`);