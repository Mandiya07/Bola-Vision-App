import React from 'react';
import { useProContext } from '../context/ProContext';

const UpgradeModal: React.FC = () => {
    const { isUpgradeModalOpen, hideUpgradeModal, setIsPro } = useProContext();

    if (!isUpgradeModalOpen) return null;
    
    const handleUpgrade = () => {
        setIsPro(true);
        hideUpgradeModal();
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[100] animate-fade-in" onClick={hideUpgradeModal}>
            <div className="bg-gray-800 rounded-xl shadow-2xl w-11/12 max-w-lg p-8 text-white flex flex-col border-2 border-yellow-400" onClick={e => e.stopPropagation()}>
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-yellow-400">Unlock Pro Features! 🏆</h2>
                    <p className="text-gray-300 mt-2">Take your broadcasts to the next level with our professional toolkit.</p>
                </div>
                
                <ul className="mt-6 space-y-3 text-gray-200">
                    <li className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-yellow-400 mt-1">☁️</span>
                        <div>
                            <h3 className="font-semibold">Cloud-Based Match Storage</h3>
                            <p className="text-sm text-gray-400">Automatically save and sync your match recordings and data to the cloud. Access them anytime, anywhere.</p>
                        </div>
                    </li>
                    <li className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-yellow-400 mt-1">📊</span>
                        <div>
                            <h3 className="font-semibold">Advanced Analytics Reports</h3>
                            <p className="text-sm text-gray-400">Generate detailed reports with player heatmaps, shot charts, and advanced performance metrics.</p>
                        </div>
                    </li>
                     <li className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-yellow-400 mt-1">🎨</span>
                        <div>
                            <h3 className="font-semibold">Custom Scoreboard Templates</h3>
                            <p className="text-sm text-gray-400">Choose from a variety of professional scoreboard layouts to match your broadcast style.</p>
                        </div>
                    </li>
                    <li className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-yellow-400 mt-1">🎥</span>
                        <div>
                            <h3 className="font-semibold">Multi-Camera Support</h3>
                            <p className="text-sm text-gray-400">Manually switch between camera angles or let our AI Director take over for dynamic, professional cuts.</p>
                        </div>
                    </li>
                </ul>

                <div className="mt-8 flex flex-col gap-3">
                  <button onClick={handleUpgrade} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-lg transition-transform transform hover:scale-105">
                      Upgrade Now
                  </button>
                  <button onClick={hideUpgradeModal} className="w-full bg-gray-600 hover:bg-gray-700 font-bold py-2 rounded-lg transition">
                      Maybe Later
                  </button>
                </div>
            </div>
        </div>
    );
};

export default UpgradeModal;
