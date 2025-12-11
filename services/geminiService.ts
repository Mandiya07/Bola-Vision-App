import { GoogleGenAI, Type, Modality, GenerateContentResponse, GenerateImagesResponse } from "@google/genai";
import type { GameEvent, MatchState, Point, CommentaryStyle, CommentaryExcitement, Player, Team, AiDrawing, TacticalSuggestion, CommentaryLanguage, WinProbability, Highlight, SocialPostEvent, MatchPeriod } from '../types';
import { PoseLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';

declare var process: {
  env: {
    API_KEY: string;
  }
};

const handleApiError = (error: any) => {
  if (error instanceof Error && (error.message.includes("API key not valid") || error.message.includes("Requested entity was not found"))) {
    console.error("API Key Error Detected. Dispatching event to reset key selection.");
    window.dispatchEvent(new CustomEvent('invalid-api-key'));
  }
  throw error;
};

export const getEventDescription = (event: GameEvent): string => {
    const playerIdentifier = event.playerName
        ? `${event.playerName} (#${event.playerNumber}, ${event.playerRole || 'Player'})`
        : (event.playerNumber ? `player number ${event.playerNumber}` : `a player from ${event.teamName}`);

    switch (event.type) {
        case 'GOAL':
            return `Goal scored by ${playerIdentifier}!`;
        case 'FOUL':
            return `A foul has been committed by ${playerIdentifier}. ${event.details || ''}`.trim();
        case 'YELLOW_CARD':
            return `Yellow card shown to ${playerIdentifier}. ${event.details || ''}`.trim();
        case 'RED_CARD':
            return `Red card! ${playerIdentifier} is sent off! ${event.details || ''}`.trim();
        case 'CORNER':
            return `It's a corner kick for ${event.teamName}.`;
        case 'OFFSIDE':
            return `The call is offside against ${event.teamName}, involving ${playerIdentifier}.`;
        case 'SHOT_ON_TARGET':
            return `A powerful shot on target from ${playerIdentifier}!`;
        case 'SAVE':
            return `A brilliant save by the goalkeeper to deny ${event.teamName}!`;
        case 'SUBSTITUTION':
            return `Substitution for ${event.teamName}. ${event.playerIn?.name} comes on for ${event.playerOut?.name}.`;
        case 'TACKLE':
            return `A tackle by ${playerIdentifier}. ${event.details || ''}`.trim();
        case 'PASS':
            return `A pass from ${playerIdentifier}. ${event.details || ''}`.trim();
        case 'INJURY':
             return `Play has stopped for an injury to ${playerIdentifier}. ${event.details || ''}`.trim();
        case 'VAR_CHECK':
            return `VAR Check for a potential ${event.details || 'incident'}.`;
        default:
            return 'An interesting moment in the match.';
    }
};

const determineExcitementLevel = (event: GameEvent, matchState: MatchState): CommentaryExcitement => {
    const { type } = event;
    const { matchTime, homeStats, awayStats } = matchState;
    const minute = Math.floor(matchTime / 60);
    const scoreDifference = Math.abs(homeStats.goals - awayStats.goals);

    if (type === 'GOAL') {
        if (minute >= 88 && scoreDifference <= 1) return 'Peak';
        return 'Excited';
    }
    if (type === 'RED_CARD' && minute > 75 && scoreDifference <= 1) return 'Peak';
    if (type === 'SHOT_ON_TARGET' || type === 'SAVE' || type === 'RED_CARD' || type === 'TACKLE') {
        return 'Excited';
    }
    if (type === 'YELLOW_CARD' && minute > 60) return 'Excited';
    return 'Normal';
};


export const generateCommentary = async (event: GameEvent, matchState: MatchState): Promise<{ text: string, excitement: CommentaryExcitement }> => {
    const excitement = determineExcitementLevel(event, matchState);
    if (!navigator.onLine) {
        return { text: getEventDescription(event), excitement }; 
    }

    const model = 'gemini-2.5-flash';
    const { commentaryStyle, commentaryLanguage, homeTeam, awayTeam, homeStats, awayStats, matchTime, officials, leagueName, matchDate, matchTimeOfDay, venue, weather } = matchState;
    const eventDescription = getEventDescription(event);
    const referee = officials.find(o => o.role === 'Referee');

    const homePlayers = homeTeam.players.map(p => `${p.name} (#${p.number})`).join(', ');
    const awayPlayers = awayTeam.players.map(p => `${p.name} (#${p.number})`).join(', ');

    const gameContext = `The match is between ${homeTeam.name} (home) and ${awayTeam.name} (away).
    This is a ${leagueName || 'friendly'} match, played on ${matchDate} at ${matchTimeOfDay}.
    The venue is ${venue || 'an unknown stadium'}. The weather is ${weather || 'Clear'}.
    The current score is ${homeTeam.name} ${homeStats.goals} - ${awayStats.goals} ${awayTeam.name}.
    The match time is approximately ${Math.floor(matchTime / 60)} minutes.
    ${referee ? `The referee is ${referee.name}. ` : ''}
    ${homeTeam.coachName ? `The manager for ${homeTeam.name} is ${homeTeam.coachName}. ` : ''}
    ${awayTeam.coachName ? `The manager for ${awayTeam.name} is ${awayTeam.coachName}. ` : ''}
    Home team players: ${homePlayers}.
    Away team players: ${awayPlayers}.`;
    
    const styleInstructions: Record<CommentaryStyle, string> = {
        professional: "You are an expert, world-class football (soccer) commentator. Your commentary must be dynamic, insightful, and reflect the current state of the match. You need to sound like a real person broadcasting a live game.",
        fan: `You are a passionate, slightly biased fan of the home team (${matchState.homeTeam.name}), commenting on the match. You get super excited for your team and a bit salty about the opponents. Keep it fun and energetic!`,
        youth: 'You are a young, enthusiastic football player commentating for a youth audience. Use simple, exciting language. Think like a kid watching their heroes play!',
        comic: 'You are a sarcastic, witty, and comic commentator. You find humor in everything, from a bad pass to a dramatic foul. Your goal is to entertain with dry humor and clever observations, like a British comedian.'
    };
    
    const systemInstruction = `
        ${styleInstructions[commentaryStyle]}
        Your commentary MUST be entirely in ${commentaryLanguage}.
        Base your commentary on the event and the provided game context.
        Keep your response concise, like a real-time call (1-2 sentences).
        The current excitement level is: ${excitement}. Adjust your tone accordingly.
    `;
    const prompt = `Game Context: ${gameContext}\n\nEvent: ${eventDescription}\n\nCommentary:`;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
            }
        });
        return { text: (response.text || '').trim(), excitement };
    } catch (error) {
        console.error('Error generating commentary:', error);
        handleApiError(error);
    }
    throw new Error('generateCommentary did not return a value.');
};

