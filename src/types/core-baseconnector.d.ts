declare module '@discipl/core-baseconnector' {
    export abstract class BaseConnector {
      abstract getName(): string
      abstract getDidOfClaim(link: string): Promise<string>
      abstract getLatestClaim(did: string): Promise<string>
      abstract newIdentity(): Promise<Ssid>
      abstract claim(did: string, privkey: string, data: object): Promise<string>
      abstract get(link: string, did: string, privkey: string): Promise<{data: object; previous: string}>

      linkFromReference(claimReference: string): string
      didFromReference(reference: string): string
      getConnectorName(linkOrDid: string): string
      referenceFromLink(link: string): string
      referenceFromDid(did: string): string
      isLink(str: string): boolean
      idDid(str: string): boolean
      verify(did: Ssid, data: object, verifierDid?: string, verifierprivkey?: string): Promise<string>
    }

    export interface Ssid {
        did: string;
        privkey: string;
    }
}
