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
    const playerName = event.playerName ? ` ${event.playerName}` : '';
    switch (event.type) {
        case 'GOAL':
            return `Goal!${playerName}`;
        case 'YELLOW_CARD':
            return `Yellow Card${playerName}`;
        case 'RED_CARD':
            return `Red Card${playerName}`;
        case 'SUBSTITUTION':
            return `Sub: ${event.playerIn?.name} for ${event.playerOut?.name}`;
        case 'INJURY':
            return `Injury${playerName}`;
        case 'FOUL':
            return `Foul by${playerName}`;
        case 'SAVE':
            return `Save!${playerName}`;
        case 'SHOT_ON_TARGET':
            return `Shot on Target${playerName}`;
        case 'SHOT_OFF_TARGET':
            return `Shot Off Target${playerName}`;
        case 'CORNER':
            return `Corner: ${event.teamName}`;
        case 'OFFSIDE':
            return `Offside: ${event.teamName}`;
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
        <div className="absolute bottom-20 left-2 w-[48%] max-w-[280px] max-h-48 bg-gray-900/70 backdrop-blur-md rounded-lg shadow-lg flex flex-col animate-fade-in-fast z-20 md:bottom-auto md:top-28 md:left-4 md:w-64">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider p-2 border-b border-gray-700 text-center">
                Event Log
            </h3>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-1 space-y-1">
                {keyEvents.map(event => (
                    <div key={event.id} className="flex items-center gap-2 p-1.5 bg-black/30 rounded-md text-white text-xs group">
                        <div className="font-bold w-8 text-center">{formatTime(event.matchTime)}</div>
                        <div className="w-6 flex-shrink-0 flex items-center justify-center">{getEventIcon(event.type)}</div>
                        <div className="flex-1 truncate">{getEventText(event)}</div>
                        <button 
                            onClick={() => dispatch({ type: 'OPEN_SOCIAL_MODAL', payload: event })}
                            className="opacity-0 group-hover:opacity-100 transition-opacity bg-cyan-600/50 hover:bg-cyan-500 p-1 rounded-full"
                            title="Generate social media post"
                        >
                            <ShareIcon className="w-4 h-4"/>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EventLog;