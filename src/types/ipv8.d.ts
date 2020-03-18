export interface Attribute {
    name: string;
    hash: string;
    metadata: {};
    attestor: string;
}

export interface OutstandingRequest {
    peerId: string;
    attributeName: string;
    metadata: object;
}

export interface OutstandingVerifyRequest {
    peerId: string;
    attributeName: string;
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
