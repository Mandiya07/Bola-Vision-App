
import React, { useState, useRef, MouseEvent } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useMatchContext } from '../context/MatchContext';
import type { FieldMarker, FieldMapping } from '../types';

interface CalibrationScreenProps {
  onCalibrationComplete: () => void;
}

const MARKERS_TO_PLACE: { id: FieldMarker; label: string }[] = [
  { id: 'topLeftCorner', label: 'Top-Left Field Corner' },
  { id: 'topRightCorner', label: 'Top-Right Field Corner' },
  { id: 'bottomRightCorner', label: 'Bottom-Right Field Corner' },
  { id: 'bottomLeftCorner', label: 'Bottom-Left Field Corner' },
  { id: 'centerSpot', label: 'Center Spot' },
];

const CalibrationScreen: React.FC<CalibrationScreenProps> = ({ onCalibrationComplete }) => {
  const { dispatch } = useMatchContext();
  const {
    videoRef,
    cameraState,
    permissionStatus,
    cameraError,
    handleStartCamera,
  } = useCamera();

  const [currentStep, setCurrentStep] = useState(0);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (cameraState !== 'active' || currentStep >= MARKERS_TO_PLACE.length) return;

    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const currentMarkerId = MARKERS_TO_PLACE[currentStep].id;

    setFieldMapping(prev => ({
      ...prev,
      [currentMarkerId]: { x, y }
    }));
    setCurrentStep(prev => prev + 1);
  };
  
  const handleReset = () => {
    setFieldMapping({});
    setCurrentStep(0);
  };
  
  const handleConfirm = () => {
    dispatch({ type: 'SET_FIELD_MAPPING', payload: fieldMapping });
    onCalibrationComplete();
  };

  const isComplete = currentStep >= MARKERS_TO_PLACE.length;

  const renderCameraOverlay = () => {
     if (permissionStatus === 'denied') {
        return (
            <div className="text-center glass-panel border-neon-yellow/30 p-8 rounded-[2rem] shadow-2xl max-w-lg animate-fade-in">
              <h2 className="text-2xl font-display font-black mb-4 text-neon-yellow uppercase tracking-tighter italic">Access Denied</h2>
              <p className="mb-6 font-body text-white/70">Optical sensors require authorization. Please enable camera access in system settings.</p>
              <button onClick={() => window.location.reload()} className="glass-panel border-white/10 bg-white/5 hover:bg-white/10 text-white font-display font-bold py-3 px-8 rounded-xl uppercase tracking-widest transition-all">
                Re-Initialize
              </button>
            </div>
        );
    }
    if (cameraState === 'inactive') {
      return (
        <div className="text-center glass-panel border-white/10 p-12 rounded-[3rem] shadow-2xl animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-6 border-2 border-neon-cyan/30 rounded-full flex items-center justify-center animate-pulse">
            <div className="w-12 h-12 border-2 border-neon-cyan rounded-full" />
          </div>
          <h2 className="text-4xl font-display font-black mb-4 text-white uppercase tracking-widest italic">Sensor Calibration</h2>
          <p className="mb-8 font-body text-white/50 uppercase tracking-[0.2em] text-xs">Initialize optical feed to map tactical grid</p>
          <button 
            onClick={handleStartCamera} 
            className="glass-panel border-neon-cyan/30 bg-neon-cyan/5 hover:bg-neon-cyan/10 text-neon-cyan font-display font-black py-4 px-12 rounded-2xl text-lg uppercase tracking-[0.3em] transition-all hover:scale-105 hover:border-neon-cyan shadow-[0_0_30px_rgba(0,243,255,0.1)]"
          >
            Start Optical Feed
          </button>
        </div>
      );
    }
    if (cameraState === 'error') {
      return (
        <div className="text-center glass-panel border-neon-yellow/30 p-8 rounded-2xl animate-fade-in">
          <p className="font-display font-bold text-neon-yellow uppercase tracking-widest">{cameraError}</p>
        </div>
      )
    }
    return null;
  };

  return (
    <div className="relative w-screen h-screen bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute top-8 left-8 flex flex-col items-start z-30 pointer-events-none">
          <h1 className="text-3xl font-display font-black text-neon-cyan uppercase tracking-tighter italic">BolaVision</h1>
          <p className="text-[10px] font-display font-bold text-white/30 uppercase tracking-[0.5em] mt-1">Calibration Mode // Grid Sync</p>
      </div>

      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover opacity-60 grayscale-[0.5] contrast-125"
        autoPlay
        playsInline
        muted
      />
      
      {/* HUD Overlays */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="scanline opacity-20" />
        <div className="absolute inset-0 border-[40px] border-slate-950/40" />
        <div className="absolute top-1/2 left-0 w-full h-px bg-white/5" />
        <div className="absolute top-0 left-1/2 w-px h-full bg-white/5" />
        
        {/* Corner Accents */}
        <div className="absolute top-12 left-12 w-8 h-8 border-t-2 border-l-2 border-neon-cyan/50" />
        <div className="absolute top-12 right-12 w-8 h-8 border-t-2 border-r-2 border-neon-cyan/50" />
        <div className="absolute bottom-12 left-12 w-8 h-8 border-b-2 border-l-2 border-neon-cyan/50" />
        <div className="absolute bottom-12 right-12 w-8 h-8 border-b-2 border-r-2 border-neon-cyan/50" />
      </div>
      
      <div
        ref={overlayRef}
        className="absolute top-0 left-0 w-full h-full cursor-crosshair z-20"
        onClick={handleOverlayClick}
      >
        {Object.keys(fieldMapping).map((key, index) => {
          const point = fieldMapping[key as FieldMarker];
          return (
            point && (
              <div
                key={key}
                className="absolute group"
                style={{ left: `${point.x}%`, top: `${point.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                <div className="absolute -inset-4 border border-neon-cyan/30 rounded-full animate-ping opacity-50" />
                <div className="relative w-8 h-8 glass-panel border-neon-cyan bg-neon-cyan/20 rounded-full flex items-center justify-center font-display font-black text-neon-cyan text-xs shadow-[0_0_15px_rgba(0,243,255,0.5)]">
                  {index + 1}
                </div>
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-display font-bold text-neon-cyan uppercase tracking-widest bg-slate-950/80 px-2 py-1 rounded border border-neon-cyan/30">
                  {MARKERS_TO_PLACE[index].label}
                </div>
              </div>
            )
          );
        })}

        {/* Tactical Grid Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {fieldMapping.topLeftCorner && fieldMapping.topRightCorner && (
            <line 
              x1={`${fieldMapping.topLeftCorner.x}%`} y1={`${fieldMapping.topLeftCorner.y}%`}
              x2={`${fieldMapping.topRightCorner.x}%`} y2={`${fieldMapping.topRightCorner.y}%`}
              stroke="rgba(0, 243, 255, 0.5)" strokeWidth="2" strokeDasharray="8 4" filter="url(#glow)"
            />
          )}
          {fieldMapping.topRightCorner && fieldMapping.bottomRightCorner && (
            <line 
              x1={`${fieldMapping.topRightCorner.x}%`} y1={`${fieldMapping.topRightCorner.y}%`}
              x2={`${fieldMapping.bottomRightCorner.x}%`} y2={`${fieldMapping.bottomRightCorner.y}%`}
              stroke="rgba(0, 243, 255, 0.5)" strokeWidth="2" strokeDasharray="8 4" filter="url(#glow)"
            />
          )}
          {fieldMapping.bottomRightCorner && fieldMapping.bottomLeftCorner && (
            <line 
              x1={`${fieldMapping.bottomRightCorner.x}%`} y1={`${fieldMapping.bottomRightCorner.y}%`}
              x2={`${fieldMapping.bottomLeftCorner.x}%`} y2={`${fieldMapping.bottomLeftCorner.y}%`}
              stroke="rgba(0, 243, 255, 0.5)" strokeWidth="2" strokeDasharray="8 4" filter="url(#glow)"
            />
          )}
          {fieldMapping.bottomLeftCorner && fieldMapping.topLeftCorner && (
            <line 
              x1={`${fieldMapping.bottomLeftCorner.x}%`} y1={`${fieldMapping.bottomLeftCorner.y}%`}
              x2={`${fieldMapping.topLeftCorner.x}%`} y2={`${fieldMapping.topLeftCorner.y}%`}
              stroke="rgba(0, 243, 255, 0.5)" strokeWidth="2" strokeDasharray="8 4" filter="url(#glow)"
            />
          )}
        </svg>
      </div>

      {cameraState !== 'active' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-40">
          {renderCameraOverlay()}
        </div>
      )}

      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-11/12 max-w-lg glass-panel border-white/10 bg-slate-950/40 p-6 rounded-3xl text-center z-30 backdrop-blur-md">
        <h2 className="text-xs font-display font-bold text-white/40 uppercase tracking-[0.4em] mb-2">Tactical Grid Alignment</h2>
        {isComplete ? (
           <div className="flex items-center justify-center gap-3 text-neon-emerald animate-pulse">
             <div className="w-2 h-2 rounded-full bg-neon-emerald shadow-[0_0_10px_rgba(16,255,145,1)]" />
             <p className="text-lg font-display font-black uppercase tracking-widest italic">Grid Synchronized</p>
           </div>
        ) : (
           <div className="space-y-1">
             <p className="text-lg font-display font-black text-white uppercase tracking-widest italic">
               Step {currentStep + 1} <span className="text-white/30">/ {MARKERS_TO_PLACE.length}</span>
             </p>
             <p className="text-[10px] font-display font-bold text-neon-cyan uppercase tracking-[0.2em]">
               Target: <span className="text-white">{MARKERS_TO_PLACE[currentStep].label}</span>
             </p>
           </div>
        )}
      </div>

       <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6 z-30 w-full max-w-md px-4">
        <div className="flex gap-4 w-full">
          <button 
            onClick={handleReset} 
            className="flex-1 glass-panel border-white/10 bg-white/5 hover:bg-white/10 text-white font-display font-bold py-4 px-6 rounded-2xl uppercase tracking-widest transition-all hover:border-neon-yellow hover:text-neon-yellow"
          >
            Reset
          </button>
          <button 
            onClick={handleConfirm} 
            disabled={!isComplete} 
            className="flex-[2] glass-panel border-neon-cyan/30 bg-neon-cyan/5 hover:bg-neon-cyan/10 text-neon-cyan font-display font-black py-4 px-6 rounded-2xl uppercase tracking-[0.2em] transition-all hover:scale-105 hover:border-neon-cyan disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed shadow-[0_0_30px_rgba(0,243,255,0.1)]"
          >
            Confirm & Sync
          </button>
        </div>
        <button 
          onClick={onCalibrationComplete} 
          className="text-white/30 hover:text-white text-[10px] font-display font-bold uppercase tracking-[0.4em] transition-all hover:tracking-[0.5em]"
        >
          Bypass Calibration
        </button>
      </div>
    </div>
  );
};

export default CalibrationScreen;
