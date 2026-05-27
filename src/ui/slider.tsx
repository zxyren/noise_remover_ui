import { useState } from "react";

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  onChangeEnd?: () => void;
  className?: string;
}

export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  onChangeEnd,
  className = "",
}: SliderProps) {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className={`relative flex h-9 w-full items-center ${className}`}>
      <div className="relative h-0.5 w-full rounded-full bg-border/40">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-foreground"
          style={{ width: `${percent}%` }}
        />
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerUp={onChangeEnd}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />

      <div
        className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-popover border border-foreground shadow-sm"
        style={{ left: `${percent}%` }}
      />
    </div>
  );
}

interface RangeProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  onChangeEnd?: () => void;
  suffix?: string;
}

export function Range({
  value,
  min,
  max,
  step,
  onChange,
  onChangeEnd,
  suffix = "",
}: RangeProps) {
  // Own the live value here so both the label and thumb update every drag tick
  const [localValue, setLocalValue] = useState(value);

  function handleChange(v: number) {
    setLocalValue(v);
    onChange(v);
  }

  const display = Number.isInteger(step)
    ? localValue.toString()
    : localValue.toFixed(step < 0.1 ? 2 : 1);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="tabular-nums text-sm font-semibold text-foreground">
          {display}
          {suffix}
        </span>
      </div>
      <Slider
        value={localValue}
        min={min}
        max={max}
        step={step}
        onChange={handleChange}
        onChangeEnd={onChangeEnd}
      />
    </div>
  );
}