export const generateSpeech = async (text: string, style: CommentaryStyle, excitement: CommentaryExcitement): Promise<string> => {
    if (!navigator.onLine) throw new Error("Offline: Cannot generate speech.");
    const model = "gemini-2.5-flash-preview-tts";
    
    const voiceMap: Record<CommentaryStyle, 'Kore' | 'Zephyr' | 'Puck' | 'Charon'> = {
        professional: 'Kore',
        fan: 'Zephyr',
        youth: 'Puck',
        comic: 'Charon'
    };
    let instruction = '';
    if (excitement === 'Excited') instruction = 'Say it with excitement:';
    if (excitement === 'Peak') instruction = 'Shout this with peak excitement:';
    const prompt = `${instruction} ${text}`;
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceMap[style] },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (base64Audio) {
            return base64Audio;
        } else {
            throw new Error("No audio data received from API.");
        }
    } catch (error) {
        console.error('Error generating speech:', error);
        handleApiError(error);
    }
    throw new Error('generateSpeech did not return a value.');
};

const formatPoint = (p: Point | undefined) => p ? `(${p.x.toFixed(2)}%, ${p.y.toFixed(2)}%)` : 'Not mapped';

export const analyzeVideoFrame = async (base64Frame: string, matchState: MatchState): Promise<GameEvent | null> => {
    if (!navigator.onLine) return null;
    const model = 'gemini-2.5-flash';
    
    const { homeTeam, awayTeam, homeTeamAttackDirection, matchTime } = matchState;

    const prompt = `
        Analyze this single frame from a football (soccer) match.
        The home team, ${homeTeam.name}, is attacking towards the ${homeTeamAttackDirection} side of the screen.
        The away team is ${awayTeam.name}.
        The current match time is approximately ${Math.floor(matchTime / 60)} minutes.

        Based on the visual information in this frame, identify if one of the following key events is clearly happening.
        Events to detect: 'GOAL', 'SHOT_ON_TARGET', 'SHOT_OFF_TARGET', 'CORNER', 'FOUL', 'OFFSIDE', 'SAVE'.
        - A 'GOAL' is only if the ball is completely over the goal line.
        - A 'SHOT' is a clear attempt to score.
        - A 'CORNER' is when the ball is being placed at the corner arc.
        - A 'FOUL' is a clear illegal challenge between players.
        - An 'OFFSIDE' is if a player is in an offside position when the ball is played.
        - A 'SAVE' is when a goalkeeper stops a shot.

        Return a JSON object with the event type and the name of the team involved.
        If no clear event is visible, the "event" value should be "NONE".

        Example for a goal by the home team:
        { "event": "GOAL", "teamName": "${homeTeam.name}" }

        Example for no event:
        { "event": "NONE", "teamName": null }
    `;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Frame } },
                    { text: prompt },
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        event: { type: Type.STRING },
                        teamName: { type: Type.STRING, nullable: true }
                    },
                    required: ["event", "teamName"]
                }
            }
        });

        const jsonResponse = JSON.parse(response.text || '{}');
        
        if (jsonResponse && jsonResponse.event && jsonResponse.event !== 'NONE' && jsonResponse.teamName) {
            return {
                id: Date.now(),
                matchTime: matchState.matchTime,
                type: jsonResponse.event,
                teamName: jsonResponse.teamName,
            };
        }

        return null;

    } catch (error) {
        console.error('Error analyzing video frame:', error);
        handleApiError(error);
        return null; // Ensure null is returned on error
    }
}

