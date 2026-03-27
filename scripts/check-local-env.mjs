import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const envFiles = [".env.local", ".env.development.local", ".env.development", ".env"];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  const result = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

const mergedEnv = {};
const foundFiles = [];

for (const file of envFiles) {
  const fullPath = path.join(cwd, file);
  if (!fs.existsSync(fullPath)) {
    continue;
  }

  Object.assign(mergedEnv, parseEnvFile(fullPath));
  foundFiles.push(file);
}

const requiredForSupabase = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
];

const optionalForExtendedTests = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET_LIVE"
];

const missingSupabase = requiredForSupabase.filter((key) => !mergedEnv[key]);
const missingExtended = optionalForExtendedTests.filter((key) => !mergedEnv[key]);
const hasLegacyViteSupabaseKeys =
  Boolean(mergedEnv.VITE_SUPABASE_URL) || Boolean(mergedEnv.VITE_SUPABASE_ANON_KEY);

console.log("\n[local-check] Validando ambiente para testes locais...");

if (foundFiles.length > 0) {
  console.log(`[local-check] Arquivos detectados: ${foundFiles.join(", ")}`);
} else {
  console.log("[local-check] Nenhum arquivo .env detectado.");
}

if (missingSupabase.length === 0) {
  console.log("[local-check] Supabase público configurado: login e sessões podem ser testados.");
} else {
  console.log(
    `[local-check] Faltam variáveis para autenticação Supabase: ${missingSupabase.join(", ")}`
  );
}

if (missingExtended.length === 0) {
  console.log("[local-check] Admin e Stripe configurados para testes completos.");
} else {
  console.log(
    `[local-check] Testes avançados indisponíveis até preencher: ${missingExtended.join(", ")}`
  );
}

if (hasLegacyViteSupabaseKeys && missingSupabase.length > 0) {
  console.log(
    "[local-check] Foram encontradas chaves VITE_* antigas. Neste projeto Next.js, use NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local."
  );
}

if (!mergedEnv.NEXT_PUBLIC_SITE_URL && mergedEnv.FRONTEND_URL) {
  console.log(
    "[local-check] FRONTEND_URL foi encontrado, mas o app usa NEXT_PUBLIC_SITE_URL para links públicos."
  );
}

if (foundFiles.length === 0 || missingSupabase.length > 0) {
  console.log(
    "[local-check] Sugestão: copie .env.example para .env.local e preencha os valores necessários."
  );
}

