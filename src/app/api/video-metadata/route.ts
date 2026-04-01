import { NextResponse } from "next/server";

export async function GET() {
  // Mock API — in production this would query a database or CMS
  await new Promise((r) => setTimeout(r, 80));
  return NextResponse.json({
    src: "/video.mp4",
    background: "/background.jpg",
    title: "Trupeer Demo",
  });
}
