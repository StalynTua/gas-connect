export interface SendMessageOptions {
    to: string;
    text: string;
    buttons?: Array<{
        id: string;
        label: string;
    }>;
}
export interface InstanceStateResponse {
    instanceName: string;
    state: 'open' | 'connecting' | 'close' | 'disconnected' | 'unknown';
    connected: boolean;
}
export interface QrCodeResponse {
    pairingCode?: string;
    code?: string;
    base64?: string;
    count?: number;
}
export declare class EvolutionApiClient {
    private baseUrl;
    private apiKey;
    private instanceName;
    constructor();
    getInstanceName(): string;
    getBaseUrl(): string;
    /**
     * Consulta el estado actual de la conexión de la instancia WhatsApp
     */
    getConnectionState(): Promise<InstanceStateResponse>;
    /**
     * Crea una nueva instancia en Evolution API v2
     */
    createInstance(): Promise<boolean>;
    /**
     * Obtiene el código QR de vinculación para escanear desde WhatsApp
     */
    getQrCode(phoneNumber?: string): Promise<QrCodeResponse | null>;
    /**
     * Configura la URL del Webhook para eventos de la instancia
     */
    setWebhook(webhookUrl?: string): Promise<boolean>;
    /**
     * Cierra sesión de la instancia de WhatsApp
     */
    logoutInstance(): Promise<boolean>;
    /**
     * Reinicia el servicio de la instancia
     */
    restartInstance(): Promise<boolean>;
    /**
     * Garantiza que la instancia existe y que el webhook esté configurado
     */
    ensureConfigured(webhookUrl?: string): Promise<InstanceStateResponse>;
    /**
     * Envía un mensaje de texto simple a un número de WhatsApp
     */
    sendTextMessage(to: string, message: string): Promise<boolean>;
    /**
     * Envía un mensaje con botones de selección interactivos
     */
    sendButtonMessage(to: string, title: string, buttons: Array<{
        id: string;
        label: string;
    }>): Promise<boolean>;
}
export declare const evolutionClient: EvolutionApiClient;
