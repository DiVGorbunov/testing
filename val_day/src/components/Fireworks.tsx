import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
  decay: number;
}

interface Firework {
  x: number;
  y: number;
  targetY: number;
  speed: number;
  color: string;
  exploded: boolean;
  particles: Particle[];
}

const COLORS = [
  "hsl(350,90%,60%)", "hsl(330,85%,65%)", "hsl(20,90%,60%)",
  "hsl(45,95%,65%)", "hsl(280,80%,65%)", "hsl(200,85%,60%)",
  "hsl(140,70%,55%)", "hsl(0,100%,70%)",
];

const Fireworks = ({ active }: { active: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fireworksRef = useRef<Firework[]>([]);
  const animRef = useRef<number>(0);
  const lastSpawn = useRef(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const spawnFirework = () => {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      fireworksRef.current.push({
        x: Math.random() * canvas.width,
        y: canvas.height,
        targetY: Math.random() * canvas.height * 0.5 + 40,
        speed: 4 + Math.random() * 3,
        color,
        exploded: false,
        particles: [],
      });
    };

    const explode = (fw: Firework) => {
      const count = 60 + Math.floor(Math.random() * 40);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = 1.5 + Math.random() * 3.5;
        fw.particles.push({
          x: fw.x,
          y: fw.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          color: fw.color,
          size: 1.5 + Math.random() * 1.5,
          decay: 0.012 + Math.random() * 0.012,
        });
      }
      fw.exploded = true;
    };

    const loop = (time: number) => {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "lighter";

      if (time - lastSpawn.current > 350 + Math.random() * 400) {
        spawnFirework();
        lastSpawn.current = time;
      }

      const fws = fireworksRef.current;
      for (let i = fws.length - 1; i >= 0; i--) {
        const fw = fws[i];
        if (!fw.exploded) {
          fw.y -= fw.speed;
          ctx.beginPath();
          ctx.arc(fw.x, fw.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = fw.color;
          ctx.fill();
          if (fw.y <= fw.targetY) explode(fw);
        } else {
          let alive = false;
          for (const p of fw.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.04;
            p.alpha -= p.decay;
            if (p.alpha <= 0) continue;
            alive = true;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          if (!alive) fws.splice(i, 1);
        }
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      fireworksRef.current = [];
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
};

export default Fireworks;
