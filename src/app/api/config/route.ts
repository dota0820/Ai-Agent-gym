import { connection } from "next/server";
import { OPENROUTER_MODEL } from "@/lib/openrouter";

export async function GET() {
  await connection();
  const provider = process.env.OPENROUTER_API_KEY
    ? "openrouter"
    : process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN
      ? "anthropic"
      : "none";
  return Response.json({
    provider,
    defaultModel: provider === "openrouter" ? OPENROUTER_MODEL : null,
  });
}