export const analyzeRefereeDecision = async (base64Frame: string, event: GameEvent, matchState: MatchState): Promise<{ recommendation: NonNullable<MatchState['varCheck']>['recommendation'], reasoning: string }> => {
    if (!navigator.onLine) throw new Error("VAR check unavailable offline.");
    const model = 'gemini-2.5-flash';
    
    const { homeTeam, awayTeam, homeStats, awayStats } = matchState;
    const eventType = event.type;
    const eventDescription = getEventDescription(event);

    const prompt = `
        You are an expert Video Assistant Referee (VAR) for a football (soccer) match.
        Analyze the provided video frame to make a crucial decision. Be objective and base your reasoning on the visual evidence.

        Match Context:
        - Home Team: ${homeTeam.name}
        - Away Team: ${awayTeam.name}
        - Score: ${homeStats.goals} - ${awayStats.goals}
        - Incident under review: ${eventType} - ${eventDescription}

        Task:
        Review the image which captures the moment of the incident. Based ONLY on the visual evidence in this frame, provide your professional recommendation.

        Possible Recommendations: 'Foul', 'No Foul', 'Goal', 'No Goal', 'Offside', 'Onside', 'Yellow Card', 'Red Card', 'Play On', 'Undetermined'.

        Return your analysis as a JSON object with two keys: "recommendation" and "reasoning".
        The reasoning should be a brief, clear explanation of your decision (e.g., "The defender's foot clearly contacts the ball before the attacker.").
    `;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Frame } },
                    { text: prompt },
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        recommendation: { type: Type.STRING },
                        reasoning: { type: Type.STRING }
                    },
                    required: ["recommendation", "reasoning"]
                }
            }
        });

        const result = JSON.parse(response.text || '{}');
        return {
            recommendation: result.recommendation || 'Undetermined',
            reasoning: result.reasoning || 'Could not determine the outcome from the provided image.'
        };

    } catch (e) {
        console.error("Error generating VAR decision:", e);
        handleApiError(e);
    }
    throw new Error('analyzeRefereeDecision did not return a value.');
};

export const advancedFrameAnalysis = async (
  canvas: HTMLCanvasElement,
  poseLandmarker: PoseLandmarker,
  matchState: MatchState,
  videoTimestamp: number
): Promise<GameEvent | null> => {
    if (!navigator.onLine) return null;
    const model = 'gemini-2.5-flash';

    const poseResult = poseLandmarker.detectForVideo(canvas, videoTimestamp);
    const drawingUtils = new DrawingUtils(canvas.getContext('2d')!);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      for (const landmarks of poseResult.landmarks) {
        drawingUtils.drawLandmarks(landmarks, { color: '#FF0000', lineWidth: 2, radius: 3 });
        drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 3 });
      }
    }

    const annotatedFrameBase64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
    
    const { homeTeam, awayTeam, homeTeamAttackDirection, matchTime } = matchState;
    const posesJSON = JSON.stringify(poseResult.landmarks.map(landmarkSet => 
      landmarkSet.map((l, index) => ({ index, x: l.x.toFixed(3), y: l.y.toFixed(3), v: l.visibility?.toFixed(3) }))
    ));

    const allPlayersWithPhotos = [
        ...homeTeam.players.filter(p => p.photo),
        ...awayTeam.players.filter(p => p.photo)
    ];

    const parts: any[] = [
        { text: `
You are a world-class football (soccer) analyst and AI expert. Your task is to analyze a video frame from a match to identify a key game event and the specific player involved.

**Match Context:**
- Home Team: ${homeTeam.name} (attacking ${homeTeamAttackDirection}, wearing ${homeTeam.color || 'dark'} jerseys)
- Away Team: ${awayTeam.name} (wearing ${awayTeam.color || 'light'} jerseys)
- Match Time: Approximately ${Math.floor(matchTime / 60)} minutes.
- Pose Data (JSON): ${posesJSON}

First, here is the main video frame to analyze, with pose skeletons drawn on players:
` },
        { inlineData: { mimeType: 'image/jpeg', data: annotatedFrameBase64 } }
    ];

    if (allPlayersWithPhotos.length > 0) {
        parts.push({ text: "\n\nNext, here are reference photos of the players. Use these to identify who is in the main frame." });
        allPlayersWithPhotos.forEach(player => {
            const base64Data = player.photo!.split(',')[1];
            const mimeType = player.photo!.match(/:(.*?);/)![1];
            const teamName = homeTeam.players.some(p => p.number === player.number) ? homeTeam.name : awayTeam.name;
            
            parts.push({ text: `\nThis is ${player.name} (#${player.number}) from ${teamName}:` });
            parts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                }
            });
        });
    }

    parts.push({ text: `
\n\n**Your Task:**
1.  **Player Identification**: For each pose in the main frame, compare the player's face and appearance to the reference photos provided. Identify the specific player (name and number) and their team. If a player cannot be identified from the photos or no photos are provided, determine their team by jersey color.
2.  **Action Recognition**: Based on the identified players' poses and positions, recognize ONE of these events: 'TACKLE', 'PASS', 'SHOT_ON_TARGET', 'SHOT_OFF_TARGET', 'OFFSIDE', 'FOUL', 'SAVE'.
3.  **Event Determination**: Conclude which single, most prominent event is occurring. If no clear event is happening, use "NONE".

**Output Format:**
Return a JSON object with the event type, team name, and the identified player's name and number. If the player cannot be identified, the player fields should be null. Provide brief details explaining your reasoning.

Example for an identified player:
{ "event": "TACKLE", "teamName": "${awayTeam.name}", "playerName": "Bolt", "playerNumber": 22, "details": "Bolt makes a sliding tackle on Leo." }

Example for an unidentified player:
{ "event": "PASS", "teamName": "${homeTeam.name}", "playerName": null, "playerNumber": null, "details": "A midfielder from ${homeTeam.name} plays a through ball."}

Example for no event:
{ "event": "NONE", "teamName": null, "playerName": null, "playerNumber": null, "details": null }
` });

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        event: { type: Type.STRING },
                        teamName: { type: Type.STRING, nullable: true },
                        playerName: { type: Type.STRING, nullable: true },
                        playerNumber: { type: Type.INTEGER, nullable: true },
                        details: { type: Type.STRING, nullable: true, description: "Brief reasoning for the event detection." }
                    },
                    required: ["event"]
                }
            }
        });
        
        const jsonResponse = JSON.parse(response.text || '{}');
        
        if (jsonResponse && jsonResponse.event && jsonResponse.event !== 'NONE' && jsonResponse.teamName) {
            return {
                id: Date.now(),
                matchTime: matchState.matchTime,
                type: jsonResponse.event,
                teamName: jsonResponse.teamName,
                playerName: jsonResponse.playerName || undefined,
                playerNumber: jsonResponse.playerNumber || undefined,
                details: jsonResponse.details || undefined,
            };
        }
        return null;

    } catch (error) {
        console.error('Error in advanced frame analysis:', error);
        handleApiError(error);
        return null;
    }
};

