/* eslint-disable */

export type VoiceControllerTranscribe201 = {
   text?: string;
   language?: string | null;
};

export type VoiceControllerTranscribe413 = any;

export type VoiceControllerTranscribeMutationRequest = {
   file: Blob;
};

export type VoiceControllerTranscribeMutationResponse = VoiceControllerTranscribe201;

export type VoiceControllerTranscribeMutation = {
   Response: VoiceControllerTranscribe201;
   Request: VoiceControllerTranscribeMutationRequest;
   Errors: VoiceControllerTranscribe413;
};
