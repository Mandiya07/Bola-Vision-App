import React from 'react';
import { useMatchContext } from '../context/MatchContext';
import type { GameEvent } from '../types';
import { StarIcon } from './icons/ControlIcons';

const ShotChart: React.FC = () => {
    const { state } = useMatchContext();
    const { events, homeTeam, awayTeam } = state;

    const shotEvents = events.filter(e => (e.type === 'GOAL' || e.type === 'SHOT_ON_TARGET') && e.location);

    return (
        <div className="relative w-full h-full bg-green-700/50 border-2 border-white/30 rounded-lg p-2 overflow-hidden" style={{ background: 'radial-gradient(ellipse at center, #2e7d32, #1b5e20)' }}>
            {/* Pitch Markings */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[18%] border-2 border-white/30 rounded-b-lg border-t-0"></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[18%] border-2 border-white/30 rounded-t-lg border-b-0"></div>
            <div className="absolute top-1/2 left-0 w-full h-px bg-white/30"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/4 aspect-square border-2 border-white/30 rounded-full"></div>

            {/* Shot Markers */}
            {shotEvents.map((event: GameEvent) => {
                const team = event.teamName === homeTeam.name ? homeTeam : awayTeam;
                const isGoal = event.type === 'GOAL';
                const title = `${isGoal ? 'Goal' : 'Shot'} by ${event.playerName || 'Unknown'} at ${Math.floor(event.matchTime/60)}'`;

                return (
                    <div
                        key={event.id}
                        className="absolute"
                        style={{ top: `${event.location!.y}%`, left: `${event.location!.x}%`, transform: 'translate(-50%, -50%)' }}
                        title={title}
                    >
                        {isGoal ? (
                            <StarIcon className="w-5 h-5" style={{ color: team.color || '#FFFFFF', filter: 'drop-shadow(0 0 3px black)' }} />
                        ) : (
                            <div className="w-3 h-3 rounded-full border-2 border-black/50" style={{ backgroundColor: team.color || '#FFFFFF' }}></div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default ShotChart;