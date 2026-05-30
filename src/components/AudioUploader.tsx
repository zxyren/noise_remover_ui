import { Music } from "lucide-react";
import { useCallback, useState } from "react";

interface Props {
  onFile: (f: File) => void;
}

export default function AudioUploader({ onFile }: Props) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) onFile(f);
    },
    [onFile],
  );

  return (
    <label
      className={`flex flex-col items-center justify-center gap-3 border border-dashed rounded-xl p-8 sm:p-10 lg:p-14 text-center cursor-pointer transition-all duration-200 ${
        dragging
          ? "border-blue-500 bg-blue-500/10"
          : "border-white/10 hover:border-blue-500/60 hover:bg-blue-500/5"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        className="hidden"
        type="file"
        accept="audio/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center border transition-colors duration-200 ${dragging ? "border-blue-500/40 text-blue-400" : "border-white/10 text-zinc-400"}`}
      >
        <Music />
      </div>
      <h1 className="text-base sm:text-lg font-medium text-zinc-200">
        Drop your audio file here
      </h1>
      <p className="text-xs sm:text-sm font-medium text-zinc-500">
        WAV · FLAC · OGG · M4A · MP3 — or click to browse
      </p>
    </label>
  );
}
