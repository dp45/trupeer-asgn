"use client";

import { useEffect, useRef, useCallback } from "react";

interface PlaybackControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

const TICK_INTERVAL = 15; // seconds between timeline markers

export default function PlaybackControls({
  videoRef,
  isPlaying,
  onTogglePlay,
}: PlaybackControlsProps) {
  const sliderRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const ticksRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const durationRef = useRef(0);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // Build tick marks once duration is known
  const buildTicks = useCallback((duration: number) => {
    const container = ticksRef.current;
    if (!container || duration <= 0) return;
    container.innerHTML = "";

    const count = Math.floor(duration / TICK_INTERVAL);
    for (let i = 0; i <= count; i++) {
      const t = i * TICK_INTERVAL;
      const pct = (t / duration) * 100;

      const tick = document.createElement("div");
      tick.className = "absolute flex flex-col items-center";
      tick.style.left = `${pct}%`;
      tick.style.transform = "translateX(-50%)";

      const line = document.createElement("div");
      line.className = "w-px bg-black/20";
      line.style.height = "8px";

      const label = document.createElement("span");
      label.className = "text-[10px] text-black/40 mt-0.5 tabular-nums";
      label.textContent = fmt(t);

      tick.appendChild(line);
      tick.appendChild(label);
      container.appendChild(tick);
    }
  }, []);

  // rAF loop
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function tick() {
      if (!isDraggingRef.current && video!.duration) {
        const pct = (video!.currentTime / video!.duration) * 100;

        if (sliderRef.current) sliderRef.current.value = String(pct);
        if (fillRef.current) fillRef.current.style.width = `${pct}%`;
        if (thumbRef.current) thumbRef.current.style.left = `${pct}%`;
        if (timeRef.current) {
          timeRef.current.textContent = `${fmt(video!.currentTime)} / ${fmt(video!.duration)}`;
        }

        // Build ticks once
        if (durationRef.current !== video!.duration) {
          durationRef.current = video!.duration;
          buildTicks(video!.duration);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [videoRef, buildTicks]);

  const handleScrub = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const video = videoRef.current;
      if (!video || !video.duration) return;
      const pct = parseFloat(e.target.value);
      video.currentTime = (pct / 100) * video.duration;
      if (fillRef.current) fillRef.current.style.width = `${pct}%`;
      if (thumbRef.current) thumbRef.current.style.left = `${pct}%`;
    },
    [videoRef]
  );

  return (
    <div className="flex flex-col w-full bg-white border-t border-black/8">
      {/* Top row: play button + time */}
      <div className="flex items-center justify-center gap-3 pt-3 pb-2">
        <button
          onClick={onTogglePlay}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-500 transition-colors shrink-0 shadow"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white translate-x-0.5">
              <path d="M6 4l15 8-15 8V4z" />
            </svg>
          )}
        </button>

        <span ref={timeRef} className="text-sm font-medium text-black/70 tabular-nums">
          00:00 / 00:00
        </span>
      </div>

      {/* Timeline area */}
      <div className="relative px-6 pb-5">
        {/* Track background */}
        <div className="relative h-1.5 bg-black/10 rounded-full">
          {/* Filled portion */}
          <div
            ref={fillRef}
            className="absolute left-0 top-0 h-full bg-violet-500 rounded-full pointer-events-none"
            style={{ width: "0%" }}
          />
          {/* Thumb dot */}
          <div
            ref={thumbRef}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-violet-600 border-2 border-white shadow pointer-events-none z-10"
            style={{ left: "0%" }}
          />
          {/* Invisible range input on top */}
          <input
            ref={sliderRef}
            type="range"
            min={0}
            max={100}
            step={0.01}
            defaultValue={0}
            onMouseDown={() => (isDraggingRef.current = true)}
            onMouseUp={() => (isDraggingRef.current = false)}
            onTouchStart={() => (isDraggingRef.current = true)}
            onTouchEnd={() => (isDraggingRef.current = false)}
            onChange={handleScrub}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            style={{ margin: 0 }}
          />
        </div>

        {/* Tick marks + labels */}
        <div ref={ticksRef} className="relative mt-1" style={{ height: "22px" }} />
      </div>
    </div>
  );
}
