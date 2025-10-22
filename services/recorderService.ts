let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let chunkTimestamps: number[] = []; // To track duration more accurately
let isFullMatchRecordingActive = false;

const REPLAY_BUFFER_DURATION_MS = 15000; // 15 seconds

// Check for H.265 (HEVC) support. 'hvc1' is a common codec string for HEVC in MP4.
const hevcMimeType = 'video/mp4; codecs="hvc1"';
const isHevcSupported = MediaRecorder.isTypeSupported(hevcMimeType);

const options = {
    mimeType: isHevcSupported ? hevcMimeType : 'video/webm',
};

const startInternal = (stream: MediaStream): boolean => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
    
    try {
        mediaRecorder = new MediaRecorder(stream, options);
        recordedChunks = [];
        chunkTimestamps = [];
        
        const startTime = Date.now();

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
                chunkTimestamps.push(Date.now() - startTime);

                if (!isFullMatchRecordingActive) {
                    // Trim buffer to maintain ~15 seconds
                    while (chunkTimestamps.length > 1 && chunkTimestamps[chunkTimestamps.length - 1] - chunkTimestamps[0] > REPLAY_BUFFER_DURATION_MS) {
                        recordedChunks.shift();
                        chunkTimestamps.shift();
                    }
                }
            }
        };
        
        mediaRecorder.start(1000); // 1s timeslice
        return true;
    } catch (e) {
        console.error("Error creating MediaRecorder:", e);
        alert(`Could not start recorder. Your browser might not support the selected codec (${options.mimeType}).`);
        return false;
    }
};

// Function to start a full match recording
function startFullRecording(stream: MediaStream): boolean {
    if (isRecording()) {
        console.warn("Full recording already in progress.");
        return false;
    }
    const success = startInternal(stream);
    if (success) {
        isFullMatchRecordingActive = true;
        console.log("Full match recording started.");
    }
    return success;
}

// Function to start replay buffering
function startReplayBuffering(stream: MediaStream): boolean {
    if (isRecording()) {
        console.warn("Cannot start replay buffering during a full recording.");
        return false;
    }
    const success = startInternal(stream);
    if (success) {
        isFullMatchRecordingActive = false;
        console.log("Replay buffering started.");
    }
    return success;
}

// Stops any current recording/buffering and returns the accumulated blob
function stop(): Promise<Blob> {
    return new Promise((resolve) => {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
            resolve(new Blob([], { type: options.mimeType }));
            return;
        }

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: options.mimeType });
            recordedChunks = [];
            chunkTimestamps = [];
            mediaRecorder = null;
            isFullMatchRecordingActive = false;
            console.log("Recorder stopped.");
            resolve(blob);
        };
        
        mediaRecorder.stop();
    });
}

// Gets the current buffer as a blob for replay without stopping the recorder
function getReplayBlob(): Promise<Blob> {
    if (isFullMatchRecordingActive) {
        // If we are recording the full match, replay can use the last 15s of that too
        const tempChunks: Blob[] = [];
        const tempTimestamps = [...chunkTimestamps];
        if (tempTimestamps.length === 0) {
            return Promise.resolve(new Blob([], { type: options.mimeType }));
        }
        const endTime = tempTimestamps[tempTimestamps.length - 1];
        for (let i = tempTimestamps.length - 1; i >= 0; i--) {
            if (endTime - tempTimestamps[i] <= REPLAY_BUFFER_DURATION_MS) {
                tempChunks.unshift(recordedChunks[i]);
            } else {
                break;
            }
        }
        return Promise.resolve(new Blob(tempChunks, { type: options.mimeType }));
    }
    
    // If just buffering, the whole buffer is the replay
    return Promise.resolve(new Blob(recordedChunks, { type: options.mimeType }));
}


function isRecording(): boolean {
    return mediaRecorder?.state === 'recording' && isFullMatchRecordingActive;
}

export const recorderService = {
    startFullRecording,
    startReplayBuffering,
    stop,
    isRecording,
    getReplayBlob,
};
