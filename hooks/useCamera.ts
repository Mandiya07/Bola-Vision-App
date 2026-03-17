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

    const isInitializingRef = useRef(false);

    const setupCamera = useCallback(async (deviceId?: string) => {
        if (isInitializingRef.current) {
            console.warn("[useCamera] Initialization already in progress. Ignoring request.");
            return;
        }
        
        isInitializingRef.current = true;
        console.log(`[useCamera] Starting setup. Requested DeviceId: ${deviceId || 'default'}`);

        // 1. Aggressive Cleanup
        if (streamRef.current) {
            console.log("[useCamera] Cleaning up existing stream...");
            const tracks = streamRef.current.getTracks();
            tracks.forEach(track => {
                track.stop();
                console.log(`[useCamera] Stopped track: ${track.kind} (${track.label})`);
            });
            streamRef.current = null;
        }
        
        if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.load(); // Reset the video element
        }

        // Give the OS/Browser more time to fully release hardware locks
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setCameraError(null);
        setCameraState('inactive');

        try {
            // 2. Pre-flight check: Enumerate devices
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Your browser does not support camera access. Please use Chrome or Safari.");
            }

            console.log("[useCamera] Pre-flight: Enumerating devices...");
            const initialDevices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = initialDevices.filter(d => d.kind === 'videoinput');
            console.log(`[useCamera] Found ${videoInputs.length} video inputs.`);
            
            if (videoInputs.length === 0) {
                throw new DOMException("No camera devices found.", "NotFoundError");
            }

            // 3. Define constraints with 'ideal' instead of 'exact' where possible
            const constraints: MediaStreamConstraints = {
                video: deviceId 
                    ? { deviceId: { exact: deviceId } } 
                    : { facingMode: { ideal: 'environment' } },
                audio: false
            };

            let stream: MediaStream;
            
            // 4. Enhanced getUserMedia with timeout
            const getUserMediaWithTimeout = async (reqConstraints: MediaStreamConstraints, timeoutMs: number) => {
                console.log(`[useCamera] Requesting getUserMedia (timeout: ${timeoutMs}ms)...`, reqConstraints);
                let timeoutId: ReturnType<typeof setTimeout>;
                
                const timeoutPromise = new Promise<never>((_, reject) => {
                    timeoutId = setTimeout(() => {
                        console.error(`[useCamera] getUserMedia HANG detected after ${timeoutMs}ms`);
                        reject(new DOMException("Camera initialization timed out.", "TimeoutError"));
                    }, timeoutMs);
                });

                try {
                    const result = await Promise.race([
                        navigator.mediaDevices.getUserMedia(reqConstraints),
                        timeoutPromise
                    ]);
                    clearTimeout(timeoutId!);
                    return result;
                } catch (err) {
                    clearTimeout(timeoutId!);
                    throw err;
                }
            };

            // 5. Dynamic Timeout
            // Treat 'checking' and 'prompt' with a long timeout (60s) for user interaction.
            const timeoutMs = (permissionStatus === 'prompt' || permissionStatus === 'checking') ? 60000 : 30000;

            try {
                stream = await getUserMediaWithTimeout(constraints, timeoutMs);
            } catch (err) {
                console.error("[useCamera] Initial attempt failed:", err);
                
                // 6. Aggressive Fallback Strategy
                if (err instanceof DOMException && (
                    err.name === "OverconstrainedError" || 
                    err.name === "ConstraintNotSatisfiedError" || 
                    err.name === "TimeoutError" || 
                    err.name === "NotReadableError" ||
                    err.name === "AbortError"
                )) {
                    console.warn(`[useCamera] Attempting emergency fallback due to ${err.name}...`);
                    
                    // Wait for any potential hardware reset
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    try {
                        // Fallback to the most basic video constraint possible
                        stream = await getUserMediaWithTimeout({ video: true, audio: false }, 25000);
                    } catch (fallbackErr) {
                        console.error("[useCamera] Emergency fallback failed:", fallbackErr);
                        
                        if (fallbackErr instanceof DOMException && fallbackErr.name === "TimeoutError") {
                            const message = (permissionStatus === 'prompt' || permissionStatus === 'checking')
                                ? "Camera access timed out. Please look for a browser prompt at the top/bottom of your screen and click 'Allow'. If you don't see one, check your site settings."
                                : "Camera initialization timed out. This usually happens if another app (Zoom, Teams, etc.) is using the camera or if the browser is stuck. Please close other apps and refresh the page.";
                            throw new Error(message);
                        }
                        throw fallbackErr;
                    }
                } else {
                    throw err;
                }
            }

            // 7. Success Handling
            console.log("[useCamera] Stream obtained successfully.");
            streamRef.current = stream;
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Force a play attempt
                try {
                    await videoRef.current.play();
                    console.log("[useCamera] Video playback started successfully.");
                } catch (playErr) {
                    console.warn("[useCamera] Auto-play failed (user interaction might be required):", playErr);
                }
            }
            
            setCameraState('active');

            // Refresh device list
            const finalDevices = await navigator.mediaDevices.enumerateDevices();
            setVideoDevices(finalDevices.filter(d => d.kind === 'videoinput'));
            
        } catch (err) {
            console.error("[useCamera] Final error in setupCamera:", err);
            if (err instanceof DOMException) {
                switch (err.name) {
                    case "NotAllowedError":
                        setCameraError("Camera access was denied. Please enable permissions in your browser settings.");
                        break;
                    case "NotFoundError":
                        setCameraError("No camera found. Please ensure your camera is connected and recognized by your device.");
                        break;
                    case "NotReadableError":
                    case "AbortError":
                        setCameraError("Camera is busy or inaccessible. Please close other apps using the camera and try again.");
                        break;
                    case "OverconstrainedError":
                        setCameraError("The requested camera settings are not supported by your hardware.");
                        break;
                    default:
                        setCameraError(`Camera Error: ${err.message || err.name}`);
                }
            } else if (err instanceof Error) {
                setCameraError(err.message);
            } else {
                setCameraError("An unexpected error occurred while starting the camera.");
            }
            setCameraState('error');
        } finally {
            isInitializingRef.current = false;
        }
    }, [permissionStatus]);

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
