import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";
import { env, hasServiceRole, hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@supabase/supabase-js";

export async function createSupabaseServerClient() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: true
    },
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        cookieStore.set(name, value, options);
      },
      remove(name: string, options: Record<string, unknown>) {
        cookieStore.set(name, "", { ...options, maxAge: 0 });
      }
    }
  });
}

export function createSupabaseAdminClient() {
  if (!hasServiceRole()) {
    return null;
  }

  return createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

