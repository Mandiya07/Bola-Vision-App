import React, { useState, useEffect } from 'react';
import { validateApiKey } from '../services/geminiService';

interface SelectKeyScreenProps {
  onKeySelected: () => void;
}

const SelectKeyScreen: React.FC<SelectKeyScreenProps> = ({ onKeySelected }) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isDevEnvironment, setIsDevEnvironment] = useState(false);

  useEffect(() => {
    // @ts-ignore
    if (window.aistudio) {
      setIsDevEnvironment(true);
    }
  }, []);


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

  if (!isDevEnvironment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in">
        <div className="w-full max-w-lg text-center">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold" style={{ color: '#00e676' }}>BolaVision</h1>
            <p className="text-gray-400 italic mt-2">“Your Game, Our Vision.”</p>
          </div>
          <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-red-500">
            <h1 className="text-2xl font-bold text-center text-red-400 mb-4">
              Configuration Error
            </h1>
            <p className="text-gray-300 mb-6">
              The Gemini API key is not configured correctly on the server.
            </p>
            <div className="bg-gray-900/50 p-4 rounded-md text-left text-sm text-gray-400">
              <p className="font-semibold text-white">For Administrators:</p>
              <p className="mt-2">To resolve this, please set the <code className="bg-gray-700 p-1 rounded font-mono text-cyan-300">API_KEY</code> environment variable in your deployment settings with a valid Gemini API key.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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