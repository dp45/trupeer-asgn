export interface Word {
  text: string;
  start: number;
  end: number;
  type: "word" | "spacing";
  logprob?: number;
}

export interface Transcript {
  text: string;
  words: Word[];
}

export interface SkippedRange {
  wordStartIdx: number;
  wordEndIdx: number;
  startTime: number;
  endTime: number;
}

export interface VideoMetadata {
  src: string;
  background: string;
  title: string;
}
