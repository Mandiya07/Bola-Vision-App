import React, { useRef, useEffect } from 'react';
import type { Point } from '../types';

interface HeatmapDisplayProps {
  points: Point[];
  color: string; // e.g., '#ff0000'
}

const HeatmapDisplay: React.FC<HeatmapDisplayProps> = ({ points, color }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match the parent for responsiveness
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Heatmap drawing logic
    const pointRadius = canvas.width / 20; // Radius of influence for each point
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, pointRadius);
    gradient.addColorStop(0, `${color}4D`);   // Center color (e.g., rgba(255, 0, 0, 0.3))
    gradient.addColorStop(0.5, `${color}26`); // Mid color (e.g., rgba(255, 0, 0, 0.15))
    gradient.addColorStop(1, `${color}00`);   // Edge color (transparent)

    ctx.fillStyle = gradient;

    points.forEach(point => {
      const x = (point.x / 100) * canvas.width;
      const y = (point.y / 100) * canvas.height;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.arc(0, 0, pointRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    });

  }, [points, color]);

  return (
    <div className="relative w-full h-full glass-panel border-white/10 rounded-2xl p-2 overflow-hidden bg-slate-950">
        {/* Futuristic Pitch Markings */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[18%] border border-neon-cyan rounded-b-xl border-t-0 shadow-[0_0_10px_rgba(0,243,255,0.2)]"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[18%] border border-neon-cyan rounded-t-xl border-b-0 shadow-[0_0_10px_rgba(0,243,255,0.2)]"></div>
          <div className="absolute top-1/2 left-0 w-full h-px bg-neon-cyan shadow-[0_0_5px_rgba(0,243,255,0.3)]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/4 aspect-square border border-neon-cyan rounded-full shadow-[0_0_10px_rgba(0,243,255,0.2)]"></div>
          
          {/* Grid lines */}
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-10 opacity-10">
            {[...Array(60)].map((_, i) => (
              <div key={i} className="border-[0.5px] border-white/20" />
            ))}
          </div>
        </div>

        {/* Heatmap Canvas */}
        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full mix-blend-screen" />
        
        {/* Scanline effect on heatmap */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-10 opacity-30" />
    </div>
  );
};

export default HeatmapDisplay;