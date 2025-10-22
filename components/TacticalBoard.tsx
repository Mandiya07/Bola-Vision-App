import React, { useRef, useState, useEffect, MouseEvent } from 'react';
import { PencilIcon, LineIcon, CircleIcon, UndoIcon, BrainIcon, TrashIcon } from './icons/ControlIcons';
import { useProContext } from '../context/ProContext';
import { useMatchContext } from '../context/MatchContext';
import { getTacticalSuggestion } from '../services/geminiService';
import type { TacticalSuggestion, AiDrawing } from '../types';

interface UserPath {
  id: number;
  type: 'pencil' | 'line' | 'circle';
  color: string;
  points: { x: number; y: number }[];
}

interface TacticalBoardProps {
  onClose: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

const COLORS = ['#FFEB3B', '#F44336', '#2196F3', '#FFFFFF']; // Yellow, Red, Blue, White

const TacticalBoard: React.FC<TacticalBoardProps> = ({ onClose, videoRef }) => {
  const { isPro, showUpgradeModal } = useProContext();
  const { state } = useMatchContext();

  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<'pencil' | 'line' | 'circle'>('pencil');
  const [color, setColor] = useState(COLORS[0]);
  
  const [userPaths, setUserPaths] = useState<UserPath[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentUserPath, setCurrentUserPath] = useState<UserPath | null>(null);

  const [aiSuggestion, setAiSuggestion] = useState<TacticalSuggestion | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState('');

  const scaleCoords = (points: {x: number, y: number}[], canvas: HTMLCanvasElement) => {
    return points.map(p => ({ x: p.x * canvas.width / 100, y: p.y * canvas.height / 100 }));
  }

  // Draw everything on the interactive canvas
  const draw = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. Draw AI suggestions (dashed)
    if (aiSuggestion) {
      aiSuggestion.drawings.forEach(d => {
        ctx.strokeStyle = d.color;
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        if (d.type === 'arrow' && d.start && d.end) {
          const [start] = scaleCoords([d.start], canvas);
          const [end] = scaleCoords([d.end], canvas);
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
          const [center] = scaleCoords([d.center], canvas);
          const radius = d.radius * canvas.width / 100;
          ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
        }
        if (d.type === 'zone' && d.area && d.area.length > 2) {
            const scaledArea = scaleCoords(d.area, canvas);
            ctx.moveTo(scaledArea[0].x, scaledArea[0].y);
            for(let i = 1; i < scaledArea.length; i++) {
                ctx.lineTo(scaledArea[i].x, scaledArea[i].y);
            }
            ctx.closePath();
            ctx.fillStyle = `${d.color}33`; // semi-transparent fill
            ctx.fill();
        }
        ctx.stroke();
      });
    }

    ctx.setLineDash([]); // Reset for user paths

    // 2. Draw user paths (solid)
    const allUserPaths = [...userPaths];
    if (currentUserPath) {
      allUserPaths.push(currentUserPath);
    }

    allUserPaths.forEach(path => {
      ctx.strokeStyle = path.color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      if (path.type === 'pencil' && path.points.length > 0) {
        ctx.moveTo(path.points[0].x, path.points[0].y);
        path.points.forEach(point => ctx.lineTo(point.x, point.y));
      } else if (path.type === 'line' && path.points.length === 2) {
        ctx.moveTo(path.points[0].x, path.points[0].y);
        ctx.lineTo(path.points[1].x, path.points[1].y);
      } else if (path.type === 'circle' && path.points.length === 2) {
        const [start, end] = path.points;
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
      }
      ctx.stroke();
    });
  };

  const setupCanvases = () => {
      const container = containerRef.current;
      const bgCanvas = backgroundCanvasRef.current;
      const drawCanvas = drawingCanvasRef.current;
      const video = videoRef.current;
      if (!container || !bgCanvas || !drawCanvas || !video) return;

      const { clientWidth, clientHeight } = container;
      bgCanvas.width = drawCanvas.width = clientWidth;
      bgCanvas.height = drawCanvas.height = clientHeight;

      const bgCtx = bgCanvas.getContext('2d');
      if(bgCtx) {
        bgCtx.drawImage(video, 0, 0, clientWidth, clientHeight);
      }
      draw();
  }
  
