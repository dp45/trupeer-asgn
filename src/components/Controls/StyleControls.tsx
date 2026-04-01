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
 <div className="flex items-center gap-3 w-full">
  <div className="flex flex-col gap-1.5 w-full">
    <div className="flex justify-between text-xs text-black">
      <span>{label}</span>
    </div>

    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      className="custom-slider"
    />
  </div>

  {/* Value box */}
  <div className="px-2 py-0 bg-gray-100 rounded-md text-black text-sm tabular-nums">
    {value}
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
    <div className="flex flex-col gap-3">
      {/* <p className="text-xs font-semibold uppercase tracking-widest text-black">
        Video Style
      </p> */}
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
