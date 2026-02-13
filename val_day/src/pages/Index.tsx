import { useState, useCallback, useRef, useEffect } from "react";
import Fireworks from "@/components/Fireworks";

const Index = () => {
  const [accepted, setAccepted] = useState(false);
  const [noPos, setNoPos] = useState<{ top: string; left: string } | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const moveNoButton = useCallback(() => {
    const top = Math.random() * 80 + 5 + "%";
    const left = Math.random() * 75 + 5 + "%";
    setNoPos({ top, left });
  }, []);

  const handleYes = () => {
    // Start audio immediately in click handler to avoid autoplay block
    if (audioRef.current) {
      audioRef.current.currentTime = 18;
      audioRef.current.play().catch(() => {});
    }
    setTransitioning(true);
    setTimeout(() => {
      setAccepted(true);
    }, 400);
  };

  useEffect(() => {
    const audio = new Audio("/valentine-song.mp3");
    audio.addEventListener("ended", () => {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    });
    audioRef.current = audio;
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center select-none overflow-hidden"
         style={{ background: "var(--gradient-bg)" }}>
      
      {/* Heart */}
      <div
        className={`transition-all duration-700 ease-in-out ${
          accepted
            ? "heart-beating absolute top-1/2 left-1/2"
            : "relative mb-8"
        }`}
        style={accepted ? { transform: "translate(-50%, -50%)", zIndex: 20 } : {}}
      >
        <svg
          viewBox="0 0 200 180"
          className={`transition-all duration-700 ${accepted ? "w-[27rem] h-[27rem] md:w-[36rem] md:h-[36rem]" : "w-[21rem] h-[21rem] md:w-[27rem] md:h-[27rem]"}`}
          style={{
            filter: accepted
              ? "drop-shadow(0 0 30px hsl(350, 100%, 60%))"
              : "drop-shadow(0 4px 12px rgba(0,0,0,0.15))",
          }}
        >
          <path
            d="M100 180 C40 120, -20 60, 20 20 C40 0, 70 0, 100 40 C130 0, 160 0, 180 20 C220 60, 160 120, 100 180Z"
            fill="hsl(0, 85%, 50%)"
          />
          {!accepted && (
            <text
              x="100"
              y="85"
              textAnchor="middle"
              fill="white"
              fontWeight="bold"
              fontSize="14"
              fontFamily="system-ui, sans-serif"
            >
              <tspan x="100" dy="0">Will you be</tspan>
              <tspan x="100" dy="18">my Valentine?</tspan>
            </text>
          )}
        </svg>
      </div>

      {/* Buttons */}
      {!accepted && (
        <div
          className={`flex gap-6 mt-4 transition-opacity duration-300 ${
            transitioning ? "opacity-0" : "opacity-100"
          }`}
        >
          <button
            onClick={handleYes}
            className="px-10 py-4 rounded-full text-xl font-bold text-white shadow-lg hover:scale-110 active:scale-95 transition-all duration-200"
            style={{ background: "hsl(140, 60%, 45%)" }}
          >
            Yes 💕
          </button>
        </div>
      )}

      {/* Runaway No button */}
      {!accepted && !transitioning && (
        <button
          onClick={moveNoButton}
          onMouseEnter={moveNoButton}
          className="px-10 py-4 rounded-full text-xl font-bold text-white shadow-lg transition-all duration-200 active:scale-95"
          style={{
            background: "hsl(220, 15%, 55%)",
            position: "fixed",
            top: noPos?.top ?? "calc(50% + 15rem)",
            left: noPos?.left ?? "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
          }}
        >
          No 😢
        </button>
      )}

      <Fireworks active={accepted} />

      {accepted && (
        <p className="absolute bottom-12 text-2xl font-bold animate-fade-in"
           style={{ color: "hsl(350, 80%, 40%)", zIndex: 20 }}>
          ❤️ Yay! Happy Valentine's Day! ❤️
        </p>
      )}
    </div>
  );
};

export default Index;