export const getTacticalSuggestion = async (base64Frame: string, matchState: MatchState): Promise<TacticalSuggestion> => {
    if (!navigator.onLine) throw new Error("Offline: Cannot get AI suggestion.");
    const model = 'gemini-2.5-flash';

    const { homeTeam, awayTeam, homeStats, awayStats, matchTime, homeTeamAttackDirection } = matchState;

    const prompt = `
        You are an elite football (soccer) tactician. Analyze this frame of a match.
        Home Team: ${homeTeam.name} (attacking ${homeTeamAttackDirection})
        Away Team: ${awayTeam.name}
        Score: ${homeStats.goals} - ${awayStats.goals}
        Time: ~${Math.floor(matchTime / 60)}'

        Based on the player positions and the current game state, provide one concise, actionable tactical suggestion for the team in possession (or the defending team if possession is unclear).
        Also provide a set of simple drawings to illustrate your suggestion on the video frame.

        Your response must be a JSON object with two keys: "suggestion" (string) and "drawings" (array of AiDrawing objects).

        An AiDrawing object can be:
        - An arrow: { "type": "arrow", "color": "yellow", "start": {"x": 50, "y": 50}, "end": {"x": 70, "y": 40} }
        - A circle: { "type": "circle", "color": "red", "center": {"x": 30, "y": 60}, "radius": 5 }
        - A zone: { "type": "zone", "color": "blue", "area": [{"x": 10, "y": 10}, {"x": 30, "y": 10}, {"x": 20, "y": 30}] }

        'x' and 'y' coordinates are percentages from the top-left of the frame.
        Use 'yellow' for player movement/runs, 'red' to highlight a problem/danger, 'blue' for zones of control, 'white' for pass options.

        Example Response:
        {
          "suggestion": "Exploit the space behind the right-back with a forward run.",
          "drawings": [
            { "type": "arrow", "color": "yellow", "start": {"x": 45, "y": 60}, "end": {"x": 80, "y": 75} },
            { "type": "circle", "color": "red", "center": {"x": 85, "y": 50}, "radius": 8 }
          ]
        }
    `;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Frame } },
                    { text: prompt },
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestion: { type: Type.STRING },
                        drawings: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    type: { type: Type.STRING },
                                    color: { type: Type.STRING },
                                    start: {
                                        type: Type.OBJECT,
                                        properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } },
                                        nullable: true,
                                    },
                                    end: {
                                        type: Type.OBJECT,
                                        properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } },
                                        nullable: true,
                                    },
                                    center: {
                                        type: Type.OBJECT,
                                        properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } },
                                        nullable: true,
                                    },
                                    radius: { type: Type.NUMBER, nullable: true },
                                    area: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } }
                                        },
                                        nullable: true,
                                    }
                                },
                                required: ["type", "color"]
                            }
                        }
                    },
                    required: ["suggestion", "drawings"]
                }
            }
        });
        
        return JSON.parse(response.text || '{}') as TacticalSuggestion;
    } catch(e) {
        console.error("Error generating tactical suggestion:", e);
        handleApiError(e);
    }
    throw new Error('getTacticalSuggestion did not return a value.');
};

