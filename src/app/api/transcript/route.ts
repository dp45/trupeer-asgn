import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "transcript.json");
    const data = await readFile(filePath, "utf-8");
    const transcript = JSON.parse(data);
    // Simulate a slight network delay for realism
    await new Promise((r) => setTimeout(r, 120));
    return NextResponse.json(transcript);
  } catch {
    return NextResponse.json(
      { error: "Failed to load transcript" },
      { status: 500 }
    );
  }
}
