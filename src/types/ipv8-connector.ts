export type ClaimData = { [key: string]: Claim } | Claim

export interface ClaimInfo {
    data: object;
    previous?: string;
}

export interface Claim {
    attributeName: string;
    metadata: {
        attestorMid: string;
        attestorUrl: string;
        requesterMid: string;
        requesterUrl: string;
    };
}

export type Verification = {
    attributeHash: string;
    attributeValue: string;
    match: number;
}

export interface Peer {
    mid: string;
    publicKey: string;
}

export interface ConfigOptions {
    VERIFICATION_REQUEST_MAX_RETRIES?: number;
    VERIFICATION_REQUEST_RETRY_TIMEOUT_MS?: number;
    VERIFICATION_MINIMAl_MATCH?: number;
    OBSERVE_VERIFICATION_POLL_INTERVAL_MS?: number;
}
