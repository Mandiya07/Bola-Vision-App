import React, { useRef, useState, useEffect } from 'react';
import type { TacticalSuggestion, Point } from '../types';
import { BrainIcon } from './icons/ControlIcons';

interface LiveTacticsOverlayProps {
  suggestion: TacticalSuggestion | null;
  onFadeOut: () => void;
}

const scaleCoords = (points: Point[], width: number, height: number) => {
    return points.map(p => ({ x: p.x * width / 100, y: p.y * height / 100 }));
}

const LiveTacticsOverlay: React.FC<LiveTacticsOverlayProps> = ({ suggestion, onFadeOut }) => {
    const [isVisible, setIsVisible] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (suggestion) {
            setIsVisible(true);
            const fadeTimer = setTimeout(() => {
                setIsVisible(false);
                // Allow time for fade out animation before clearing
                setTimeout(onFadeOut, 500); 
            }, 6000); // Display for 6 seconds

            return () => clearTimeout(fadeTimer);
        }
    }, [suggestion, onFadeOut]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !suggestion || !isVisible) return;

        const parent = canvas.parentElement;
        if (!parent) return;

        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        suggestion.drawings.forEach(d => {
            ctx.strokeStyle = d.color;
            ctx.lineWidth = 4;
            ctx.setLineDash([10, 8]);
            
            // Add shadow for better visibility
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            ctx.beginPath();
            if (d.type === 'arrow' && d.start && d.end) {
                const [start] = scaleCoords([d.start], canvas.width, canvas.height);
                const [end] = scaleCoords([d.end], canvas.width, canvas.height);
                const headlen = 15;
                const dx = end.x - start.x;
                const dy = end.y - start.y;
                const angle = Math.atan2(dy, dx);
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.lineTo(end.x - headlen * Math.cos(angle - Math.PI / 6), end.y - headlen * Math.sin(angle - Math.PI / 6));
                ctx.moveTo(end.x, end.y);
                ctx.lineTo(end.x - headlen * Math.cos(angle + Math.PI / 6), end.y - headlen * Math.sin(angle + Math.PI / 6));
            }
            if (d.type === 'circle' && d.center && d.radius) {
                const [center] = scaleCoords([d.center], canvas.width, canvas.height);
                const radius = d.radius * canvas.width / 100;
                ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
            }
            if (d.type === 'zone' && d.area && d.area.length > 2) {
                const scaledArea = scaleCoords(d.area, canvas.width, canvas.height);
                ctx.moveTo(scaledArea[0].x, scaledArea[0].y);
                for(let i = 1; i < scaledArea.length; i++) {
                    ctx.lineTo(scaledArea[i].x, scaledArea[i].y);
                }
                ctx.closePath();
                ctx.fillStyle = `${d.color}33`; // semi-transparent fill
                ctx.fill();
            }
            ctx.stroke();
            // Reset shadow for the next element
            ctx.shadowColor = 'transparent';
        });

    }, [suggestion, isVisible]);

    if (!suggestion) return null;

    return (
        <div className={`absolute inset-0 z-30 transition-opacity duration-500 pointer-events-none ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <canvas ref={canvasRef} className="w-full h-full" />
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-2xl animate-fade-in-up flex items-center gap-3 border-t-2 border-yellow-400">
                <BrainIcon className="w-6 h-6 text-yellow-400 flex-shrink-0" />
                <p className="text-base font-semibold italic">"{suggestion.suggestion}"</p>
            </div>
        </div>
    );
};

export default LiveTacticsOverlay;
