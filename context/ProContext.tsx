import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ProContextType {
  isPro: boolean;
  setIsPro: React.Dispatch<React.SetStateAction<boolean>>;
  isUpgradeModalOpen: boolean;
  showUpgradeModal: () => void;
  hideUpgradeModal: () => void;
}

const ProContext = createContext<ProContextType | undefined>(undefined);

export const ProContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isPro, setIsPro] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const showUpgradeModal = () => setIsUpgradeModalOpen(true);
  const hideUpgradeModal = () => setIsUpgradeModalOpen(false);

  return (
    <ProContext.Provider value={{ isPro, setIsPro, isUpgradeModalOpen, showUpgradeModal, hideUpgradeModal }}>
      {children}
    </ProContext.Provider>
  );
};

export const useProContext = (): ProContextType => {
  const context = useContext(ProContext);
  if (!context) {
    throw new Error('useProContext must be used within a ProContextProvider');
  }
  return context;
};
