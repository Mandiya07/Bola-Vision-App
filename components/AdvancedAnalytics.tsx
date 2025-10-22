import React, { useState } from 'react';
import { useMatchContext } from '../context/MatchContext';
import HeatmapDisplay from './HeatmapDisplay';
import ShotChart from './ShotChart';
import { StarIcon } from './icons/ControlIcons';

const AdvancedAnalytics: React.FC = () => {
    const { state } = useMatchContext();
    const [view, setView] = useState<'heatmap' | 'shotChart'>('heatmap');
    const [heatmapTeam, setHeatmapTeam] = useState<'home' | 'away'>('home');

    const { homeTeam, awayTeam, heatmapData } = state;
    const hasHeatmapData = heatmapData.home.length > 0 || heatmapData.away.length > 0;

    const ShotChartLegend = () => (
         <div className="flex flex-col gap-2 mt-2 text-xs text-gray-300 bg-gray-900/50 p-3 rounded-lg">
            <h4 className="text-base font-bold text-white text-center mb-1">Legend</h4>
            <div className="flex items-center gap-2"><StarIcon className="w-4 h-4" style={{color: homeTeam.color}} /> {homeTeam.name} Goal</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{backgroundColor: homeTeam.color}} /> {homeTeam.name} Shot</div>
            <div className="flex items-center gap-2"><StarIcon className="w-4 h-4" style={{color: awayTeam.color}} /> {awayTeam.name} Goal</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{backgroundColor: awayTeam.color}} /> {awayTeam.name} Shot</div>
        </div>
    );

    return (
        <div className="flex flex-col items-center w-full">
            <div className="flex gap-1 p-1 bg-gray-900/50 rounded-lg mb-2">
                <button 
                    onClick={() => setView('heatmap')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition ${view === 'heatmap' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                    Player Heatmap
                </button>
                 <button 
                    onClick={() => setView('shotChart')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition ${view === 'shotChart' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                    Shot Chart
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 items-start justify-center gap-4 w-full mt-2">
                {/* Pitch Display Column */}
                <div className="w-full flex justify-center items-start">
                    <div className="relative w-full max-w-[350px] aspect-[7/10]">
                        {view === 'heatmap' && hasHeatmapData && (
                            <HeatmapDisplay
                                points={heatmapTeam === 'home' ? heatmapData.home : heatmapData.away}
                                color={heatmapTeam === 'home' ? (homeTeam.color || '#3b82f6') : (awayTeam.color || '#ef4444')}
                            />
                        )}
                        {view === 'shotChart' && <ShotChart />}
                        {view === 'heatmap' && !hasHeatmapData && (
                            <div className="absolute inset-0 flex items-center justify-center text-center text-gray-400 p-4 bg-gray-800 rounded-lg">
                                <div>
                                    <p className="text-sm">No heatmap data available yet.</p>
                                    <p className="text-xs mt-1">Enable 'Advanced Analysis' in the control panel during the match to collect player position data.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Controls/Legend Column */}
                <div className="w-full flex flex-col items-center text-center">
                    {view === 'heatmap' && (
                        <>
                            <h3 className="text-lg font-bold text-white mb-2">Player Activity Heatmap</h3>
                            {hasHeatmapData && (
                                <div className="flex flex-col items-center gap-2">
                                    <p className="text-gray-300 text-sm">Select a team:</p>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setHeatmapTeam('home')}
                                            className={`px-3 py-1 text-sm rounded-md font-semibold transition ${heatmapTeam === 'home' ? 'ring-2 ring-white' : ''}`}
                                            style={{backgroundColor: homeTeam.color || '#3b82f6', color: '#fff', textShadow: '1px 1px 2px black'}}
                                        >
                                            {homeTeam.name}
                                        </button>
                                        <button
                                            onClick={() => setHeatmapTeam('away')}
                                            className={`px-3 py-1 text-sm rounded-md font-semibold transition ${heatmapTeam === 'away' ? 'ring-2 ring-white' : ''}`}
                                            style={{backgroundColor: awayTeam.color || '#ef4444', color: '#fff', textShadow: '1px 1px 2px black'}}
                                        >
                                            {awayTeam.name}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {view === 'shotChart' && (
                        <div className="flex flex-col items-center">
                            <h3 className="text-lg font-bold text-white mb-2">Shot Chart</h3>
                            <ShotChartLegend />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdvancedAnalytics;