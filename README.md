# Trupeer — Video Player

A custom composited video player with synchronized, interactive transcripts. Built with Next.js 16, React 19, Three.js, and TypeScript.

---

## What It Does

This app plays a video alongside a word-level transcript. As the video plays, the active word is highlighted in real time. Users can click any word to seek to that point, drag to select a range of words and skip them during playback, or adjust the visual style of the video (padding and rounded corners) via sliders. The video is rendered on a Three.js canvas using custom GLSL shaders for GPU-accelerated rounded corners and padding.

---

## Project Structure

```
asgn-app/
├── public/
│   ├── video.mp4              # Demo video (~6 minutes)
│   ├── background.jpg         # Background image for canvas
│   └── transcript.json        # Word-level transcript with timestamps
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── transcript/    # GET /api/transcript
│   │   │   └── video-metadata/# GET /api/video-metadata
│   │   ├── globals.css        # Global styles + Tailwind theme
│   │   ├── layout.tsx         # Root HTML layout + fonts
│   │   └── page.tsx           # Home page (server component)
│   ├── components/
│   │   ├── VideoPlayer/
│   │   │   ├── index.tsx      # Main orchestrator component
│   │   │   └── ThreeCanvas.tsx# Three.js canvas with shaders
│   │   ├── Controls/
│   │   │   ├── PlaybackControls.tsx  # Play/pause + scrubber
│   │   │   └── StyleControls.tsx     # Padding + border radius sliders
│   │   └── Transcript/
│   │       └── index.tsx      # Interactive word-level transcript
│   └── types/
│       └── transcript.ts      # TypeScript types
```

---

## Components

### `VideoPlayer/index.tsx`

The root client component. Orchestrates the entire player experience.

- Manages shared state: `isPlaying`, `padding`, `borderRadius`, `skippedRanges`
- Two-column layout: left sidebar (transcript + controls) and right main area (Three.js canvas)
- Handles play/pause toggling and resets `isPlaying` when the video ends
- Merges overlapping skip ranges to prevent conflicts
- Dynamically imports `ThreeCanvas` with `ssr: false` so Three.js only runs in the browser

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `videoSrc` | `string` | Path to the video file |
| `backgroundSrc` | `string` | Path to the background image |
| `transcript` | `Transcript` | Full transcript with word timings |

---

### `VideoPlayer/ThreeCanvas.tsx`

Renders the video and background using a Three.js `WebGLRenderer` with custom GLSL shaders. This is what gives the video its rounded corners and configurable padding — handled entirely on the GPU rather than via CSS.

- Uses an orthographic camera in normalized device coordinate (NDC) space
- Two planes: one for the background image, one for the video texture
- Maintains the video's aspect ratio dynamically
- A `ResizeObserver` keeps the canvas correctly sized as the container changes
- Shader uniforms (`uPadding`, `uRadius`) update in real time without rebuilding the scene
- Fragment shader uses a signed distance field (SDF) to clip pixels outside the rounded rectangle

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `videoRef` | `RefObject<HTMLVideoElement>` | Reference to the `<video>` element |
| `backgroundSrc` | `string` | Background image path |
| `padding` | `number` | Video padding as percentage (0–50) |
| `borderRadius` | `number` | Corner radius as percentage (0–50) |
| `containerRef` | `RefObject<HTMLDivElement>` | Div the canvas is mounted inside |

---

### `Controls/PlaybackControls.tsx`

Play/pause button and a timeline scrubber.

- Uses a `requestAnimationFrame` loop (not React state) to update the scrubber position smoothly
- Displays elapsed and total time in `M:SS / M:SS` format
- Pauses RAF updates while the user drags the scrubber to avoid conflicts
- Violet (`#7c3aed`) accent color for interactive elements

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `videoRef` | `RefObject<HTMLVideoElement>` | Reference to the `<video>` element |
| `isPlaying` | `boolean` | Current playback state |
| `onTogglePlay` | `() => void` | Called when play/pause is clicked |

---

### `Controls/StyleControls.tsx`

Two sliders for adjusting the visual style of the video canvas in real time.

- **Padding**: 0–40, controls how much space surrounds the video on the canvas
- **Border Radius**: 0–50, controls corner rounding
- Changes propagate immediately to `ThreeCanvas` shader uniforms

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `padding` | `number` | Current padding value |
| `borderRadius` | `number` | Current border radius value |
| `onPaddingChange` | `(v: number) => void` | Called on padding slider change |
| `onBorderRadiusChange` | `(v: number) => void` | Called on border radius slider change |

---

### `Transcript/index.tsx`

The interactive word-level transcript panel.

