"use client";

import { useEffect, useRef, useCallback } from "react";

interface PlaybackControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export default function PlaybackControls({
  videoRef,
  isPlaying,
  onTogglePlay,
}: PlaybackControlsProps) {
  const sliderRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number>(0);
  const isDraggingRef = useRef(false);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // rAF loop to update slider and time display without React state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function tick() {
      if (!isDraggingRef.current && video!.duration) {
        const pct = (video!.currentTime / video!.duration) * 100;
        if (sliderRef.current) sliderRef.current.value = String(pct);
        if (timeRef.current) {
          timeRef.current.textContent = `${fmt(video!.currentTime)} / ${fmt(
            video!.duration
          )}`;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [videoRef]);

  const handleScrub = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const video = videoRef.current;
      if (!video || !video.duration) return;
      const pct = parseFloat(e.target.value);
      video.currentTime = (pct / 100) * video.duration;
    },
    [videoRef]
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Timeline slider */}
      <input
        ref={sliderRef}
        type="range"
        min={0}
        max={100}
        step={0.1}
        defaultValue={0}
        onMouseDown={() => (isDraggingRef.current = true)}
        onMouseUp={() => (isDraggingRef.current = false)}
        onTouchStart={() => (isDraggingRef.current = true)}
        onTouchEnd={() => (isDraggingRef.current = false)}
        onChange={handleScrub}
        className="w-full h-1.5 rounded-full accent-violet-500 bg-white/20 cursor-pointer"
      />

      <div className="flex items-center gap-3">
        {/* Play / Pause */}
        <button
          onClick={onTogglePlay}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-500 transition-colors shrink-0"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4 text-black"
            >
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4 text-black translate-x-0.5"
            >
              <path d="M6 4l15 8-15 8V4z" />
            </svg>
          )}
        </button>

        {/* Time */}
        <span
          ref={timeRef}
          className="text-xs text-black/60 tabular-nums"
        >
          0:00 / 0:00
        </span>
      </div>
    </div>
  );
}
