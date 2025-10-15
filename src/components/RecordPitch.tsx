import { useEffect, useRef, useState } from "react";

export default function RecordPitch() {
  const [isRec, setIsRec] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [secs, setSecs] = useState(0);
  const mediaRec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearInterval(timer.current);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  async function start() {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setBlobUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return url;
        });
      };
      mediaRec.current = mr;
      setSecs(0);
      mr.start();
      setIsRec(true);
      timer.current = window.setInterval(() => {
        setSecs((s) => {
          if (s >= 89) stop(); // 90s max
          return s + 1;
        });
      }, 1000);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErr(e.message);
      } else {
        setErr("Micro non accessible.");
      }
    }
  }

  function stop() {
    if (!isRec) return;
    mediaRec.current?.stop();
    setIsRec(false);
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  }

  function reset() {
    stop();
    setSecs(0);
    setBlobUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    chunks.current = [];
  }

  return (
    <div className="rounded-2xl border border-[--border] bg-[--card] p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <button
          onClick={isRec ? stop : start}
          className={`btn rounded-full px-4 py-2 font-medium ${
            isRec
              ? "bg-red-600 hover:bg-red-700"
              : "bg-[--accent] hover:bg-[--accent-600]"
          } text-white transition`}
        >
          {isRec ? "Arrêter" : "Enregistrer"}
        </button>
        <div className="text-sm text-[--text-muted]">
          {isRec ? "Enregistrement…" : "Jusqu’à 90 secondes"}
        </div>
        <div className="ml-auto tabular-nums text-sm">
          {Math.floor(secs / 60)
            .toString()
            .padStart(2, "0")}
          :{(secs % 60).toString().padStart(2, "0")}
        </div>
      </div>

      {err && <p className="mt-3 text-sm text-red-400">{err}</p>}

      {blobUrl && !isRec && (
        <div className="mt-4 flex flex-col gap-3">
          <audio controls className="w-full" src={blobUrl} />
          <div className="flex gap-2">
            <button
              onClick={reset}
              className="btn rounded-lg border border-[--border] bg-[--surface-2] px-3 py-2 text-sm hover:bg-[--surface-3] transition"
            >
              Recommencer
            </button>
            {/* Exemple d’upload (à brancher plus tard)
            <button className="btn rounded-lg bg-[--accent] px-3 py-2 text-sm text-white hover:bg-[--accent-600]">
              Envoyer mon pitch
            </button>
            */}
          </div>
        </div>
      )}
    </div>
  );
}
