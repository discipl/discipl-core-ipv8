/// <reference path="./types/core-baseconnector.d.ts"/>
import { BaseConnector, Ssid } from '@discipl/core-baseconnector'
import { Ipv8AttestationClient } from './Ipv8AttestationClient'
import { Peer } from 'ipv8-connector'
import stringify from 'json-stable-stringify'

export class Ipv8Connector extends BaseConnector {
  LINK_TEMPORARY_INIDACOTR = 'temp'
  LINK_PERMANTENT_INICATOR = 'perm'
  ipv8AttestationClient: Ipv8AttestationClient

  constructor () {
    super()
    this.ipv8AttestationClient = new Ipv8AttestationClient('')
  }

  /**
   * Returns the name of this connector. Mainly used in did and link constructions.
   *
   * @returns The string 'ipv8'.
   */
  getName (): string {
    return 'ipv8'
  }

  /**
   * Configure the IPv8 Connector
   *
   * @param serverEndpoint IPv8 service endpoint without port
   */
  configure (serverEndpoint: string): void {
    this.ipv8AttestationClient = new Ipv8AttestationClient(serverEndpoint)
  }

  /**
   * Looks up the corresponding did for a particular claim
   *
   * @param link - Link to the claimtemp

  /**
   * Extract the information of a {@link Peer} from a given did
   *
   * @param did Did of a IPv8 peer
   */
  extractPeerFromDid (did: string): Peer {
    const reference = BaseConnector.referenceFromDid(did)

    // TODO Is base64 encoding needed?
    return JSON.parse(decodeURIComponent(reference))
  }

  /**
   * Returns a link to the last claim made by this did
   *
   * @param did
   * @returns {Promise<string>} Link to the last claim made by this did
   */
  async getLatestClaim (did: string): Promise<string> {
    throw new Error('Method not implemented.')
  }

  /**
   * Generate a new identify
   *
   * @returns Created identity
   */
  async newIdentity (): Promise<Ssid> {
    throw new Error('Method not implemented.')
  }

  /**
   * Expresses a claim
   *
   * The data will be serialized using a stable stringify that only depends on the actual data being claimed,
   * and not on the order of insertion of attributes.
   * If the exact claim has been made before, this will return the existing link, but not recreate the claim.
   *
   * @param ssid - Identity that expresses the claim
   * @param privkey - Private key to sign the claim
   * @param claim - Made claim. This is the claim itself (that can be any object) of a attestation. A attestation is a object
   * with a single key that represents the attestation and a value that holds the actual claim.
   * @return Link to the maide claim or attestation.
   */
  async claim (ssid: string, privkey: string, claim: object): Promise<string> {
    const objectKeys = Object.keys(claim)
    const objectValues = Object.values(claim)

    // If the first value is a link the claim is an attestation
    if (objectValues.length > 0 && BaseConnector.isLink(objectValues[0])) {
      const attestationValue = objectKeys[0]
      const attestationLink = objectValues[0]
      const reference = BaseConnector.referenceFromLink(attestationLink)
      const refSplit = reference?.split(':')

      if (reference === null || refSplit.length !== 2) {
        return Promise.reject(new Error('Could not extract a valid reference from the given claim'))
      }

      const indicator = refSplit[0]

      if (indicator === this.LINK_TEMPORARY_INIDACOTR) {
        const attributeName = refSplit[1]
        return this.attestClaim(ssid, attributeName, attestationValue)
      } else if (indicator === this.LINK_PERMANTENT_INICATOR) {
        const attributeHash = refSplit[1]
        return this.reattestClaim(ssid, attributeHash, attestationValue)
      }

      return Promise.reject(new Error(`Unknown link indirector: ${indicator}`))
    }

    return this.newClaim(ssid, claim)
  }

  /**
   * Attest a claim that has not been attested for the first time. In IPv8 context this is always a
   * new attestation request that is in the outgoing queue.
   *
   * @param ssid Peer that attests the attribute
   * @param attributeName Attribute to attest
   * @param attestationValue Value to attest the attribute with
   */
  async attestClaim (ssid: string, attributeName: string, attestationValue: string): Promise<string> {
    // TODO when using a object as attribute name, the colon causes issues. However urlencoding might not be the best option
    attributeName = decodeURIComponent(attributeName)
    const claim = (await this.ipv8AttestationClient.getOutstanding()).filter(outstanding => outstanding.name === attributeName).pop()

    if (!claim) {
      return Promise.reject(new Error(`Attestation request for ${attributeName} could not be found`))
    }

    await this.ipv8AttestationClient.attest(claim.name, attestationValue, '')

    return this.ipv8AttestationClient.getAttributes()
      .then(attributes => attributes.filter(a => a.name === attributeName)[0])
      .then(attribute => this.linkFromReference(`perm:${attribute.hash}`))
  }

  /**
   * Re-attest an attribute that is allready attested.
   *
   * @param ssid Peer that attests the attribute
   * @param attributeHash Hash of the attribute to attest
   * @param attestationValue Value to attest the attribute with
   */
  async reattestClaim (ssid: string, attributeHash: string, attestationValue: string): Promise<string> {
    const claim = (await this.ipv8AttestationClient.getAttributes()).filter(attributes => attributes.hash === attributeHash).pop()

    if (!claim) {
      return Promise.reject(new Error(`Attribute with hash '${attributeHash}' could not be found`))
    }

    await this.ipv8AttestationClient.attest(claim.name, attestationValue, '')

    return this.ipv8AttestationClient.getAttributes()
      .then(attributes => attributes.filter(a => a.hash === attributeHash)[0])
      .then(attribute => this.linkFromReference(`perm:${attribute.hash}`))
  }

  /**
   * Express a new claim for a given identity
   *
   * @param ssid Identity that express the claim
   * @param data Data that is claimed
   * @return Temporary link to the made claim
   */
  async newClaim (ssid: string, data: any): Promise<string> {
    // TODO when using a object as attribute name, the colon causes issues. However urlencoding might not be the best option
    const stringData = encodeURIComponent(stringify(data))
    await this.ipv8AttestationClient.requestAttestation(stringData, '')

    return this.linkFromReference(`temp:${stringData}`)
  }

  /**
   * Retrieve a claim by its link
   *
   * @param link - Link to the claim
   * @param did - Did that wants access
   */
  async get (link: string, did: string = null, privkey: string = null): Promise<{ data: object; previous: string }> {
    throw new Error('Method not implemented.')
  }

  getDidOfClaim (link: string): Promise<string> {
    throw new Error('Method not implemented.')
  }

  observe (): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
