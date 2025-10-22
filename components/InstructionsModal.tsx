import React from 'react';

interface InstructionsModalProps {
    onClose: () => void;
}

const InstructionsModal: React.FC<InstructionsModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 rounded-xl shadow-2xl w-11/12 max-w-2xl p-8 text-white flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex-shrink-0">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-bold text-yellow-400">Camera Setup Guide</h2>
                        <button onClick={onClose} className="text-4xl text-gray-400 hover:text-white leading-none">&times;</button>
                    </div>
                </div>
                
                <div className="overflow-y-auto max-h-[60vh] pr-4 space-y-4 text-gray-300">
                    <div className="p-4 bg-gray-700 rounded-lg">
                        <h3 className="font-semibold text-lg text-white mb-1">1. Position at Center Line</h3>
                        <p>Mount your camera or stand near the center line of the field. This gives a balanced view of both halves of the pitch.</p>
                    </div>
                    <div className="p-4 bg-gray-700 rounded-lg">
                        <h3 className="font-semibold text-lg text-white mb-1">2. Elevate for Tactical View</h3>
                        <p>Record from an elevated position (e.g., in the stands or on a tall tripod). This helps capture player formations and tactical movements effectively.</p>
                    </div>
                    <div className="p-4 bg-gray-700 rounded-lg">
                        <h3 className="font-semibold text-lg text-white mb-1">3. Ensure Good Lighting & Stability</h3>
                        <p>Film with the sun behind you if possible. Use a tripod or gimbal for steady, professional-looking footage. Avoid shaky hands!</p>
                    </div>
                     <div className="p-4 bg-gray-700 rounded-lg">
                        <h3 className="font-semibold text-lg text-white mb-1">4. Frame the Action</h3>
                        <p>Keep a wide enough shot to see the ball and the players immediately around it. The app's AI can help with automatic tracking and zooming (in advanced mode).</p>
                    </div>
                    <div className="p-4 bg-gray-700 rounded-lg">
                        <h3 className="font-semibold text-lg text-white mb-1">5. Use Multi-Camera Features</h3>
                        <p>Use the controls to switch between virtual cameras like 'Main', 'Goal Cam', or enable 'Auto' mode for AI-powered camera switching to capture the best angle of the action.</p>
                    </div>
                </div>

                <div className="flex-shrink-0 pt-6">
                  <button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700 font-bold py-3 rounded-lg transition">
                      Got it!
                  </button>
                </div>
            </div>
        </div>
    );
};

export default InstructionsModal;