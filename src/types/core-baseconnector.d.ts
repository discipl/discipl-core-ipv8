declare module '@discipl/core-baseconnector' {
    export class BaseConnector {
      linkFromReference(claimReference: string): string
      didFromReference(reference: string): string
      getConnectorName(linkOrDid: string): string
      referenceFromLink(link: string): string
      referenceFromDid(did: string): string
      isLink(str: string): boolean
      idDid(str: string): boolean
      verify(did: string, data: object, verifierDid?: string, verifierprivkey?: string): Promise<string>
    }

    export interface Ssid {
        did: string;
        privkey: string;
    }
}
