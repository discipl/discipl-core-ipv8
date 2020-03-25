export interface Attribute {
    name: string;
    hash: string;
    metadata: {};
    attestor: string;
}

export interface OutstandingRequest {
    peerMid: string;
    name: string;
    metadata: string;
}

export interface OutstandingVerifyRequest {
    peerMid: string;
    name: string;
}

export interface VerificationOutput {
    [key: string]: {
        attributeValue: string;
        match: number;
    };
}

export type ApiResponse = SuccessRespone | ErrorResponse

interface SuccessRespone {
    'success': true;
}

interface ErrorResponse {
    'error': string;
}
