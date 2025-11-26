import React, { useState } from 'react';
import { validateApiKey } from '../services/geminiService';

interface SelectKeyScreenProps {
  onKeySelected: () => void;
}

const SelectKeyScreen: React.FC<SelectKeyScreenProps> = ({ onKeySelected }) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSelectKey = async () => {
    setValidationError('');
    try {
        // @ts-ignore - aistudio is globally available in this environment
        await window.aistudio.openSelectKey();
        setIsValidating(true);
        const { isValid, error } = await validateApiKey();
        if (isValid) {
            onKeySelected();
        } else {
            setValidationError(error || 'The selected key is invalid. Please try another.');
        }
    } catch (error) {
        console.error("Could not open API key selection dialog:", error);
        setValidationError('The key selection dialog could not be opened.');
    } finally {
        setIsValidating(false);
    }
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
          
          {isValidating ? (
            <div className="w-full bg-gray-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Validating Key...
            </div>
          ) : (
            <button
                onClick={handleSelectKey}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 text-lg"
            >
                Select API Key
            </button>
          )}

          {validationError && (
            <div className="bg-red-900/50 border border-red-500 text-red-300 text-sm rounded-md p-3 mt-4 text-left">
                <p className="font-bold">Validation Failed</p>
                <p>{validationError}</p>
            </div>
          )}

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