  useEffect(() => {
    // A small delay to allow the container to render and get its size
    const timeoutId = setTimeout(setupCanvases, 50);
    window.addEventListener('resize', setupCanvases);
    
    return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', setupCanvases);
    };
  }, []); // Run only on mount

  useEffect(draw, [userPaths, currentUserPath, aiSuggestion]);


  const getPoint = (e: MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const point = getPoint(e);
    setCurrentUserPath({
      id: Date.now(),
      type: tool,
      color,
      points: [point],
    });
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentUserPath) return;
    const point = getPoint(e);
    if (tool === 'pencil') {
      setCurrentUserPath(prev => prev ? { ...prev, points: [...prev.points, point] } : null);
    } else {
      setCurrentUserPath(prev => prev ? { ...prev, points: [prev.points[0], point] } : null);
    }
  };

  const handleMouseUp = () => {
    if (currentUserPath) {
      if (currentUserPath.points.length > 1 || (currentUserPath.type === 'pencil' && currentUserPath.points.length > 0)) {
         setUserPaths(prev => [...prev, currentUserPath]);
      }
    }
    setIsDrawing(false);
    setCurrentUserPath(null);
  };
  
  const handleUndo = () => setUserPaths(prev => prev.slice(0, -1));
  const handleClear = () => setUserPaths([]);

  const handleGetAiSuggestion = async () => {
    if (!isPro) {
        showUpgradeModal();
        return;
    }
    setIsLoadingAI(true);
    setAiError('');
    setAiSuggestion(null);

    const video = videoRef.current;
    if (!video) {
        setAiError("Video source not available.");
        setIsLoadingAI(false);
        return;
    }

    try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not create canvas context.");

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Frame = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        
        const suggestion = await getTacticalSuggestion(base64Frame, state);
        setAiSuggestion(suggestion);
    } catch (e: any) {
        setAiError(e.message || "An error occurred.");
    } finally {
        setIsLoadingAI(false);
    }
  };

  return (
    <div ref={containerRef} className="absolute inset-0 bg-black/50 z-40 flex items-center justify-center animate-fade-in-fast" onClick={(e) => {if (e.target === containerRef.current) onClose()}}>
      <canvas ref={backgroundCanvasRef} className="absolute inset-0" />
      <canvas
        ref={drawingCanvasRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

       {(aiSuggestion || isLoadingAI || aiError) && (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-11/12 max-w-2xl bg-gray-900/80 p-3 rounded-lg text-center z-10 text-white animate-fade-in-fast">
                {isLoadingAI && <div className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>AI Tactician is analyzing...</span></div>}
                {aiError && <p className="text-red-400">{aiError}</p>}
                {aiSuggestion?.suggestion && <p className="italic">"{aiSuggestion.suggestion}"</p>}
            </div>
       )}

      <div className="absolute top-5 right-5 bg-gray-900/80 p-2 rounded-lg flex flex-col gap-2 shadow-lg z-20">
        <button onClick={onClose} className="text-white bg-red-600 hover:bg-red-700 w-10 h-10 flex items-center justify-center rounded-md font-bold text-lg">&times;</button>
        <button onClick={handleUndo} className="text-white bg-gray-700 hover:bg-gray-600 w-10 h-10 flex items-center justify-center rounded-md" title="Undo"><UndoIcon className="w-6 h-6"/></button>
        <button onClick={handleClear} className="text-white bg-gray-700 hover:bg-gray-600 w-10 h-10 flex items-center justify-center rounded-md" title="Clear Drawings"><TrashIcon className="w-6 h-6"/></button>
      </div>
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-gray-900/80 p-2 rounded-lg flex items-center gap-2 shadow-lg z-20">
        <button onClick={handleGetAiSuggestion} className="bg-indigo-600 hover:bg-indigo-700 px-3 h-12 flex items-center justify-center rounded-md text-sm font-bold gap-2" disabled={isLoadingAI}>
            <BrainIcon className="w-6 h-6"/>
            AI Suggestion {!isPro && '🏆'}
        </button>
        <div className="w-px h-10 bg-gray-700"></div>
        <div className="flex gap-1 bg-gray-800 p-1 rounded-md">
            <button onClick={() => setTool('pencil')} className={`w-10 h-10 flex items-center justify-center rounded-md transition-colors ${tool === 'pencil' ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'}`} title="Pencil"><PencilIcon className="w-6 h-6"/></button>
            <button onClick={() => setTool('line')} className={`w-10 h-10 flex items-center justify-center rounded-md transition-colors ${tool === 'line' ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'}`} title="Line"><LineIcon className="w-6 h-6"/></button>
            <button onClick={() => setTool('circle')} className={`w-10 h-10 flex items-center justify-center rounded-md transition-colors ${tool === 'circle' ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'}`} title="Circle"><CircleIcon className="w-6 h-6"/></button>
        </div>
        <div className="w-px h-10 bg-gray-700"></div>
        <div className="flex gap-1 bg-gray-800 p-1 rounded-md">
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} className={`w-10 h-10 rounded-md transition-all ${color === c ? 'ring-2 ring-white scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: c }} title={`Color ${c}`}></button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TacticalBoard;