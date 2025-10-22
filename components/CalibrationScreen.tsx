
import React, { useState, useRef, MouseEvent } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useMatchContext } from '../context/MatchContext';
import type { FieldMarker, FieldMapping, Point } from '../types';

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
            <div className="text-center text-white bg-gray-800 p-8 rounded-lg shadow-lg max-w-lg">
              <h2 className="text-2xl font-bold mb-4 text-red-500">Camera Access Denied</h2>
              <p className="mb-6">Please allow camera access in your browser settings and reload.</p>
            </div>
        );
    }
    if (cameraState === 'inactive') {
      return (
        <div className="text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Field Calibration</h2>
          <p className="mb-8">Start your camera to map the field.</p>
          <button onClick={handleStartCamera} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg">
            Start Camera
          </button>
        </div>
      );
    }
    if (cameraState === 'error') {
      return <div className="text-center text-white bg-red-800/50 p-4 rounded-lg"><p>{cameraError}</p></div>
    }
    return null;
  };

  return (
    <div className="relative w-screen h-screen bg-black flex flex-col items-center justify-center">
      <h1 className="absolute top-5 left-5 text-2xl font-bold z-20 opacity-70" style={{ color: '#00e676' }}>BolaVision</h1>
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />
      
      <div
        ref={overlayRef}
        className="absolute top-0 left-0 w-full h-full cursor-crosshair"
        onClick={handleOverlayClick}
      >
        {Object.keys(fieldMapping).map((key, index) => {
          const point = fieldMapping[key as FieldMarker];
          return (
            point && (
              <div
                key={key}
                className="absolute w-6 h-6 bg-yellow-400 border-2 border-black rounded-full flex items-center justify-center font-bold text-sm"
                style={{ left: `${point.x}%`, top: `${point.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                {index + 1}
              </div>
            )
          );
        })}

        {/* Top line */}
        {fieldMapping.topLeftCorner && fieldMapping.topRightCorner &&
          (() => {
            const tlc = fieldMapping.topLeftCorner!;
            const trc = fieldMapping.topRightCorner!;
            const left = Math.min(tlc.x, trc.x);
            const top = tlc.y;
            const width = Math.abs(tlc.x - trc.x);
            return <div className="absolute border-t-4 border-yellow-400 border-dashed" style={{left: `${left}%`, top: `${top}%`, width: `${width}%`}}></div>
          })()
        }
        {/* Right line */}
        {fieldMapping.topRightCorner && fieldMapping.bottomRightCorner &&
          (() => {
            const trc = fieldMapping.topRightCorner!;
            const brc = fieldMapping.bottomRightCorner!;
            const left = trc.x;
            const top = Math.min(trc.y, brc.y);
            const height = Math.abs(trc.y - brc.y);
            return <div className="absolute border-l-4 border-yellow-400 border-dashed" style={{left: `${left}%`, top: `${top}%`, height: `${height}%`}}></div>
          })()
        }
        {/* Bottom line */}
        {fieldMapping.bottomRightCorner && fieldMapping.bottomLeftCorner &&
          (() => {
            const blc = fieldMapping.bottomLeftCorner!;
            const brc = fieldMapping.bottomRightCorner!;
            const left = Math.min(blc.x, brc.x);
            const top = blc.y;
            const width = Math.abs(blc.x - brc.x);
            return <div className="absolute border-t-4 border-yellow-400 border-dashed" style={{left: `${left}%`, top: `${top}%`, width: `${width}%`}}></div>
          })()
        }
        {/* Left line */}
        {fieldMapping.bottomLeftCorner && fieldMapping.topLeftCorner &&
          (() => {
            const blc = fieldMapping.bottomLeftCorner!;
            const tlc = fieldMapping.topLeftCorner!;
            const left = tlc.x;
            const top = Math.min(tlc.y, blc.y);
            const height = Math.abs(tlc.y - blc.y);
            return <div className="absolute border-l-4 border-yellow-400 border-dashed" style={{left: `${left}%`, top: `${top}%`, height: `${height}%`}}></div>
          })()
        }
      </div>

      {cameraState !== 'active' && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-20">
          {renderCameraOverlay()}
        </div>
      )}

      <div className="absolute top-5 left-1/2 -translate-x-1/2 w-11/12 max-w-lg bg-black/70 p-4 rounded-lg text-center z-10">
        <h2 className="text-xl font-bold text-yellow-300">Field Calibration</h2>
        {isComplete ? (
           <p className="text-lg mt-2 text-green-400">Calibration Complete!</p>
        ) : (
           <p className="text-lg mt-2">Step {currentStep + 1}/{MARKERS_TO_PLACE.length}: Tap the <span className="font-bold">{MARKERS_TO_PLACE[currentStep].label}</span></p>
        )}
      </div>

       <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-10">
        <div className="flex gap-4">
          <button onClick={handleReset} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg">
            Reset
          </button>
          <button onClick={handleConfirm} disabled={!isComplete} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed">
            Confirm & Start
          </button>
        </div>
        <button onClick={onCalibrationComplete} className="text-gray-300 hover:text-white text-sm underline transition-colors">
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default CalibrationScreen;
