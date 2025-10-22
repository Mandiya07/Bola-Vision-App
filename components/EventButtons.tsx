import React from 'react';
import type { GameEventType } from '../types';
import { MedicalIcon } from './icons/ControlIcons';

interface EventButtonsProps {
  onLogEvent: (type: GameEventType) => void;
  disabled: boolean;
  canLogInjury: boolean;
}

const eventConfig: { type: GameEventType; label: string; className: string; icon?: React.ReactNode }[] = [
    { type: 'GOAL', label: 'GOAL', className: 'bg-yellow-500 hover:bg-yellow-600 text-black' },
    { type: 'ASSIST', label: 'ASSIST', className: 'bg-cyan-600 hover:bg-cyan-700' },
    { type: 'SHOT_ON_TARGET', label: 'SHOT ON', className: 'bg-gray-500 hover:bg-gray-600' },
    { type: 'SHOT_OFF_TARGET', label: 'SHOT OFF', className: 'bg-gray-500 hover:bg-gray-600' },
    { type: 'TACKLE', label: 'TACKLE', className: 'bg-gray-500 hover:bg-gray-600' },
    { type: 'PASS', label: 'PASS', className: 'bg-gray-500 hover:bg-gray-600' },
    { type: 'FOUL', label: 'FOUL', className: 'bg-orange-500 hover:bg-orange-600' },
    { type: 'YELLOW_CARD', label: 'YELLOW C', className: 'bg-yellow-400 text-black hover:bg-yellow-500' },
    { type: 'RED_CARD', label: 'RED C', className: 'bg-red-500 hover:bg-red-600' },
    { type: 'INJURY', label: '', className: 'bg-cyan-500 hover:bg-cyan-600', icon: <MedicalIcon className="w-5 h-5" /> },
    { type: 'CORNER', label: 'CORNER', className: 'bg-teal-500 hover:bg-teal-600' },
    { type: 'OFFSIDE', label: 'OFFSIDE', className: 'bg-indigo-500 hover:bg-indigo-600' },
    { type: 'SAVE', label: 'SAVE', className: 'bg-cyan-500 hover:bg-cyan-600' },
];

const tooltipClass = "absolute bottom-full mb-2 w-max max-w-xs px-3 py-1.5 text-xs font-semibold text-white bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center z-10";

const tooltips: Record<string, string> = {
    GOAL: 'Log a goal for the selected player/team.',
    ASSIST: 'Log an assist for the selected player.',
    SHOT_ON_TARGET: 'Log a shot on target for the selected player/team.',
    SHOT_OFF_TARGET: 'Log a shot off target for the selected player/team.',
    TACKLE: 'Log a successful tackle for the selected player.',
    PASS: 'Log a completed pass for the selected player.',
    FOUL: 'Log a foul committed by the selected player/team.',
    YELLOW_CARD: 'Log a yellow card for the selected player.',
    RED_CARD: 'Log a red card for the selected player.',
    INJURY: 'Log an injury for the selected player and pause the clock.',
    CORNER: 'Log a corner kick for the selected team.',
    OFFSIDE: 'Log an offside call against the selected team.',
    SAVE: 'Log a save made by the selected player/team.',
};

const EventButtons: React.FC<EventButtonsProps> = ({ onLogEvent, disabled, canLogInjury }) => {
  return (
    <div className="grid grid-cols-4 md:grid-cols-7 gap-2 text-xs">
      {eventConfig.map(({ type, label, className, icon }) => {
        const isInjuryButton = type === 'INJURY';
        const isButtonDisabled = disabled || (isInjuryButton && !canLogInjury);
        return (
          <div key={type} className="relative group">
            <button
              onClick={() => onLogEvent(type)}
              className={`w-full h-full font-bold p-2 rounded-lg transition disabled:opacity-50 flex items-center justify-center ${className}`}
              disabled={isButtonDisabled}
            >
              {icon || label}
            </button>
            <span className={`${tooltipClass} left-1/2 -translate-x-1/2`}>{tooltips[type]}</span>
          </div>
        );
      })}
    </div>
  );
};

export default EventButtons;