export const generatePreMatchHype = async (homeTeam: Team, awayTeam: Team): Promise<string> => {
    if (!navigator.onLine) throw new Error("Feature unavailable offline.");
    const model = 'gemini-2.5-flash';
    const homeStar = homeTeam.players.find(p => p.role === 'Forward') || homeTeam.players[0];
    const awayStar = awayTeam.players.find(p => p.role === 'Forward') || awayTeam.players[0];

    const prompt = `
        You are a world-class football (soccer) pundit, known for your dramatic and insightful pre-match analysis.

        Your task is to generate a short, exciting, and slightly hyperbolic pre-match hype comment for a football match between ${homeTeam.name} and ${awayTeam.name}.

        **Key players to watch:**
        - For ${homeTeam.name}: ${homeStar.name}, their star ${homeStar.role}.
        - For ${awayTeam.name}: ${awayStar.name}, their key ${awayStar.role}.

        **Narrative Context (Invent these details to create a compelling story):**
        - **Recent Form:** Is one team on a winning streak ("in red-hot form")? Is the other struggling ("desperate for a result")?
        - **Rivalry:** Is this a fierce local derby? Is there a history between the two managers, ${homeTeam.coachName || 'the home coach'} and ${awayTeam.coachName || 'the away coach'}?
        - **Head-to-Head:** Does one team have a dominant record over the other ("looking to continue their dominance")? Or is it a chance for revenge ("out for revenge after their last encounter")?

        **Instructions:**
        1. Weave in the narrative context you've created to build excitement.
        2. Mention at least one of the key players.
        3. Keep your response concise and punchy (2-3 sentences max).
        4. Make it sound like a captivating TV broadcast intro.
    `;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response: GenerateContentResponse = await ai.models.generateContent({ model, contents: prompt });
        return (response.text || '').trim();
    } catch (error) {
        console.error('Error generating pre-match hype:', error);
        handleApiError(error);
    }
    throw new Error('generatePreMatchHype did not return a value.');
};

export const generateSocialMediaPost = async (event: SocialPostEvent, matchState: MatchState): Promise<string> => {
    if (!navigator.onLine) throw new Error("Feature unavailable offline.");
    const model = 'gemini-2.5-flash';

    const { homeTeam, awayTeam, homeStats, awayStats, leagueName, matchTime } = matchState;
    const homeHashtag = `#${homeTeam.name.replace(/\s/g, '')}`;
    const awayHashtag = `#${awayTeam.name.replace(/\s/g, '')}`;
    const genericHashtags = `#BolaVision #LiveFootball #${leagueName?.replace(/\s/g, '') || 'LocalLeague'}`;

    let eventDescription = '';
    let tone = 'Excited';

    if ('id' in event) {
        // It's a GameEvent
        eventDescription = getEventDescription(event);
        if (event.type === 'GOAL') tone = 'Ecstatic';
        if (event.type === 'RED_CARD') tone = 'Dramatic';
    } else {
        if (event.type === 'HALF_TIME') {
            eventDescription = `It's half time! The score is ${homeTeam.name} ${homeStats.goals} - ${awayStats.goals} ${awayTeam.name}.`;
            tone = 'Informative';
        } else { // FINAL_SCORE
            let result = `${homeTeam.name} ${homeStats.goals} - ${awayStats.goals} ${awayTeam.name}.`;
            if (homeStats.goals > awayStats.goals) {
                result += ` A great win for ${homeTeam.name}!`;
            } else if (awayStats.goals > homeStats.goals) {
                result += ` A hard-fought victory for ${awayTeam.name}!`;
            } else {
                result += " It ends in a draw.";
            }
            eventDescription = `Full Time! The final score is ${result}`;
            tone = 'Conclusive';
        }
    }
    
    const homeAbbr = homeTeam.name.substring(0, 3).toUpperCase();
    const awayAbbr = awayTeam.name.substring(0, 3).toUpperCase();

    const prompt = `
        You are a social media manager for a local football broadcast.
        Your task is to generate a short, engaging social media post (like for Twitter/X) based on a match event.
        The tone should be: ${tone}.

        Match Context:
        - Home Team: ${homeTeam.name} (Score: ${homeStats.goals})
        - Away Team: ${awayTeam.name} (Score: ${awayStats.goals})
        - Current Time: ~${Math.floor(matchTime / 60)} minutes
        - League: ${leagueName || 'Friendly Match'}

        Event to post about:
        - ${eventDescription}

        Instructions:
        1. Write a punchy and exciting post about the event.
        2. Keep it concise (under 280 characters).
        3. ALWAYS include the current score in the format: ${homeAbbr} ${homeStats.goals} - ${awayStats.goals} ${awayAbbr}.
        4. Include relevant hashtags: ${homeHashtag}, ${awayHashtag}, and ${genericHashtags}.
    `;
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response: GenerateContentResponse = await ai.models.generateContent({ model, contents: prompt });
        return (response.text || '').trim();
    } catch (error) {
        console.error('Error generating social media post:', error);
        handleApiError(error);
    }
    throw new Error('generateSocialMediaPost did not return a value.');
};

