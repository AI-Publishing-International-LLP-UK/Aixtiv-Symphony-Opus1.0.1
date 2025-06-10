export type VoiceModel = string;
export type ImageProcessing = {
model: string;
style: string;
resolution: string;
format: string;
caching: boolean;
};
export type CommunicationProtocol = {
type: string;
compression: boolean;
keepAlive: boolean;
};

