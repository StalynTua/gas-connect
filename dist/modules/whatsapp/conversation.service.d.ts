import { DialogStep, UserSession } from './dialog-states.js';
import { CandidateTruck } from '../dispatch/truck-finder.service.js';
import { Coordinates } from '../routing/osrm.service.js';
export interface InboundMessage {
    from: string;
    text?: string;
    location?: Coordinates;
    buttonId?: string;
    mockCandidates?: CandidateTruck[];
}
export declare class ConversationService {
    private sessions;
    getSession(phoneNumber: string): UserSession;
    resetSession(phoneNumber: string): void;
    /**
     * Procesa cualquier mensaje entrante de un usuario en WhatsApp
     */
    processInboundMessage(message: InboundMessage): Promise<{
        nextStep: DialogStep;
        replyText: string;
        buttons?: Array<{
            id: string;
            label: string;
        }>;
    }>;
}
export declare const conversationService: ConversationService;