export const generateSocialMediaImage = async (event: SocialPostEvent, matchState: MatchState): Promise<string> => {
    if (!navigator.onLine) throw new Error("Feature unavailable offline.");
    const model = 'imagen-4.0-generate-001';
    const { homeTeam, awayTeam, homeStats, awayStats } = matchState;

    let eventDetails = '';
    let stylePrompt = 'dynamic, dramatic, graphic design style suitable for social media platforms like X or Instagram. Use bold typography and abstract shapes.';
    
    if ('id' in event) { // GameEvent
        const player = event.teamName === homeTeam.name 
            ? homeTeam.players.find(p => p.number === event.playerNumber)
            : awayTeam.players.find(p => p.number === event.playerNumber);

        switch(event.type) {
            case 'GOAL':
                eventDetails = `A celebratory image for a GOAL scored by ${player?.name || 'a player'} for ${event.teamName}. Current score: ${homeTeam.name} ${homeStats.goals} - ${awayStats.goals} ${awayTeam.name}.`;
                stylePrompt = `An energetic, celebratory graphic design poster for a goal in a football match. Feature abstract bursts of light and dynamic lines.`;
                break;
            case 'RED_CARD':
                eventDetails = `A dramatic image for a RED CARD shown to ${player?.name || 'a player'} from ${event.teamName}.`;
                stylePrompt = `A dramatic, high-contrast graphic design poster for a red card in a football match. Use sharp angles and a minimalist color palette, focusing on the color red.`;
                break;
            default:
                 eventDetails = `An action shot from a football match between ${homeTeam.name} and ${awayTeam.name}.`;
        }
    } else { // Final or HT score
        if (event.type === 'FINAL_SCORE') {
            eventDetails = `A final score graphic for the match between ${homeTeam.name} and ${awayTeam.name}. Final Score: ${homeStats.goals} - ${awayStats.goals}.`;
        } else {
            eventDetails = `A half time score graphic for the match between ${homeTeam.name} and ${awayTeam.name}. Half Time Score: ${homeStats.goals} - ${awayStats.goals}.`;
        }
        stylePrompt = `A clean, bold, and professional graphic design poster showing the match score. Use the team logos and names prominently.`
    }

    const prompt = `${eventDetails} The home team is ${homeTeam.name} (colors: ${homeTeam.color}) and the away team is ${awayTeam.name} (colors: ${awayTeam.color}). ${stylePrompt} The image should NOT contain any text, letters, or numbers.`;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response: GenerateImagesResponse = await ai.models.generateImages({
            model,
            prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '1:1',
            },
        });

        const base64ImageBytes: string | undefined = response.generatedImages?.[0]?.image?.imageBytes;

        if (!base64ImageBytes) {
            throw new Error('No image data received from API.');
        }

        return base64ImageBytes;
    } catch (error) {
        console.error('Error generating social media image:', error);
        handleApiError(error);
    }
    throw new Error('generateSocialMediaImage did not return a value.');
}

export const generatePlayerSpotlightText = async (player: Player, team: Team): Promise<string> => {
    if (!navigator.onLine) throw new Error("Feature unavailable offline.");
    const model = 'gemini-2.5-flash';

    const prompt = `
        You are a football analyst providing a quick spotlight on a player.
        The player is ${player.name} (#${player.number}), a ${player.role} for ${team.name}.
        Current match stats: Goals: ${player.stats.goals}, Assists: ${player.stats.assists}, Shots: ${player.stats.shots}.

        Generate a short, insightful, one-sentence analysis (max 150 characters) about the player's role, key skill, or importance to the team, based on their position and stats. Be concise and sound like a professional pundit.
    `;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: prompt,
        });
        return (response.text || '').trim();
    } catch (error) {
        console.error('Error generating player spotlight text:', error);
        handleApiError(error);
    }
    throw new Error('generatePlayerSpotlightText did not return a value.');
};

export const generateMatchSummary = async (matchState: MatchState): Promise<string> => {
    if (!navigator.onLine) throw new Error("Feature unavailable offline.");
    const model = 'gemini-2.5-flash';
    const { homeTeam, awayTeam, homeStats, awayStats, events, officials, leagueName, matchDate, venue, weather } = matchState;
    const referee = officials.find(o => o.role === 'Referee');
    
    const significantEvents = events
        .filter(e => ['GOAL', 'RED_CARD', 'YELLOW_CARD'].includes(e.type))
        .map(e => `- ${Math.floor(e.matchTime / 60)}': ${getEventDescription(e)}`)
        .join('\n');

    const prompt = `
        You are a sports journalist. Write a concise, engaging match summary for a football (soccer) game.
        
        Match Details:
        - Home Team: ${homeTeam.name} (Coach: ${homeTeam.coachName || 'N/A'})
        - Away Team: ${awayTeam.name} (Coach: ${awayTeam.coachName || 'N/A'})
        - Final Score: ${homeTeam.name} ${homeStats.goals} - ${awayStats.goals} ${awayTeam.name}
        - Competition: ${leagueName || 'Friendly'}
        - Date: ${matchDate || 'N/A'}
        - Venue: ${venue || 'N/A'}
        - Weather: ${weather || 'N/A'}
        - Referee: ${referee?.name || 'N/A'}
        
        Key Statistics:
        - Shots on Target: ${homeTeam.name} ${homeStats.shotsOnTarget} - ${awayStats.shotsOnTarget} ${awayTeam.name}
        - Possession: ${homeTeam.name} ${homeStats.possession}% - ${awayStats.possession}% ${awayTeam.name}
        - Fouls: ${homeTeam.name} ${homeStats.fouls} - ${awayStats.fouls} ${awayTeam.name}

        Significant Events Log:
        ${significantEvents}
        
        Task: Based on all the information above, write a compelling summary of the match. Highlight the key moments, the final result, and the overall narrative of the game.
    `;
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response: GenerateContentResponse = await ai.models.generateContent({ model, contents: prompt });
        return (response.text || '').trim();
    } catch (error) {
        console.error('Error generating match summary:', error);
        handleApiError(error);
    }
    throw new Error('generateMatchSummary did not return a value.');
};

