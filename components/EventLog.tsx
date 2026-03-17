import React, { useRef, useEffect } from 'react';
import { useMatchContext } from '../context/MatchContext';
import { GameEvent } from '../types';
import { GoalIcon, YellowCardIcon, RedCardIcon, SubstitutionIcon, MedicalIcon, ShareIcon, FoulIcon, CornerIcon, OffsideIcon, ShotOnTargetIcon, ShotOffTargetIcon, GoalkeeperSaveIcon } from './icons/ControlIcons';

const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    return `${minutes}'`;
};

const getEventIcon = (type: GameEvent['type']) => {
    switch (type) {
        case 'GOAL':
            return <GoalIcon className="w-5 h-5 text-yellow-300" />;
        case 'YELLOW_CARD':
            return <YellowCardIcon className="w-5 h-5" />;
        case 'RED_CARD':
            return <RedCardIcon className="w-5 h-5" />;
        case 'SUBSTITUTION':
            return <SubstitutionIcon className="w-5 h-5 text-orange-400" />;
        case 'INJURY':
            return <MedicalIcon className="w-5 h-5 text-cyan-400" />;
        case 'FOUL':
            return <FoulIcon className="w-5 h-5 text-orange-400" />;
        case 'SAVE':
            return <GoalkeeperSaveIcon className="w-5 h-5 text-blue-400" />;
        case 'SHOT_ON_TARGET':
            return <ShotOnTargetIcon className="w-5 h-5 text-green-400" />;
        case 'SHOT_OFF_TARGET':
            return <ShotOffTargetIcon className="w-5 h-5 text-gray-500" />;
        case 'CORNER':
            return <CornerIcon className="w-5 h-5 text-gray-300" />;
        case 'OFFSIDE':
            return <OffsideIcon className="w-5 h-5 text-indigo-400" />;
        default:
            return null;
    }
}

const getEventText = (event: GameEvent): string => {
    const playerName = event.playerName ? ` ${event.playerName.toUpperCase()}` : '';
    switch (event.type) {
        case 'GOAL':
            return `SCORING PROTOCOL: ${playerName}`;
        case 'YELLOW_CARD':
            return `PRIMARY WARNING: ${playerName}`;
        case 'RED_CARD':
            return `TERMINATION: ${playerName}`;
        case 'SUBSTITUTION':
            return `UNIT SWAP: ${event.playerIn?.name.toUpperCase()} ↔ ${event.playerOut?.name.toUpperCase()}`;
        case 'INJURY':
            return `BIOMETRIC FAILURE: ${playerName}`;
        case 'FOUL':
            return `VIOLATION: ${playerName}`;
        case 'SAVE':
            return `DEFENSIVE SHIELD: ${playerName}`;
        case 'SHOT_ON_TARGET':
            return `KINETIC IMPACT (ON): ${playerName}`;
        case 'SHOT_OFF_TARGET':
            return `KINETIC IMPACT (OFF): ${playerName}`;
        case 'CORNER':
            return `SET PIECE: ${event.teamName.toUpperCase()}`;
        case 'OFFSIDE':
            return `POSITIONAL ANOMALY: ${event.teamName.toUpperCase()}`;
        default:
            return '';
    }
}

const EventLog: React.FC = () => {
    const { state, dispatch } = useMatchContext();
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastEventCount = useRef(0);

    const keyEvents = state.events.filter(e => 
        e.type === 'GOAL' || 
        e.type === 'YELLOW_CARD' || 
        e.type === 'RED_CARD' || 
        e.type === 'SUBSTITUTION' ||
        e.type === 'INJURY' ||
        e.type === 'FOUL' ||
        e.type === 'SAVE' ||
        e.type === 'SHOT_ON_TARGET' ||
        e.type === 'SHOT_OFF_TARGET' ||
        e.type === 'CORNER' ||
        e.type === 'OFFSIDE'
    );
    
    useEffect(() => {
        if (keyEvents.length > lastEventCount.current) {
             scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
       lastEventCount.current = keyEvents.length;
    }, [keyEvents.length]);
    
    if (keyEvents.length === 0) {
        return null;
    }

    return (
        <div className="absolute bottom-24 left-4 w-[60%] max-w-[320px] max-h-64 glass-panel border-white/5 rounded-2xl shadow-2xl flex flex-col animate-fade-in-fast z-20 md:bottom-auto md:top-32 md:left-6 md:w-72 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-neon-cyan/5 to-transparent pointer-events-none" />
            <h3 className="text-[10px] font-display font-bold text-neon-cyan uppercase tracking-[0.3em] p-3 border-b border-white/5 text-center bg-white/5">
                Tactical Event Feed
            </h3>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-hide">
                {keyEvents.map(event => (
                    <div key={event.id} className="flex items-center gap-3 p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-white text-[10px] font-body font-medium group transition-all duration-300">
                        <div className="font-display font-bold text-neon-cyan w-10 text-center border-r border-white/10 pr-2">{formatTime(event.matchTime)}</div>
                        <div className="w-6 flex-shrink-0 flex items-center justify-center filter drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">{getEventIcon(event.type)}</div>
                        <div className="flex-1 truncate tracking-wider">{getEventText(event)}</div>
                        <button 
                            onClick={() => dispatch({ type: 'OPEN_SOCIAL_MODAL', payload: event })}
                            className="opacity-0 group-hover:opacity-100 transition-all duration-300 bg-neon-cyan/20 hover:bg-neon-cyan text-neon-cyan hover:text-black p-1.5 rounded-lg border border-neon-cyan/30"
                            title="Generate social media post"
                        >
                            <ShareIcon className="w-3.5 h-3.5"/>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EventLog;