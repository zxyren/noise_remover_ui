import { Settings2, RotateCcw } from "lucide-react";
import { type Settings } from "../hooks/useAudioProcessor";

interface SliderProps {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}

function Slider({
  label,
  hint,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-medium text-zinc-200">{label}</h1>
          <p className="font-medium text-zinc-500">{hint}</p>
        </div>
        <span className="text-sm text-blue-500 flex-shrink-0 mt-0.5">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ "--pct": `${pct}%` } as React.CSSProperties}
      />
    </div>
  );
}

interface Props {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, v: Settings[K]) => void;
  onReset: () => void;
}

export default function SettingsPanel({ settings, update, onReset }: Props) {
  return (
    <div className="bg-zinc-900/50 border border-white/[0.06] rounded-2xl p-4 sm:p-5 space-y-5">
      {/* Panel header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-zinc-500">
          <Settings2 />
          <h1 className="font-medium text-base sm:text-lg">Settings</h1>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 px-2 py-1.5 text-xs sm:text-sm font-semibold text-zinc-400 border border-white/[0.08] rounded-lg hover:text-zinc-200 hover:bg-white/5 transition-colors"
          title="Reset to default settings"
        >
          <RotateCcw size={16} />
          Reset
        </button>
      </div>

      <div className="space-y-5">
        <Slider
          label="Strength"
          hint="noise suppression level"
          value={settings.strength}
          min={0}
          max={1}
          step={0.01}
          format={(v) => v.toFixed(2)}
          onChange={(v) => update("strength", v)}
        />
        <Slider
          label="Residual gate"
          hint="suppress leftover noise"
          value={settings.residualGate}
          min={0}
          max={1}
          step={0.01}
          format={(v) => v.toFixed(2)}
          onChange={(v) => update("residualGate", v)}
        />
        <Slider
          label="HF boost"
          hint="high-frequency presence"
          value={settings.hfBoostDb}
          min={0}
          max={20}
          step={1}
          format={(v) => `${v} dB`}
          onChange={(v) => update("hfBoostDb", v)}
        />
        <Slider
          label="Noise percentile"
          hint="noise floor estimation"
          value={settings.noisePercentile}
          min={5}
          max={40}
          step={1}
          format={(v) => `${v}%`}
          onChange={(v) => update("noisePercentile", v)}
        />
      </div>

      {/* Format picker */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-4 border-t border-white/[0.06]">
        <h1 className="text-lg font-medium text-zinc-200">Output format</h1>
        <div className="flex gap-1.5 self-start sm:self-auto">
          {(["wav", "flac"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => update("outFormat", f)}
              className={`text-sm font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                settings.outFormat === f
                  ? "bg-blue-500/10 border-blue-500/40 text-blue-300"
                  : "border-white/[0.07] text-zinc-400 hover:border-white/20 hover:text-zinc-300"
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Tip */}
      <p className="font-medium text-zinc-500">
        <span className="text-blue-500">Tip:</span> For best results, use
        lossless formats like{" "}
        <span className="bg-white/20 text-white/70 px-1 rounded">WAV</span> or
        <span className="bg-white/20 text-white/70 px-1 rounded">FLAC</span> as
        input.
      </p>
    </div>
  );
}
