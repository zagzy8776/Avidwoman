import { useEffect, useRef } from "react";

const GOLD = "#D4AF37";
const DEEP_GOLD = "#C9A227";
const SOURCE_SIZE = 1024;

type Particle = {
  u: number;
  v: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  group: number;
  bright: boolean;
};

function seededNoise(x: number, y: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export default function ParticleLogo({ compact = false }: { compact?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    let particles: Particle[] = [];
    let logoSize = 0;
    let logoLeft = 0;
    let logoTop = 0;
    let width = 0;
    let height = 0;
    const pointer = { x: 0, y: 0, active: false };

    const placeParticles = (reset = false) => {
      logoSize = Math.min(width, height) * (compact ? 0.9 : 0.88);
      logoSize = Math.min(compact ? 560 : 940, logoSize);
      logoLeft = (width - logoSize) / 2;
      logoTop = (height - logoSize) / 2;
      if (reset) {
        particles.forEach((particle) => {
          particle.x = logoLeft + particle.u * logoSize;
          particle.y = logoTop + particle.v * logoSize;
          particle.vx = 0;
          particle.vy = 0;
        });
      }
    };

    const resize = () => {
      const bounds = container.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const changed = width !== bounds.width || height !== bounds.height;
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      placeParticles(changed);
    };

    const createParticles = (image: HTMLImageElement) => {
      const mask = document.createElement("canvas");
      mask.width = SOURCE_SIZE;
      mask.height = SOURCE_SIZE;
      const maskContext = mask.getContext("2d", { willReadFrequently: true });
      if (!maskContext) return;
      maskContext.drawImage(image, 0, 0, SOURCE_SIZE, SOURCE_SIZE);
      const pixels = maskContext.getImageData(0, 0, SOURCE_SIZE, SOURCE_SIZE).data;
      const isGold = (x: number, y: number) => {
        if (x < 0 || x >= SOURCE_SIZE || y < 0 || y >= SOURCE_SIZE) return false;
        const index = (y * SOURCE_SIZE + x) * 4;
        return pixels[index] + pixels[index + 1] + pixels[index + 2] > 90;
      };
      const created: Particle[] = [];
      const addParticle = (x: number, y: number, edge: boolean, salt: number) => {
        const noise = seededNoise(x + salt * 17, y - salt * 31);
        created.push({
          u: (x + (noise - 0.5) * (edge ? 1.4 : 2.4)) / SOURCE_SIZE,
          v:
            (y + (seededNoise(y + salt * 9, x) - 0.5) * (edge ? 1.4 : 2.4)) /
            SOURCE_SIZE,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          radius: edge ? 0.82 + noise * 0.62 : 0.58 + noise * 0.48,
          group: Math.floor(noise * 4),
          bright: noise > 0.34,
        });
      };

      for (let y = 2; y < SOURCE_SIZE - 2; y += compact ? 5 : 4) {
        for (let x = 2; x < SOURCE_SIZE - 2; x += compact ? 5 : 4) {
          if (!isGold(x, y)) continue;
          const edge =
            !isGold(x - 4, y) ||
            !isGold(x + 4, y) ||
            !isGold(x, y - 4) ||
            !isGold(x, y + 4);
          addParticle(x, y, edge, 0);
          if (edge) addParticle(x + 1.7, y + 1.2, true, 1);
        }
      }
      particles = created;
      placeParticles(true);
    };

    const render = (time: number) => {
      context.clearRect(0, 0, width, height);
      const driftX = [0.00031, 0.00027, 0.00035, 0.00024].map(
        (speed, index) => Math.sin(time * speed + index * 1.55) * 0.58,
      );
      const driftY = [0.00029, 0.00034, 0.00025, 0.00032].map(
        (speed, index) => Math.cos(time * speed + index * 1.8) * 0.58,
      );

      particles.forEach((particle) => {
        const homeX = logoLeft + particle.u * logoSize + driftX[particle.group];
        const homeY = logoTop + particle.v * logoSize + driftY[particle.group];
        particle.vx += (homeX - particle.x) * 0.018;
        particle.vy += (homeY - particle.y) * 0.018;
        if (pointer.active) {
          const dx = pointer.x - particle.x;
          const dy = pointer.y - particle.y;
          const distanceSquared = dx * dx + dy * dy;
          const reach = Math.min(145, logoSize * 0.18);
          if (distanceSquared < reach * reach && distanceSquared > 9) {
            const distance = Math.sqrt(distanceSquared);
            const force = (1 - distance / reach) * 0.03;
            particle.vx += (dx / distance) * force;
            particle.vy += (dy / distance) * force;
          }
        }
        particle.vx *= 0.9;
        particle.vy *= 0.9;
        particle.x += particle.vx;
        particle.y += particle.vy;
      });

      context.globalAlpha = 0.08;
      context.fillStyle = GOLD;
      context.beginPath();
      particles.forEach((particle) => {
        const radius = particle.radius * 2.7;
        context.moveTo(particle.x + radius, particle.y);
        context.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
      });
      context.fill();

      [false, true].forEach((bright) => {
        context.globalAlpha = bright ? 0.98 : 0.82;
        context.fillStyle = bright ? GOLD : DEEP_GOLD;
        context.beginPath();
        particles.forEach((particle) => {
          if (particle.bright !== bright) return;
          const radius = particle.radius * Math.max(0.72, logoSize / 820);
          context.moveTo(particle.x + radius, particle.y);
          context.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
        });
        context.fill();
      });
      context.globalAlpha = 1;
      animationFrame = requestAnimationFrame(render);
    };

    const updatePointer = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;
      pointer.active =
        pointer.x >= 0 && pointer.x <= bounds.width && pointer.y >= 0 && pointer.y <= bounds.height;
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    const image = new Image();
    image.src = "/avid-woman-vogue-logo.png";
    image.onload = () => createParticles(image);
    window.addEventListener("pointermove", updatePointer, { passive: true });
    animationFrame = requestAnimationFrame(render);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("pointermove", updatePointer);
    };
  }, [compact]);

  return (
    <canvas
      ref={canvasRef}
      className="particle-canvas"
      role="img"
      aria-label="Avid Woman Vogue gold particle logo with crossed scissors"
    />
  );
}