export const selectPlayerOfTheMatch = async (matchState: MatchState): Promise<{ player: Player, team: 'home' | 'away', reasoning: string }> => {
    if (!navigator.onLine) throw new Error("Feature unavailable offline.");
    const model = 'gemini-2.5-flash';
    const { homeTeam, awayTeam, homeStats, awayStats, events, leagueName, venue } = matchState;

    const allPlayersWithStats = [
        ...homeTeam.players.map(p => ({ ...p, teamName: homeTeam.name })),
        ...awayTeam.players.map(p => ({ ...p, teamName: awayTeam.name }))
    ];

    const prompt = `
        Analyze the following football (soccer) match data to select the "Player of the Match".

        Match Details:
        - Home Team: ${homeTeam.name} (Coach: ${homeTeam.coachName || 'N/A'})
        - Away Team: ${awayTeam.name} (Coach: ${awayTeam.coachName || 'N/A'})
        - Final Score: ${homeTeam.name} ${homeStats.goals} - ${awayStats.goals} ${awayTeam.name}
        - Competition: ${leagueName || 'Friendly'}
        - Venue: ${venue || 'N/A'}

        Player Performances (Number, Name, Team, Stats):
        ${allPlayersWithStats.map(p => `- #${p.number} ${p.name} (${p.teamName}): Goals: ${p.stats.goals}, Assists: ${p.stats.assists}, Shots: ${p.stats.shots}, Saves: ${p.stats.saves}`).join('\n')}

        Task:
        Based on the provided stats and the final score, identify the single most impactful player. Consider goal scorers in a tight match, a goalkeeper with many saves, or a dominant midfielder. Return your answer in a JSON object with the player's number, team name, and a brief reasoning for your choice.

        Example Response Format:
        {
          "playerNumber": 10,
          "teamName": "Fonteyn FC",
          "reasoning": "Scored the decisive goal and was a constant threat throughout the match."
        }
    `;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        playerNumber: { type: Type.INTEGER },
                        teamName: { type: Type.STRING },
                        reasoning: { type: Type.STRING }
                    },
                    required: ["playerNumber", "teamName", "reasoning"]
                }
            }
        });
        
        const result = JSON.parse(response.text || '{}');
        const allPlayers = [
            ...matchState.homeTeam.players.map(p => ({ ...p, teamName: matchState.homeTeam.name })),
            ...matchState.awayTeam.players.map(p => ({ ...p, teamName: matchState.awayTeam.name }))
        ];
        const selectedPlayer = allPlayers.find(p => p.number === result.playerNumber && p.teamName === result.teamName);

        if (!selectedPlayer) {
            throw new Error("AI selected a player not on the roster.");
        }
        
        return {
            player: {
                name: selectedPlayer.name,
                number: selectedPlayer.number,
                role: selectedPlayer.role,
                photo: selectedPlayer.photo,
                stats: selectedPlayer.stats,
            },
            team: selectedPlayer.teamName === matchState.homeTeam.name ? 'home' : 'away',
            reasoning: result.reasoning
        }

    } catch (error) {
        console.error('Error selecting Player of the Match:', error);
        handleApiError(error);
    }
    throw new Error('selectPlayerOfTheMatch did not return a value.');
};

export const translateText = async (text: string, targetLanguage: CommentaryLanguage): Promise<string> => {
    if (!navigator.onLine) {
        throw new Error("Translation feature is unavailable offline.");
    }
    const model = 'gemini-2.5-flash';
    const prompt = `Translate the following English text into ${targetLanguage}.
    Do not add any extra commentary or explanation, just provide the direct translation.

    Text to translate: "${text}"
`;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response: GenerateContentResponse = await ai.models.generateContent({ model, contents: prompt });
        return (response.text || '').trim();
    } catch (error) {
        console.error(`Error translating text to ${targetLanguage}:`, error);
        handleApiError(error);
    }
    throw new Error('translateText did not return a value.');
};

export const getWinProbability = async (matchState: MatchState): Promise<WinProbability> => {
    if (!navigator.onLine) throw new Error("Feature unavailable offline.");
    const model = 'gemini-2.5-flash';

    const { homeTeam, awayTeam, homeStats, awayStats, matchTime, matchPeriod, events } = matchState;
    
    const redCardsHome = events.filter(e => e.teamName === homeTeam.name && e.type === 'RED_CARD').length;
    const redCardsAway = events.filter(e => e.teamName === awayTeam.name && e.type === 'RED_CARD').length;
    
    const prompt = `
        You are a football (soccer) analytics expert. Based on the current match state, calculate the win probability for each team and the probability of a draw.

        Match State:
        - Home Team: ${homeTeam.name}
        - Away Team: ${awayTeam.name}
        - Current Score: ${homeStats.goals} - ${awayStats.goals}
        - Match Time: Approximately ${Math.floor(matchTime / 60)} minutes
        - Match Period: ${matchPeriod}
        - Home Team Red Cards: ${redCardsHome}
        - Away Team Red Cards: ${redCardsAway}

        Task:
        Return a JSON object with the probabilities for a home team win, an away team win, and a draw. The probabilities should be floating-point numbers between 0.0 and 1.0, and their sum must equal 1.0.

        Example Response:
        { "home": 0.65, "away": 0.15, "draw": 0.20 }
    `;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        home: { type: Type.NUMBER },
                        away: { type: Type.NUMBER },
                        draw: { type: Type.NUMBER },
                    },
                    required: ["home", "away", "draw"],
                }
            }
        });

        const result = JSON.parse(response.text || '{}');
        
        const sum = result.home + result.away + result.draw;
        if (sum > 0) {
            return {
                home: result.home / sum,
                away: result.away / sum,
                draw: result.draw / sum,
            };
        }
        return { home: 0.33, away: 0.33, draw: 0.34 }; // Fallback

    } catch (error) {
        console.error('Error getting win probability:', error);
        handleApiError(error);
    }
    throw new Error('getWinProbability did not return a value.');
};

export const generateHighlightReelSequence = async (highlights: Highlight[], matchState: MatchState): Promise<number[]> => {
    if (!navigator.onLine) throw new Error("Feature unavailable offline.");
    const model = 'gemini-2.5-flash';
    
    const { homeTeam, awayTeam, homeStats, awayStats } = matchState;

    const eventList = highlights.map(h => ({
        id: h.id,
        type: h.event.type,
        minute: Math.floor(h.event.matchTime / 60),
        description: getEventDescription(h.event),
    }));

    const prompt = `
        You are an expert sports video producer creating a highlight reel for a football (soccer) match.
        
        Match Context:
        - Final Score: ${homeTeam.name} ${homeStats.goals} - ${awayStats.goals} ${awayTeam.name}.

        Available Clips (Key Events):
        ${JSON.stringify(eventList, null, 2)}

        Task:
        Create a compelling narrative for the highlight reel by ordering the event IDs.
        - Prioritize goals above all else.
        - Dramatic moments like red cards or crucial saves should be included.
        - Shots on target can be used as build-up.
        - The order should tell the story of the match, building excitement. Don't just list them chronologically unless it's the most exciting way.

        Return ONLY a JSON array of the event IDs in the optimal sequence.
        
        Example Response:
        [1678886400000, 1678887600000, 1678887000000]
    `;
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                }
            }
        });

        const result = JSON.parse(response.text || '[]');
        if (Array.isArray(result) && result.every(item => typeof item === 'number')) {
            return result;
        } else {
            throw new Error("AI returned an invalid sequence format.");
        }
    } catch(e) {
        console.error("Error generating highlight reel sequence:", e);
        handleApiError(e);
    }
    throw new Error('generateHighlightReelSequence did not return a value.');
};

export const generateHalfTimeAnalysis = async (matchState: MatchState, period: 'First Half' | 'Full Match'): Promise<string> => {
    if (!navigator.onLine) throw new Error("Feature unavailable offline.");
    const model = 'gemini-2.5-flash';
    const { homeTeam, awayTeam, homeStats, awayStats, events } = matchState;

    const significantEvents = events
        .filter(e => ['GOAL', 'RED_CARD', 'YELLOW_CARD'].includes(e.type))
        .map(e => `- ${Math.floor(e.matchTime / 60)}': ${getEventDescription(e)}`)
        .join('\n');
    
    const prompt = `
        You are an expert football (soccer) tactician providing analysis for a live broadcast.
        The match is between ${homeTeam.name} and ${awayTeam.name}.
        The analysis is for the ${period}.
        The current score is ${homeTeam.name} ${homeStats.goals} - ${awayStats.goals} ${awayTeam.name}.

        Key Stats:
        - Possession: ${homeTeam.name} ${homeStats.possession}% - ${awayStats.possession}% ${awayTeam.name}
        - Shots on Target: ${homeTeam.name} ${homeStats.shotsOnTarget} - ${awayStats.shotsOnTarget} ${awayTeam.name}
        - Fouls: ${homeTeam.name} ${homeStats.fouls} - ${awayStats.fouls} ${awayTeam.name}
        
        Significant Events:
        ${significantEvents || 'None'}

        Task:
        Provide a concise (2-3 paragraphs) tactical analysis. 
        1. Summarize the key narrative of the period. Who was dominant? What was the style of play?
        2. Point out one key tactical strength or weakness for each team.
        3. If this is a half-time report, suggest one tactical adjustment each team could make for the second half.
    `;
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response: GenerateContentResponse = await ai.models.generateContent({ model, contents: prompt });
        return (response.text || '').trim();
    } catch (error) {
        console.error('Error generating half-time analysis:', error);
        handleApiError(error);
    }
    throw new Error('generateHalfTimeAnalysis did not return a value.');
};

export const validateApiKey = async (): Promise<{ isValid: boolean; error?: string }> => {
    try {
      if (!process.env.API_KEY) {
          return { isValid: false, error: "API key is not available in the environment." };
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Use a simple, fast model for a low-cost validation call.
      await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'test'
      });
      return { isValid: true };
    } catch (error: any) {
      console.error("API Key validation failed:", error);
      if (error.message.includes("API key not valid") || error.message.includes("Requested entity was not found") || error.message.includes("permission")) {
          return { isValid: false, error: "The selected API key is not valid or lacks permissions. Please select a key from a Google Cloud project with billing enabled and the Gemini API active." };
      }
      return { isValid: false, error: "An unexpected error occurred during key validation. Check your network connection." };
    }
  };