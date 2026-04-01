import { readFile } from "fs/promises";
import path from "path";
import VideoPlayer from "@/components/VideoPlayer";
import { Transcript } from "@/types/transcript";

// Force SSR — transcript is loaded server-side, never statically pre-rendered
export const dynamic = "force-dynamic";

async function getTranscript(): Promise<Transcript> {
  const filePath = path.join(process.cwd(), "public", "transcript.json");
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

export default async function Home() {
  const transcript = await getTranscript();

  return (
    <div className="min-h-screen bg-[white] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-6xl h-[80vh] min-h-[540px]">
        <VideoPlayer
          videoSrc="/video.mp4"
          backgroundSrc="/background.jpg"
          transcript={transcript}
        />
      </div>
    </div>
  );
}
