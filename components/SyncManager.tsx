import React, { useState, useEffect, useRef } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useProContext } from '../context/ProContext';
import { getSyncQueue, removeFromSyncQueue, getEncryptedVideoById } from '../services/storageService';
import { CloudUploadIcon } from './icons/ControlIcons';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

const SyncManager: React.FC = () => {
    const isOnline = useNetworkStatus();
    const { isPro, showUpgradeModal } = useProContext();
    const [status, setStatus] = useState<SyncStatus>('idle');
    const [progress, setProgress] = useState('');
    const [queueCount, setQueueCount] = useState(0);
    const isSyncingRef = useRef(false);

    useEffect(() => {
        const checkQueue = async () => {
            const queue = await getSyncQueue();
            setQueueCount(queue.length);
        };
        checkQueue();

        const interval = setInterval(checkQueue, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const syncData = async () => {
            if (isSyncingRef.current) return;
            isSyncingRef.current = true;
            
            try {
                const queue = await getSyncQueue();
                if (queue.length === 0) {
                    setStatus('idle');
                    isSyncingRef.current = false;
                    return;
                }
                
                setStatus('syncing');

                for (let i = 0; i < queue.length; i++) {
                    const item = queue[i];
                    setProgress(`Uploading ${item.name.substring(0, 20)}... (${i + 1}/${queue.length})`);
                    
                    const videoData = await getEncryptedVideoById(item.localId);

                    if (!videoData) {
                        console.error(`Video data for ${item.localId} not found, skipping.`);
                        await removeFromSyncQueue(item.id);
                        continue;
                    }

                    // Simulate network upload with the actual data
                    console.log(`Simulating cloud upload for: ${item.name}`, `Size: ${(videoData.encryptedData.byteLength / 1024 / 1024).toFixed(2)} MB`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    await removeFromSyncQueue(item.id);
                }
                
                setStatus('success');
                setProgress('Sync complete!');
            } catch (e) {
                console.error('Sync failed:', e);
                setStatus('error');
                setProgress('Sync failed.');
            } finally {
                setTimeout(() => {
                    setStatus('idle');
                    setProgress('');
                }, 4000);
                isSyncingRef.current = false;
            }
        };

        if (isOnline && status !== 'syncing' && isPro) {
            syncData();
        }
    }, [isOnline, status, isPro]);

    if (!isPro && isOnline && queueCount > 0) {
        return (
            <div 
                onClick={showUpgradeModal}
                className="fixed bottom-24 md:bottom-5 right-5 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-fade-in cursor-pointer hover:bg-indigo-700"
            >
                <CloudUploadIcon className="w-5 h-5" />
                <span className="text-sm font-semibold">{queueCount} video(s) ready for upload. Upgrade to Pro for cloud sync.</span>
            </div>
        );
    }

    if (status === 'idle' || !isPro) {
        return null;
    }

    const getStatusStyles = () => {
        switch (status) {
            case 'syncing':
                return {
                    Icon: <CloudUploadIcon className="w-5 h-5 animate-pulse" />,
                    bgColor: 'bg-blue-600',
                };
            case 'success':
                return {
                    Icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
                    bgColor: 'bg-green-600',
                };
            case 'error':
                 return {
                    Icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>,
                    bgColor: 'bg-red-600',
                };
            default:
                return { Icon: null, bgColor: 'bg-gray-700'};
        }
    }

    const { Icon, bgColor } = getStatusStyles();

    return (
        <div className={`fixed bottom-24 md:bottom-5 right-5 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-fade-in`}>
            {Icon}
            <span className="text-sm font-semibold">{progress}</span>
        </div>
    );
};

export default SyncManager;