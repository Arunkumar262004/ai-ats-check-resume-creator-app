import { useEffect, useRef } from "react";

// Round blue dots that keep drifting across the whole page (inspired by the Antigravity hero).
// They flow left-to-right on a gently waving path, wrap around the edges, and scatter away from the mouse.
const COLORS = ["#2f6db5", "#3d8bd9", "#4f8cff", "#5aa9ee", "#14b8c4"];

export default function BackgroundDots() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, dots = [], raf = 0, t = 0, mx = -9999, my = -9999;

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(750, Math.round((w * h) / 3000));
      dots = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: 1.2 + Math.random() * 2.2,                       // round dot radius
        col: COLORS[(Math.random() * COLORS.length) | 0],
        a: 0.35 + Math.random() * 0.55,
        sp: 0.3 + Math.random() * 0.7,                      // how fast it travels
        ph: Math.random() * Math.PI * 2,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        // steady drift across the page, with a smooth wave so paths curve instead of running in straight lines
        let ang = 0.28 + 0.85 * Math.sin(d.y * 0.0042 + t * 0.35 + d.ph * 0.25) + 0.45 * Math.cos(d.x * 0.0031 - t * 0.22);
        let vx = Math.cos(ang) * d.sp, vy = Math.sin(ang) * d.sp;

        // scatter away from the cursor
        const dx = d.x - mx, dy = d.y - my, dist = Math.hypot(dx, dy);
        if (dist < 150) {
          const push = (1 - dist / 150) * 2.6;
          vx += (dx / (dist || 1)) * push; vy += (dy / (dist || 1)) * push;
        }
        if (!reduce) { d.x += vx; d.y += vy; }

        // wrap around the edges so the flow never stops
        if (d.x > w + 6) d.x = -6; else if (d.x < -6) d.x = w + 6;
        if (d.y > h + 6) d.y = -6; else if (d.y < -6) d.y = h + 6;

        ctx.globalAlpha = d.a;
        ctx.fillStyle = d.col;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      t += 0.016;
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    const onMove = (e) => { mx = e.clientX; my = e.clientY; };
    const onLeave = () => { mx = my = -9999; };
    let rz;
    const onResize = () => { clearTimeout(rz); rz = setTimeout(() => { build(); if (reduce) draw(); }, 150); };

    build(); draw();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onLeave);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf); clearTimeout(rz);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className="bg-dots" aria-hidden="true" />;
}
