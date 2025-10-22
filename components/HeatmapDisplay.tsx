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
    <div className="relative w-full h-full bg-green-700/50 border-2 border-white/30 rounded-lg p-2 overflow-hidden" style={{ background: 'radial-gradient(ellipse at center, #2e7d32, #1b5e20)' }}>
        {/* Pitch Markings */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[18%] border-2 border-white/30 rounded-b-lg border-t-0"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[18%] border-2 border-white/30 rounded-t-lg border-b-0"></div>
        <div className="absolute top-1/2 left-0 w-full h-px bg-white/30"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/4 aspect-square border-2 border-white/30 rounded-full"></div>

        {/* Heatmap Canvas */}
        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
    </div>
  );
};

export default HeatmapDisplay;