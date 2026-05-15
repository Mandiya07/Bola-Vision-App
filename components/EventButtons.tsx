import React from 'react';
import type { GameEventType } from '../types';
import { MedicalIcon, PassIcon, TackleIcon, GoalkeeperSaveIcon } from './icons/ControlIcons';

interface EventButtonsProps {
  onLogEvent: (type: GameEventType) => void;
  disabled: boolean;
  canLogInjury: boolean;
  isPenaltyShootout?: boolean;
}

const eventConfig: { type: GameEventType; label: string; className: string; icon?: React.ReactNode }[] = [
    { type: 'GOAL', label: 'GOAL', className: 'neon-border-cyan text-neon-cyan hover:bg-neon-cyan/10' },
    { type: 'ASSIST', label: 'ASSIST', className: 'border-white/10 text-white/80 hover:border-neon-cyan/40 hover:text-white' },
    { type: 'SHOT_ON_TARGET', label: 'SHOT ON', className: 'border-white/10 text-white/80 hover:border-neon-cyan/40 hover:text-white' },
    { type: 'SHOT_OFF_TARGET', label: 'SHOT OFF', className: 'border-white/10 text-white/80 hover:border-neon-cyan/40 hover:text-white' },
    { type: 'TACKLE', label: 'TACKLE', className: 'border-white/10 text-white/80 hover:border-neon-cyan/40 hover:text-white', icon: <TackleIcon className="w-4 h-4" /> },
    { type: 'PASS', label: 'PASS', className: 'border-white/10 text-white/80 hover:border-neon-cyan/40 hover:text-white', icon: <PassIcon className="w-4 h-4" /> },
    { type: 'FOUL', label: 'FOUL', className: 'border-orange-500/30 text-orange-400 hover:border-orange-500/60 hover:text-orange-300' },
    { type: 'YELLOW_CARD', label: 'YELLOW', className: 'border-neon-yellow/30 text-neon-yellow hover:border-neon-yellow/60 hover:text-neon-yellow' },
    { type: 'RED_CARD', label: 'RED', className: 'border-red-500/30 text-red-400 hover:border-red-500/60 hover:text-red-300' },
    { type: 'INJURY', label: '', className: 'border-neon-cyan/30 text-neon-cyan hover:border-neon-cyan/60', icon: <MedicalIcon className="w-5 h-5" /> },
    { type: 'CORNER', label: 'CORNER', className: 'border-white/10 text-white/80 hover:border-neon-cyan/40 hover:text-white' },
    { type: 'OFFSIDE', label: 'OFFSIDE', className: 'border-white/10 text-white/80 hover:border-neon-cyan/40 hover:text-white' },
    { type: 'SAVE', label: 'SAVE', className: 'border-neon-emerald/30 text-neon-emerald hover:border-neon-emerald/60', icon: <GoalkeeperSaveIcon className="w-4 h-4" /> },
];

const penaltyEventConfig: { type: GameEventType; label: string; className: string; icon?: React.ReactNode }[] = [
    { type: 'PENALTY_SHOOTOUT_GOAL', label: 'GOAL', className: 'neon-border-cyan text-neon-cyan hover:bg-neon-cyan/10' },
    { type: 'PENALTY_SHOOTOUT_MISS', label: 'MISS', className: 'border-white/10 text-white/80 hover:border-neon-cyan/40 hover:text-white' },
    { type: 'PENALTY_SHOOTOUT_SAVE', label: 'SAVE', className: 'border-neon-emerald/30 text-neon-emerald hover:border-neon-emerald/60', icon: <GoalkeeperSaveIcon className="w-4 h-4" /> },
];

const tooltipClass = "absolute bottom-full mb-3 w-max max-w-xs px-4 py-2 text-[10px] font-display font-bold uppercase tracking-widest text-neon-cyan glass-panel border-neon-cyan/30 rounded-lg shadow-[0_0_15px_rgba(0,243,255,0.2)] opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none text-center z-50";

const tooltips: Record<string, string> = {
    GOAL: 'INITIATE SCORING PROTOCOL',
    ASSIST: 'LOG TACTICAL FACILITATION',
    SHOT_ON_TARGET: 'KINETIC IMPACT DETECTED (ON TARGET)',
    SHOT_OFF_TARGET: 'KINETIC IMPACT DETECTED (OFF TARGET)',
    TACKLE: 'DEFENSIVE INTERCEPTION LOGGED',
    PASS: 'DATA TRANSFER SUCCESSFUL',
    FOUL: 'VIOLATION DETECTED',
    YELLOW_CARD: 'PRIMARY WARNING ISSUED',
    RED_CARD: 'TERMINATION PROTOCOL INITIATED',
    INJURY: 'BIOMETRIC FAILURE DETECTED',
    CORNER: 'SET PIECE ACQUISITION',
    OFFSIDE: 'POSITIONAL ANOMALY DETECTED',
    SAVE: 'DEFENSIVE SHIELD ACTIVE',
    PENALTY_SHOOTOUT_GOAL: 'PENALTY CONVERTED',
    PENALTY_SHOOTOUT_MISS: 'PENALTY FAILED',
    PENALTY_SHOOTOUT_SAVE: 'PENALTY DENIED',
};

const EventButtons: React.FC<EventButtonsProps> = ({ onLogEvent, disabled, canLogInjury, isPenaltyShootout }) => {
  const currentConfig = isPenaltyShootout ? penaltyEventConfig : eventConfig;
  
  return (
    <div className={`grid gap-3 text-[10px] font-display font-bold uppercase tracking-widest ${isPenaltyShootout ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-7'}`}>
      {currentConfig.map(({ type, label, className, icon }) => {
        const isInjuryButton = type === 'INJURY';
        const isButtonDisabled = disabled || (isInjuryButton && !canLogInjury);
        return (
          <div key={type} className="relative group">
            <button
              onClick={() => onLogEvent(type)}
              className={`w-full h-12 glass-panel transition-all duration-300 disabled:opacity-20 flex flex-col items-center justify-center active:scale-95 ${className}`}
              disabled={isButtonDisabled}
            >
              {icon && icon}
              {label && <span className={icon ? 'mt-0.5 text-[8px]' : ''}>{label}</span>}
            </button>
            <span className={`${tooltipClass} left-1/2 -translate-x-1/2`}>{tooltips[type]}</span>
          </div>
        );
      })}
    </div>
  );
};

export default EventButtons;