- **Active word highlighting**: Uses binary search on the `words` array to find the current word based on video time, updated via RAF for performance
- **Auto-scrolling**: Smoothly scrolls the active word into view as the video plays
- **Click to seek**: Clicking any word jumps the video to that word's start time
- **Drag to select**: Dragging across words selects a range; releasing the mouse shows a floating "Skip" button
- **Skip ranges**: Confirmed skips are stored as ranges; during playback, the video automatically jumps past skipped regions
- **Visual states**:
  - Active word: violet background
  - Skipped words: strikethrough + 40% opacity
  - Hovered word: subtle white highlight
- **Skipped words list**: Shows all active skip ranges at the bottom of the panel, each with an "Unskip" button
- `WordToken` is a memoized sub-component for render performance

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `words` | `Word[]` | Array of word objects with timing |
| `videoRef` | `RefObject<HTMLVideoElement>` | Reference to the `<video>` element |
| `skippedRanges` | `SkippedRange[]` | Currently active skip ranges |
| `onSkip` | `(range: SkippedRange) => void` | Called when user confirms a skip |
| `onUnskip` | `(range: SkippedRange) => void` | Called when user removes a skip |
| `onSeekToWord` | `(time: number) => void` | Called when user clicks a word |

---

## API Routes

### `GET /api/transcript`

Returns the full transcript JSON loaded from `public/transcript.json`.

- Adds a simulated 120ms delay
- Returns `500` with an error message on failure

**Response shape:**
```json
{
  "text": "Full transcript as a single string...",
  "words": [
    { "text": "Hello", "start": 0.24, "end": 0.5, "type": "word", "logprob": -0.0005 },
    { "text": " ", "start": 0.5, "end": 0.54, "type": "spacing" }
  ]
}
```

---

### `GET /api/video-metadata`

Returns metadata about the video (mock endpoint, intended to be replaced with a real database or CMS query).

- Adds a simulated 80ms delay

**Response shape:**
```json
{
  "src": "/video.mp4",
  "background": "/background.jpg",
  "title": "Trupeer Demo"
}
```

---

## Pages

### `src/app/page.tsx`

The home page. A server component that reads `public/transcript.json` at request time (`force-dynamic`) and renders the `VideoPlayer` with the transcript and video paths pre-loaded. No client-side fetch is needed for the initial render.

### `src/app/layout.tsx`

Root HTML layout. Sets the page title to "Trupierre — Video Player", loads the Geist and Geist Mono fonts from Google Fonts, and applies the `antialiased` Tailwind class to the body.

### `src/app/globals.css`

Global stylesheet. Defines:
- Dark theme: background `#0c0c10`, foreground `#ededed`
- Thin, styled scrollbars (4px, semi-transparent white thumb)
- Tailwind v4 theme variables

---

## Types

Defined in [src/types/transcript.ts](src/types/transcript.ts):

```typescript
interface Word {
  text: string;
  start: number;           // Start time in seconds
  end: number;             // End time in seconds
  type: "word" | "spacing";
  logprob?: number;        // Log probability from ASR model
}

interface Transcript {
  text: string;            // Full text as single string
  words: Word[];
}

interface SkippedRange {
  wordStartIdx: number;    // Index of first skipped word
  wordEndIdx: number;      // Index of last skipped word
  startTime: number;       // Start time in seconds
  endTime: number;         // End time in seconds
}

interface VideoMetadata {
  src: string;
  background: string;
  title: string;
}
```

---

## Tech Stack

| Technology | Version | Role |
|------------|---------|------|
| Next.js | 16.2.1 | Framework (App Router) |
| React | 19.2.4 | UI |
| Three.js | 0.183.x | GPU-accelerated video rendering |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

```bash
npm run build   # Production build
npm run start   # Start production server
npm run lint    # Run ESLint
```

---

## Key Design Decisions

- **Three.js shaders for video styling**: Rounded corners and padding are applied via GLSL fragment shaders using a signed distance field (SDF), offloading work to the GPU and enabling smooth real-time updates without CSS repaints.
- **RAF loops over React state for time updates**: Both `PlaybackControls` and `Transcript` use `requestAnimationFrame` directly rather than React state to track playback time, avoiding 60fps re-renders of the entire component tree.
- **Binary search for active word**: The transcript component uses binary search on the `words` array instead of a linear scan, keeping active-word detection O(log n) even for long transcripts.
- **Memoized `WordToken`**: Each word in the transcript is a `React.memo` component, so only the words that change state (active, skipped, hovered) re-render on each frame.
- **Server-side transcript loading**: The home page loads the transcript on the server to avoid a client-side fetch waterfall before the transcript is visible.
