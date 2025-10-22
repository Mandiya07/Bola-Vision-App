import React from 'react';

interface AdBannerProps {
  imageUrl?: string;
}

const AdBanner: React.FC<AdBannerProps> = ({ imageUrl }) => {
  const displayUrl = imageUrl || "https://picsum.photos/300/600?random=1";
  
  return (
    <div className="absolute bottom-1/2 translate-y-1/2 left-4 w-[calc(100%-2rem)] h-24 bg-gray-200 rounded-lg shadow-lg flex items-center justify-center animate-fade-in md:w-auto md:h-auto md:left-auto md:right-4 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:w-64 md:h-96">
        <img 
            src={displayUrl} 
            alt="Advertisement" 
            className="w-full h-full object-cover rounded-lg"
        />
    </div>
  );
};

export default AdBanner;