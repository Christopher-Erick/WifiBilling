import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  const file = path.join(process.cwd(), "docs", "openapi.yaml");
  if (!fs.existsSync(file)) {
    return NextResponse.json({ error: "OpenAPI spec not generated yet" }, { status: 404 });
  }
  const yaml = fs.readFileSync(file, "utf8");
  return new NextResponse(yaml, { headers: { "content-type": "text/yaml; charset=utf-8" } });
}
