import {
  ArrowDownToLine,
  LoaderCircle,
  Mic,
  OctagonAlert,
  TrafficCone,
  Trash2,
} from "lucide-react";
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type RefObject,
} from "react";

interface Props {
  file: File;
  originalUrl: string | null;
  enhancedUrl: string | null;
  outFormat: "wav" | "flac";
  busy: boolean;
  err: string | null;
  onClear: () => void;
  onEnhance: () => void;
  enhancedAudioRef: RefObject<HTMLAudioElement | null>;
}

const BAR_COUNT = 30;

function useAudioBars(audioRef: RefObject<HTMLAudioElement | null>) {
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(0));
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);

  const tick = useCallback(function tick() {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const step = Math.floor(data.length / BAR_COUNT);
    setBars(Array.from({ length: BAR_COUNT }, (_, i) => data[i * step] / 255));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const connect = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || sourceRef.current) return;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    ctxRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;
  }, [audioRef]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const start = () => {
      connect();
      rafRef.current = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(rafRef.current);
      setBars(Array(BAR_COUNT).fill(0));
    };
    audio.addEventListener("play", start);
    audio.addEventListener("pause", stop);
    audio.addEventListener("ended", stop);
    return () => {
      audio.removeEventListener("play", start);
      audio.removeEventListener("pause", stop);
      audio.removeEventListener("ended", stop);
      cancelAnimationFrame(rafRef.current);
    };
  }, [audioRef, connect, tick]);

  return bars;
}

function MusicTrack({ bars, accent }: { bars: number[]; accent: string }) {
  return (
    <div className="flex items-end gap-1 h-7 px-1">
      {bars.map((v, i) => (
        <div
          key={i}
          className="w-0.5 rounded-full"
          style={{
            height: `${Math.max(3, v * 32)}px`,
            background: v > 0.05 ? accent : "#3f3f46",
            transition: "height 120ms linear",
          }}
        />
      ))}
    </div>
  );
}

function ProcessingBorder() {
  return (
    <>
      <style>{`
        @keyframes conic-spin { to { transform: rotate(360deg); } }
        .proc-ring { position:absolute;inset:-2px;border-radius:15px;pointer-events:none;overflow:hidden;z-index:0; }
        .proc-ring::before { content:'';position:absolute;inset:-120%;background:conic-gradient(from 0deg,transparent 0deg,#7c5cfc 50deg,#a78bfa 80deg,#38bdf8 130deg,transparent 180deg);animation:conic-spin 1.6s linear infinite; }
        .proc-ring::after { content:'';position:absolute;inset:2px;border-radius:13px;background:#0c0c10; }
      `}</style>
      <div className="proc-ring" />
    </>
  );
}

export default function AudioPlayer({
  file,
  originalUrl,
  enhancedUrl,
  outFormat,
  busy,
  err,
  onClear,
  onEnhance,
  enhancedAudioRef,
}: Props) {
  const originalAudioRef = useRef<HTMLAudioElement | null>(null);
  const originalBars = useAudioBars(originalAudioRef);
  const enhancedBars = useAudioBars(enhancedAudioRef);

  function pauseOtherAudio(source: "original" | "enhanced") {
    if (source === "original") {
      if (enhancedAudioRef.current && !enhancedAudioRef.current.paused)
        enhancedAudioRef.current.pause();
    } else {
      if (originalAudioRef.current && !originalAudioRef.current.paused)
        originalAudioRef.current.pause();
    }
  }

  return (
    <div className="space-y-4">
      {/* File header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <TrafficCone size={30} className="text-orange-600" />
          <h1 className="font-medium text-zinc-200 truncate text-xl">
            {file.name}
          </h1>
          <span className="text-sm sm:text-sm bg-white px-1 rounded-md text-zinc-900 font-medium">
            {(file.size / (1024 * 1024)).toFixed(2)} MB
          </span>
        </div>
        <button
          onClick={onClear}
          className="w-full sm:w-auto justify-center flex items-center gap-1 text-xs bg-rose-500/10 text-zinc-400 border border-rose-500/50 rounded-lg px-2.5 py-1.5 hover:text-zinc-200 hover:bg-rose-500/20 transition-colors duration-300"
        >
          <Trash2 size={16} />
          <h1 className="text-sm font-medium">Clear</h1>
        </button>
      </div>

      {/* Players */}
      <div className="grid grid-rows-2 gap-3 sm:gap-4">
        {/* Original */}
        <div className="bg-zinc-950/60 border border-blue-500/50 rounded-2xl p-3 space-y-2">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xs sm:text-base font-semibold uppercase text-blue-400 shrink-0">
              Original
            </h1>
            <div className="hidden sm:block min-w-0">
              <MusicTrack bars={originalBars} accent="#60a5fa" />
            </div>
          </div>
          <audio
            ref={originalAudioRef}
            className="w-full h-8"
            controls
            src={originalUrl ?? undefined}
            onPlay={() => pauseOtherAudio("original")}
          />
        </div>

        {/* Enhanced */}
        <div className="bg-zinc-950/60 border border-emerald-500/50 rounded-2xl p-3 space-y-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <h1
              className={`text-xs sm:text-base font-semibold uppercase ${enhancedUrl ? "text-emerald-400" : "text-zinc-500"}`}
            >
              Enhanced
            </h1>
            <div className="hidden sm:block min-w-0">
              <MusicTrack bars={enhancedBars} accent="#34d399" />
            </div>
            {enhancedUrl && (
              <a
                className="ml-auto sm:ml-auto flex items-center gap-1 text-xs sm:text-sm text-violet-400 hover:text-violet-300 transition-colors"
                href={enhancedUrl}
                download={`${file.name.replace(/\.[^/.]+$/, "")}_denoised.${outFormat}`}
              >
                <ArrowDownToLine size={16} />
                <p className="font-medium text-sm">Download</p>
              </a>
            )}
          </div>
          <audio
            ref={enhancedAudioRef}
            className="w-full h-9"
            controls
            src={enhancedUrl ?? undefined}
            onPlay={() => pauseOtherAudio("enhanced")}
          />
        </div>
      </div>

      {/* Error */}
      {err && (
        <div className="flex items-start gap-2 bg-red-950/40 border border-red-900/30 rounded-xl px-3.5 py-3 text-sm text-red-300">
          <OctagonAlert size={18} className="shrink-0 mt-0.5" />
          {err}
        </div>
      )}

      {/* Enhance button */}
      <div className="relative">
        {busy && <ProcessingBorder />}
        <button
          disabled={busy}
          onClick={onEnhance}
          className={[
            "relative z-10 w-full flex items-center justify-center gap-2 rounded-[13px] px-4 py-3.5 sm:py-4 text-sm sm:text-base font-semibold transition-all duration-200",
            busy
              ? "bg-zinc-900/0 text-zinc-400 cursor-not-allowed"
              : "bg-violet-600/30 hover:bg-violet-500/10 transition-colors duration-300 border border-violet-500/50 text-white hover:shadow-[0_0_24px_rgba(124,92,252,0.4)]",
          ].join(" ")}
        >
          {busy ? (
            <>
              <LoaderCircle size={17} className="animate-spin" />
              Processing audio…
            </>
          ) : (
            <>
              <Mic size={17} />
              Enhance & Remove Noise
            </>
          )}
        </button>
      </div>
    </div>
  );
}
