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
