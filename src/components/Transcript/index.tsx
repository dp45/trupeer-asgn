"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  memo,
} from "react";
import { Word, SkippedRange } from "@/types/transcript";

interface TranscriptProps {
  words: Word[];
  videoRef: React.RefObject<HTMLVideoElement | null>;
  skippedRanges: SkippedRange[];
  onSkip: (range: SkippedRange) => void;
  onUnskip: (range: SkippedRange) => void;
  onSeekToWord: (time: number) => void;
}

// Check if a word index falls inside any skipped range
function getSkippedRange(
  idx: number,
  ranges: SkippedRange[]
): SkippedRange | null {
  for (const r of ranges) {
    if (idx >= r.wordStartIdx && idx <= r.wordEndIdx) return r;
  }
  return null;
}

interface WordProps {
  word: Word;
  idx: number;
  isActive: boolean;
  skipped: SkippedRange | null;
  onWordClick: (idx: number, time: number) => void;
}

const WordToken = memo(function WordToken({
  word,
  idx,
  isActive,
  skipped,
  onWordClick,
}: WordProps) {
  if (word.type === "spacing") {
    return <span> </span>;
  }

  return (
    <span
      data-idx={idx}
      data-start={word.start}
      onClick={() => onWordClick(idx, word.start)}
      className={[
        "cursor-pointer rounded px-0.5 transition-colors duration-100",
        isActive
          ? "bg-violet-500 text-white"
          : "hover:bg-white/10",
        skipped
          ? "line-through opacity-40 cursor-default"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {word.text}
    </span>
  );
});

export default function Transcript({
  words,
  videoRef,
  skippedRanges,
  onSkip,
  onUnskip,
  onSeekToWord,
}: TranscriptProps) {
  const [activeIdx, setActiveIdx] = useState(-1);
  const [selectionInfo, setSelectionInfo] = useState<{
    range: SkippedRange;
    x: number;
    y: number;
  } | null>(null);
  const activeIdxRef = useRef(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  // rAF loop: read currentTime, find active word, only update state when it changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function tick() {
      const t = video!.currentTime;
      // Binary search for current word
      let lo = 0;
      let hi = words.length - 1;
      let found = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const w = words[mid];
        if (w.start <= t && t < w.end) {
          found = mid;
          break;
        } else if (w.end <= t) {
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }

      // Handle skip: if currentTime is inside a skipped range, jump past it
      for (const r of skippedRanges) {
        if (t >= r.startTime && t < r.endTime) {
          video!.currentTime = r.endTime;
          break;
        }
      }

      if (found !== activeIdxRef.current) {
        activeIdxRef.current = found;
        setActiveIdx(found);
        // Auto-scroll the active word into view
        if (found >= 0 && containerRef.current) {
          const el = containerRef.current.querySelector(
            `[data-idx="${found}"]`
          ) as HTMLElement | null;
          el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [words, videoRef, skippedRanges]);

  const handleWordClick = useCallback(
    (idx: number, time: number) => {
      const sr = getSkippedRange(idx, skippedRanges);
      if (sr) return; // skipped — ignore click
      onSeekToWord(time);
    },
    [onSeekToWord, skippedRanges]
  );

  // Handle text selection for skip/unskip
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelectionInfo(null);
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      // Find the word spans that are selected
      const range = selection.getRangeAt(0);
      const spans = Array.from(
        container.querySelectorAll("[data-idx]")
      ) as HTMLElement[];

      let startIdx = Infinity;
      let endIdx = -Infinity;

      for (const span of spans) {
        if (range.intersectsNode(span)) {
          const idx = parseInt(span.dataset.idx!, 10);
          if (idx < startIdx) startIdx = idx;
          if (idx > endIdx) endIdx = idx;
        }
      }

      if (startIdx === Infinity || endIdx === -Infinity) {
        setSelectionInfo(null);
        return;
      }

      // Only include actual "word" type words for time range
      const startWord = words[startIdx];
      const endWord = words[endIdx];

      const skipRange: SkippedRange = {
        wordStartIdx: startIdx,
        wordEndIdx: endIdx,
        startTime: startWord.start,
        endTime: endWord.end,
      };

      setSelectionInfo({
        range: skipRange,
        x: e.clientX,
        y: e.clientY,
      });
    },
    [words]
  );

  const handleSkipClick = useCallback(() => {
    if (!selectionInfo) return;
    onSkip(selectionInfo.range);
    setSelectionInfo(null);
    window.getSelection()?.removeAllRanges();
  }, [selectionInfo, onSkip]);

  const handleUnskipClick = useCallback(
    (range: SkippedRange) => {
      onUnskip(range);
    },
    [onUnskip]
  );

  return (
    <div className="relative flex flex-col h-full">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-black mb-3 px-1">
        Transcript
      </h2>

      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className="flex-1 overflow-y-auto pr-1 leading-7 text-sm text-black select-text scrollbar-thin scrollbar-thumb-white/20"
        style={{ wordBreak: "break-word" }}
      >
        {words.map((word, idx) => {
          const skipped = getSkippedRange(idx, skippedRanges);
          return (
            <WordToken
              key={idx}
              word={word}
              idx={idx}
              isActive={idx === activeIdx}
              skipped={skipped}
              onWordClick={handleWordClick}
            />
          );
        })}
      </div>

      {/* Skipped range list */}
      {skippedRanges.length > 0 && (
        <div className="mt-3 border-t border-white/10 pt-3 space-y-1">
          <p className="text-xs uppercase tracking-widest text-white/40 mb-1">
            Skipped sections
          </p>
          {skippedRanges.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-xs text-white/50 bg-white/5 rounded px-2 py-1"
            >
              <span>
                {r.startTime.toFixed(1)}s – {r.endTime.toFixed(1)}s
              </span>
              <button
                onClick={() => handleUnskipClick(r)}
                className="text-violet-400 hover:text-violet-200 transition-colors ml-2"
              >
                Unskip
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Floating skip button on selection */}
      {selectionInfo && (
        <div
          className="fixed z-50 flex gap-1 shadow-lg"
          style={{ top: selectionInfo.y - 44, left: selectionInfo.x - 40 }}
        >
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleSkipClick}
            className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow transition-colors"
          >
            Skip
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setSelectionInfo(null);
              window.getSelection()?.removeAllRanges();
            }}
            className="bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
