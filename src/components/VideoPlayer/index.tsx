"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { Transcript as TranscriptType, SkippedRange, Word } from "@/types/transcript";
import PlaybackControls from "@/components/Controls/PlaybackControls";
import StyleControls from "@/components/Controls/StyleControls";
import Transcript from "@/components/Transcript";

const ThreeCanvas = dynamic(() => import("./ThreeCanvas"), { ssr: false });

interface VideoPlayerProps {
  videoSrc: string;
  backgroundSrc: string;
  transcript: TranscriptType;
}

export default function VideoPlayer({
  videoSrc,
  backgroundSrc,
  transcript,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [padding, setPadding] = useState(10);
  const [borderRadius, setBorderRadius] = useState(8);
  const [skippedRanges, setSkippedRanges] = useState<SkippedRange[]>([]);

  const words: Word[] = transcript.words;

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  }, []);

  const seekToWord = useCallback((time: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = time;
  }, []);

  const handleSkip = useCallback((range: SkippedRange) => {
    setSkippedRanges((prev) => {
      const merged = [...prev, range].sort((a, b) => a.startTime - b.startTime);
      const result: SkippedRange[] = [];
      for (const r of merged) {
        if (result.length && r.startTime <= result[result.length - 1].endTime) {
          result[result.length - 1] = {
            ...result[result.length - 1],
            wordEndIdx: Math.max(result[result.length - 1].wordEndIdx, r.wordEndIdx),
            endTime: Math.max(result[result.length - 1].endTime, r.endTime),
          };
        } else {
          result.push(r);
        }
      }
      return result;
    });
  }, []);

  const handleUnskip = useCallback((range: SkippedRange) => {
    setSkippedRanges((prev) =>
      prev.filter(
        (r) => !(r.wordStartIdx === range.wordStartIdx && r.wordEndIdx === range.wordEndIdx)
      )
    );
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onEnded = () => setIsPlaying(false);
    v.addEventListener("ended", onEnded);
    return () => v.removeEventListener("ended", onEnded);
  }, []);

  return (
    <div className="flex h-full w-full overflow-hidden rounded-2xl bg-[#e8e8ee] shadow-2xl">
      {/* LEFT — Transcript + style controls */}
      <aside className="flex flex-col w-80 min-w-[240px] shrink-0 border-r border-black/8 p-5 overflow-hidden bg-white">
        <div className="flex-1 overflow-hidden">
          <Transcript
            words={words}
            videoRef={videoRef}
            skippedRanges={skippedRanges}
            onSkip={handleSkip}
            onUnskip={handleUnskip}
            onSeekToWord={seekToWord}
          />
        </div>

        <div className="mt-4 space-y-4 border-t border-black/8 pt-4">
          <StyleControls
            padding={padding}
            borderRadius={borderRadius}
            onPaddingChange={setPadding}
            onBorderRadiusChange={setBorderRadius}
          />
        </div>
      </aside>

      {/* RIGHT — Canvas + Playback Controls stacked */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Three.js canvas */}
        <main className="flex-1 relative overflow-hidden" ref={containerRef}>
          {/* Hidden video element — Three.js reads from it */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            src={videoSrc}
            playsInline
            preload="auto"
            crossOrigin="anonymous"
            className="absolute opacity-0 pointer-events-none w-px h-px"
          />
          <ThreeCanvas
            videoRef={videoRef}
            backgroundSrc={backgroundSrc}
            padding={padding}
            borderRadius={borderRadius}
            containerRef={containerRef}
          />
        </main>

        {/* Playback controls — sits below the canvas */}
        <PlaybackControls
          videoRef={videoRef}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
        />
      </div>
    </div>
  );
}
