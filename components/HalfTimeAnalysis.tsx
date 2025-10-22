import React, { useState, useEffect } from 'react';
import { useMatchContext } from '../context/MatchContext';
import { useProContext } from '../context/ProContext';
import { generateHalfTimeAnalysis } from '../services/geminiService';
import { BrainIcon } from './icons/ControlIcons';

interface HalfTimeAnalysisProps {
    period: 'First Half' | 'Full Match';
}

const HalfTimeAnalysis: React.FC<HalfTimeAnalysisProps> = ({ period }) => {
    const { state } = useMatchContext();
    const { isPro, showUpgradeModal } = useProContext();
    const [analysis, setAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isPro) {
            return;
        }

        const fetchAnalysis = async () => {
            setIsLoading(true);
            setError('');
            try {
                const result = await generateHalfTimeAnalysis(state, period);
                setAnalysis(result);
            } catch (e: any) {
                setError(e.message || 'Failed to get analysis.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalysis();
    }, [isPro, state, period]);

    if (!isPro) {
        return (
             <div className="w-full max-w-2xl bg-gray-800/80 p-4 rounded-lg text-center">
                <h3 className="text-lg font-bold text-yellow-400 mb-2">Unlock AI Analysis 🏆</h3>
                <p className="text-gray-300 mb-4 text-sm">Get tactical insights and a summary of the action by upgrading to Pro.</p>
                <button
                    onClick={showUpgradeModal}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-6 rounded-lg transition"
                >
                    Upgrade Now
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl bg-gray-800/80 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-center text-yellow-400 mb-2 flex items-center justify-center gap-2">
                <BrainIcon className="w-6 h-6" />
                AI Tactical Analysis
            </h3>
            <div className="bg-black/40 p-3 rounded-md min-h-[120px] max-h-48 overflow-y-auto text-sm text-gray-200">
                {isLoading && (
                    <div className="flex items-center justify-center h-full gap-3 text-gray-400">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>AI is analyzing the {period.toLowerCase()}...</span>
                    </div>
                )}
                {error && <p className="text-red-40á00 text-center">{error}</p>}
                {analysis && <p className="whitespace-pre-wrap animate-fade-in-fast">{analysis}</p>}
            </div>
        </div>
    );
};

export default HalfTimeAnalysis;
