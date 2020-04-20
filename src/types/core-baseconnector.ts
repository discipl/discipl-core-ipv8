declare module '@discipl/core-baseconnector' {
  export abstract class BaseConnector {
    abstract getName(): string
    abstract getDidOfClaim(link: string): Promise<string>
    abstract getLatestClaim(did: string): Promise<string>
    abstract newIdentity(): Promise<Ssid>
    abstract claim(did: string, privkey: string, data: object, atester?: string): Promise<string>
    abstract get(link: string, did: string, privkey: string): Promise<{ data: object; previous: string }>

    linkFromReference(claimReference: string): string
    didFromReference(reference: string): string
    static getConnectorName(linkOrDid: string): string
    static referenceFromLink(link: string): string
    static referenceFromDid(did: string): string
    static isLink(str: any): boolean
    static idDid(str: string): boolean
    static verify(did: Ssid, data: object, verifierDid?: string, verifierprivkey?: string): Promise<string>
  }

  export interface Ssid {
    did: string;
    privkey: string;
  }

  export interface Claim {
    data: any;
    previous: string;
  }
}
