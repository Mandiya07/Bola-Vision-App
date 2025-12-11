import { useState, useEffect, useRef, useCallback } from 'react';

type CameraState = 'inactive' | 'active' | 'error';
type PermissionState = 'checking' | 'prompt' | 'granted' | 'denied';

export const useCamera = () => {
    const [cameraState, setCameraState] = useState<CameraState>('inactive');
    const [permissionStatus, setPermissionStatus] = useState<PermissionState>('checking');
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        const checkPermissions = async () => {
            if (!navigator.permissions?.query) {
                console.warn('Permissions API not supported, defaulting to prompt behavior.');
                setPermissionStatus('prompt');
                return;
            }
            try {
                const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
                setPermissionStatus(status.state);
                status.onchange = () => setPermissionStatus(status.state);
            } catch (e) {
                console.error("Failed to query camera permissions, defaulting to prompt.", e);
                setPermissionStatus('prompt');
            }
        };
        checkPermissions();
    }, []);

    const setupCamera = useCallback(async (deviceId?: string) => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        setCameraError(null);
        setCameraState('inactive');

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setCameraError("Your browser does not support camera access.");
                setCameraState('error');
                return;
            }

            const constraints: MediaStreamConstraints = {
                video: deviceId ? { deviceId: { exact: deviceId } } : true
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setCameraState('active');

            if (videoDevices.length === 0) {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const availableVideoDevices = devices.filter(d => d.kind === 'videoinput');
                setVideoDevices(availableVideoDevices);
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            if (err instanceof DOMException && err.name === "NotAllowedError") {
                setCameraError("Permission to use the camera was denied. Please go to your browser's site settings for this site and allow camera access, then try again.");
            } else {
                setCameraError("Could not access camera. Please ensure permissions are granted and the device is not in use by another application.");
            }
            setCameraState('error');
        }
    }, [videoDevices.length]);

    const handleStartCamera = useCallback(() => {
        setupCamera();
    }, [setupCamera]);

    const toggleCamera = useCallback(() => {
        if (videoDevices.length > 1) {
            const nextIndex = (currentDeviceIndex + 1) % videoDevices.length;
            setCurrentDeviceIndex(nextIndex);
            setupCamera(videoDevices[nextIndex].deviceId);
        }
    }, [currentDeviceIndex, setupCamera, videoDevices]);

    useEffect(() => {
        // Cleanup function to stop camera when the component unmounts
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return {
        videoRef,
        streamRef,
        cameraState,
        permissionStatus,
        cameraError,
        videoDevices,
        handleStartCamera,
        toggleCamera,
        setupCamera
    };
};
