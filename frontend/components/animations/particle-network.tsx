"use client";

import React, { useRef, useEffect, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  alpha: number;
  baseAlpha: number;
  colorPhase: number; // 0..1 for color interpolation
  phaseSpeed: number;
}

const PARTICLE_COUNT = 120;
const CONNECTION_DISTANCE = 160;

// Color interpolation between green and cyan
function lerpColor(t: number): string {
  // #00ff88 → #00d4ff
  const r = 0;
  const g = Math.round(255 - t * (255 - 212));
  const b = Math.round(136 + t * (255 - 136));
  return `rgb(${r},${g},${b})`;
}

// Orbital ring config
const ORBITAL_RINGS = [
  { radiusFactor: 0.25, speed: 0.0003, opacity: 0.06 },
  { radiusFactor: 0.35, speed: -0.0002, opacity: 0.04 },
  { radiusFactor: 0.18, speed: 0.0005, opacity: 0.05 },
];

export function ParticleNetwork({ scrollY }: { scrollY?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const mouseRef = useRef<{ x: number; y: number }>({ x: -9999, y: -9999 });
  const timeRef = useRef<number>(0);

  const initParticles = useCallback((w: number, h: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const depth = Math.random(); // 0 = far, 1 = close
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        baseRadius: 1 + depth * 2, // 1px–3px
        radius: 1 + depth * 2,
        baseAlpha: 0.3 + depth * 0.7, // 0.3–1.0
        alpha: 0.3 + depth * 0.7,
        colorPhase: Math.random(),
        phaseSpeed: (Math.random() - 0.5) * 0.002,
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (particlesRef.current.length === 0) {
        initParticles(canvas.width, canvas.height);
      }
    };
    resize();
    window.addEventListener("resize", resize);

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMouseMove);

    const animate = () => {
      const { width: w, height: h } = canvas;
      ctx.clearRect(0, 0, w, h);
      timeRef.current++;

      const cx = w / 2;
      const cy = h / 2;
      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      const t = timeRef.current;

      // ── Draw orbital rings ──
      for (const ring of ORBITAL_RINGS) {
        const r = Math.min(w, h) * ring.radiusFactor;
        const angle = t * ring.speed;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 255, 136, ${ring.opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      // ── Update + draw particles ──
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Color phase shift over time
        p.colorPhase += p.phaseSpeed;
        if (p.colorPhase > 1) p.colorPhase -= 1;
        if (p.colorPhase < 0) p.colorPhase += 1;

        p.x += p.vx;
        p.y += p.vy;

        // Bounce off edges
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        // Vortex pull toward center — closer = faster
        const dcx = cx - p.x;
        const dcy = cy - p.y;
        const distCenter = Math.sqrt(dcx * dcx + dcy * dcy);
        const maxDist = Math.sqrt(cx * cx + cy * cy);
        if (distCenter > 0) {
          const vortexStrength = 0.015 * (1 - distCenter / maxDist);
          // Tangential + radial pull
          p.vx += (-dcy / distCenter) * vortexStrength * 0.5 + (dcx / distCenter) * vortexStrength * 0.3;
          p.vy += (dcx / distCenter) * vortexStrength * 0.5 + (dcy / distCenter) * vortexStrength * 0.3;
        }

        // Mouse attraction
        const dmx = mouse.x - p.x;
        const dmy = mouse.y - p.y;
        const distMouse = Math.sqrt(dmx * dmx + dmy * dmy);
        if (distMouse < 200 && distMouse > 0) {
          p.vx += (dmx / distMouse) * 0.025;
          p.vy += (dmy / distMouse) * 0.025;
        }

        // Clamp velocity
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const maxSpeed = 1.5;
        if (speed > maxSpeed) {
          p.vx = (p.vx / speed) * maxSpeed;
          p.vy = (p.vy / speed) * maxSpeed;
        }

        // Draw particle with color shift
        const color = lerpColor(p.colorPhase);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = p.baseAlpha;
        ctx.fill();
      }

      // ── Draw connections (fade by distance) ──
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DISTANCE) {
            const opacity = (1 - dist / CONNECTION_DISTANCE) * 0.35;
            // Blend connection color from both particles
            const midPhase = (a.colorPhase + b.colorPhase) / 2;
            const c = lerpColor(midPhase);
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = c;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [initParticles]);

  // Parallax offset via inline transform
  const yOffset = scrollY != null ? scrollY * 0.3 : 0;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        background: "transparent",
        transform: `translateY(${yOffset}px)`,
        willChange: "transform",
      }}
    />
  );
}
