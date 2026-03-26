import { createBrowserClient } from "@supabase/ssr";

// Retorna null durante SSR ou quando as variáveis de ambiente não estão configuradas
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createBrowserClient(url, key);
}

export type SupabaseClientType = NonNullable<ReturnType<typeof createClient>>;
