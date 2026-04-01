"use client";

interface StyleControlsProps {
  padding: number;
  borderRadius: number;
  onPaddingChange: (v: number) => void;
  onBorderRadiusChange: (v: number) => void;
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Label sits above the row */}
      <span className="text-base text-black">{label}</span>

      {/* Row: 00 · slider · value box */}
      <div className="flex items-center gap-3 w-full">
        {/* Min value label */}
        <span className="text-sm text-black tabular-nums w-5 shrink-0">
          {String(min).padStart(2, "0")}
        </span>

        {/* Slider */}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="style-slider flex-1"
        />

        {/* Value box */}
        <div className="min-w-[52px] px-3 py-2 bg-gray-100 rounded-xl text-black text-sm tabular-nums text-center shrink-0">
          {value}
        </div>
      </div>
    </div>
  );
}

export default function StyleControls({
  padding,
  borderRadius,
  onPaddingChange,
  onBorderRadiusChange,
}: StyleControlsProps) {
  return (
    <div className="flex flex-col gap-6">
      <Slider
        label="Padding"
        value={padding}
        min={0}
        max={40}
        onChange={onPaddingChange}
      />
      <Slider
        label="Rounding"
        value={borderRadius}
        min={0}
        max={50}
        onChange={onBorderRadiusChange}
      />
    </div>
  );
}
