import React from 'react';

interface SelectKeyScreenProps {
  onKeySelected: () => void;
}

const SelectKeyScreen: React.FC<SelectKeyScreenProps> = ({ onKeySelected }) => {
  const handleSelectKey = async () => {
    try {
        // @ts-ignore - aistudio is globally available in this environment
        await window.aistudio.openSelectKey();
    } catch (error) {
        console.error("Could not open API key selection dialog:", error);
    }
    // Optimistically assume the user selected a key to unblock the UI.
    // Error handling in the Gemini service will catch failures and reset if needed.
    onKeySelected();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in">
      <div className="w-full max-w-md text-center">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold" style={{ color: '#00e676' }}>BolaVision</h1>
          <p className="text-gray-400 italic mt-2">“Your Game, Our Vision.”</p>
        </div>
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-2xl font-bold text-center text-white mb-4">
            API Key Required
          </h1>
          <p className="text-gray-300 mb-6">
            To use the AI-powered features of BolaVision, you need to select a Gemini API key from your project.
          </p>
          <button
            onClick={handleSelectKey}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 text-lg"
          >
            Select API Key
          </button>
           <p className="text-xs text-gray-400 mt-4">
            Use of the Gemini API may incur costs. Please review the 
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline ml-1">
              billing documentation
            </a> 
            for details.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SelectKeyScreen;