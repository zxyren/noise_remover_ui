import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type AnalyzeResponse = {
  sr: number;
  channels: number;
  duration_sec: number;
  rms: number;
  peak: number;
  hf_ratio: number;
  suggested?: {
    strength: number;
    residual_gate: number;
    hf_boost_db: number;
    noise_percentile: number;
  };
};

export type Settings = {
  strength: number;
  residualGate: number;
  hfBoostDb: number;
  noisePercentile: number;
  outFormat: "wav" | "flac";
};

const DEFAULT_SETTINGS: Settings = {
  strength: 0.92,
  residualGate: 1.0,
  hfBoostDb: 0,
  noisePercentile: 40,
  outFormat: "wav",
};

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function loadSettingsFromStorage(): Settings {
  try {
    const stored = localStorage.getItem("audioProcessorSettings");
    return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function saveFileToIndexedDB(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("audioProcessorDB", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(["files"], "readwrite");
      const store = transaction.objectStore("files");
      store.put({ id: "uploadedFile", file, name: file.name, size: file.size });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "id" });
      }
    };
  });
}

async function loadFileFromIndexedDB(): Promise<File | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("audioProcessorDB", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(["files"], "readonly");
      const store = transaction.objectStore("files");
      const fileRequest = store.get("uploadedFile");

      fileRequest.onsuccess = () => {
        const result = fileRequest.result;
        resolve(result ? result.file : null);
      };
      fileRequest.onerror = () => reject(fileRequest.error);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "id" });
      }
    };
  });
}

async function deleteFileFromIndexedDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("audioProcessorDB", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(["files"], "readwrite");
      const store = transaction.objectStore("files");
      store.delete("uploadedFile");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "id" });
      }
    };
  });
}

export function useAudioProcessor() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [settings, setSettings] = useState<Settings>(loadSettingsFromStorage);

  const enhancedAudioRef = useRef<HTMLAudioElement | null>(null);

  const apiBase = useMemo(() => {
    const envApiBase = import.meta.env.VITE_API_BASE;
    if (typeof envApiBase === "string" && envApiBase.trim()) {
      return envApiBase.replace(/\/+$|\s+/g, "");
    }
    return typeof window !== "undefined"
      ? window.location.origin
      : "http://127.0.0.1:8000";
  }, []);

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("audioProcessorSettings", JSON.stringify(settings));
  }, [settings]);

  // Load file from IndexedDB on mount
  useEffect(() => {
    loadFileFromIndexedDB()
      .then((storedFile) => {
        if (storedFile) {
          setFile(storedFile);
          setOriginalUrl(URL.createObjectURL(storedFile));
        }
      })
      .catch(() => {
        // Silently fail if IndexedDB is not available
      });
  }, []);

  const updateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const pickFile = useCallback(
    async (f: File | null) => {
      setErr(null);
      setAnalysis(null);
      setEnhancedUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setFile(f);
      setOriginalUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return f ? URL.createObjectURL(f) : null;
      });

      if (!f) {
        // Clear file from IndexedDB
        try {
          await deleteFileFromIndexedDB();
        } catch {
          // Silently fail if IndexedDB is not available
        }
        return;
      }

      // Save file to IndexedDB
      try {
        await saveFileToIndexedDB(f);
      } catch {
        // Silently fail if IndexedDB is not available
      }

      try {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch(`${apiBase}/api/analyze`, {
          method: "POST",
          body: fd,
        });
        const j = (await res.json()) as AnalyzeResponse | { error: string };
        if (!res.ok || "error" in j)
          throw new Error(
            "error" in j ? j.error : `Analyze failed: ${res.status}`,
          );
        setAnalysis(j);
        if (j.suggested) {
          setSettings({
            strength: clamp(j.suggested.strength, 0, 1),
            residualGate: clamp(j.suggested.residual_gate, 0, 1),
            hfBoostDb: clamp(j.suggested.hf_boost_db, 0, 20),
            noisePercentile: clamp(j.suggested.noise_percentile, 5, 40),
            outFormat: "wav",
          });
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    },
    [apiBase],
  );

  const enhance = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    setEnhancedUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("strength", String(settings.strength));
      fd.append("residual_gate", String(settings.residualGate));
      fd.append("hf_boost_db", String(settings.hfBoostDb));
      fd.append("noise_percentile", String(settings.noisePercentile));
      fd.append("out_format", settings.outFormat);

      const res = await fetch(`${apiBase}/api/denoise`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Enhance failed: ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setEnhancedUrl(url);
      setTimeout(() => enhancedAudioRef.current?.play().catch(() => {}), 0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [file, settings, apiBase]);

  return {
    file,
    originalUrl,
    enhancedUrl,
    busy,
    err,
    analysis,
    settings,
    updateSetting,
    resetSettings,
    pickFile,
    enhance,
    enhancedAudioRef,
  };
}
