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

export interface TrustchainBlock {
    transaction: {
        hash: string;
        name: string;
        data: number;
        metadata: object;
    };
    type: string;
    public_key: string;
    sequence_number: number;
    link_public_key: string;
    link_sequence_number: number;
    previous_hash: string;
    timestamp: number;
    insertTime: string;
    hash: string;
    linked: TrustchainBlock;
}

export interface TrustchainResponse {
    blocks: TrustchainBlock[];
}

export type ApiResponse = SuccessRespone | ErrorResponse

interface SuccessRespone {
    'success': true;
}

interface ErrorResponse {
    'error': string;
}
