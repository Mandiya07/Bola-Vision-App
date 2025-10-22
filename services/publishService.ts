import type { MatchState, Highlight } from '../types';
import { getDecryptedBlobById } from './storageService';

/**
 * Simulates announcing a new match to the BolaVision backend.
 * In a real app, this would make a POST request to an API endpoint.
 * @param state The current match state.
 * @returns A promise that resolves with a unique match ID.
 */
export const publishNewMatch = async (state: MatchState): Promise<string> => {
    console.log('Publishing new match to BolaVision.com:', {
        home: state.homeTeam.name,
        away: state.awayTeam.name,
        league: state.leagueName,
    });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const matchId = `match_${Date.now()}`;
    console.log('Match published successfully with ID:', matchId);

    return matchId;
};

/**
 * Simulates uploading a highlight clip to the BolaVision backend.
 * @param matchId The ID of the match this highlight belongs to.
 * @param highlight The highlight object containing metadata and storage ID.
 * @returns A promise that resolves when the upload is "complete".
 */
export const uploadHighlight = async (matchId: string, highlight: Highlight): Promise<void> => {
    const blob = await getDecryptedBlobById(highlight.storageId);
    if (!blob) {
        console.warn(`Could not find blob for highlight ${highlight.id}, skipping upload.`);
        return;
    }

    console.log(`Uploading highlight to BolaVision.com for match ${matchId}:`, {
        event: highlight.event.type,
        time: highlight.event.matchTime,
        size: `${(blob.size / 1024).toFixed(2)} KB`,
    });
    
    // Simulate network delay for upload
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));

    console.log(`Highlight ${highlight.id} uploaded successfully.`);
};