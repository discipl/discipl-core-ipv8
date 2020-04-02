/// <reference path="./types/core-baseconnector.d.ts"/>
import { BaseConnector, Ssid, Claim } from '@discipl/core-baseconnector'
import { Ipv8AttestationClient } from './client/Ipv8AttestationClient'
import { Base64Utils } from './utils/base64'
import { Peer } from 'ipv8-connector'
import stringify from 'json-stable-stringify'
import { Ipv8TrustchainClient } from './client/Ipv8TrustchainClient'

export class Ipv8Connector extends BaseConnector {
  LINK_TEMPORARY_INIDACOTR = 'temp'
  LINK_PERMANTENT_INDICATOR = 'perm'
  LINK_DELIMITER = ':'
  ipv8AttestationClient: Ipv8AttestationClient
  ipv8TrustchainClient: Ipv8TrustchainClient

  constructor () {
    super()
    this.ipv8AttestationClient = new Ipv8AttestationClient('')
    this.ipv8TrustchainClient = new Ipv8TrustchainClient('')
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

    try {
      return JSON.parse(Base64Utils.fromBase64(reference))
    } catch (e) {
      throw Error(`Could not parse or decode DID: ${e.message}`)
    }
  }

  /**
   * Returns a link to the last attested claim made by this did
   *
   * @param did Did to get the last claim for
   * @returns {Promise<string>} Link to the last claim made by this did
   */
  async getLatestClaim (did: string): Promise<string> {
    const peer = this.extractPeerFromDid(did)

    return this.ipv8TrustchainClient.getBlocksForUser(peer.publicKey)
      .then(blocks => blocks.shift())
      .then(lastBlock => this.linkFromReference(`perm:${lastBlock.hash}`))
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
    if (objectValues.length === 1 && BaseConnector.isLink(objectValues[0])) {
      const attestationValue = objectKeys[0]
      const attestationLink = objectValues[0]
      const reference = BaseConnector.referenceFromLink(attestationLink)
      const refSplit = reference?.split(this.LINK_DELIMITER)

      if (refSplit.length !== 2) {
        throw new Error('Could not extract a valid reference from the given claim')
      }

      const indicator = refSplit[0]
      if (indicator === this.LINK_TEMPORARY_INIDACOTR) {
        const attributeName = refSplit[1]
        return this.attestClaim(ssid, attributeName, attestationValue)
      } else if (indicator === this.LINK_PERMANTENT_INDICATOR) {
        const attributeHash = refSplit[1]
        return this.reattestClaim(ssid, attributeHash, attestationValue)
      }

      throw new Error(`Unknown link indirector: ${indicator}`)
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
    const attester = this.extractPeerFromDid(ssid)

    // Attribute names are base64 to avoid conflicts with colons when a object is given
    attributeName = Base64Utils.fromBase64(attributeName)
    const claim = (await this.ipv8AttestationClient.getOutstanding()).find(outstanding => outstanding.attributeName === attributeName)

    if (!claim) {
      throw new Error(`Attestation request for "${attributeName}" could not be found`)
    }

    await this.ipv8AttestationClient.attest(claim.attributeName, attestationValue, claim.peerMid)

    return this.ipv8TrustchainClient.getBlocksForUser(attester.publicKey)
      .then(blocks => blocks.find(block => block.transaction.name === attributeName))
      .then(attribute => this.linkFromReference(`perm:${attribute.hash}`))
  }

  /**
   * Re-attest an attribute that is allready attested.
   *
   * @param ssid Peer that attests the attribute
   * @param attributeHash Hash of the attribute to attest
   * @param attestationValue Value to attest the attribute with
   */
  // FIXME Is it possible to store the previous claim into the metadata?
  async reattestClaim (ssid: string, attributeHash: string, attestationValue: string): Promise<string> {
    const attester = this.extractPeerFromDid(ssid)
    const block = (await this.ipv8TrustchainClient.getBlocksForUser(attester.publicKey)).find(blocks => blocks.hash === attributeHash)
    const claim = (await this.ipv8AttestationClient.getOutstanding()).find(outstanding => outstanding.attributeName === block?.transaction.name)

    if (!claim) {
      throw new Error(`Attribute with hash "${attributeHash}" could not be found`)
    }

    await this.ipv8AttestationClient.attest(claim.attributeName, attestationValue, claim.peerMid)

    return this.ipv8TrustchainClient.getBlocksForUser(attester.publicKey)
      .then(blocks => blocks.find(block => block.hash === attributeHash))
      .then(attribute => this.linkFromReference(`perm:${attribute.hash}`))
  }

  /**
   * Express a new claim for a given identity
   *
   * @param ssid Identity that express the claim
   * @param data Data that is claimed
   * @return Temporary link to the made claim
   */
  async newClaim (ssid: string, data: object|string): Promise<string> {
    const peer = this.extractPeerFromDid(ssid)

    // Attribute names are base64 to avoid conflicts with colons when a object is given
    const stringData = Base64Utils.toBase64(stringify(data))
    await this.ipv8AttestationClient.requestAttestation(stringData, peer.mid)

    return this.linkFromReference(`temp:${stringData}`)
  }

  /**
   * Retrieve a claim by its link
   *
   * @param link - Link to the claim
   * @param did - Did that wants access
   * @param privkey - Key of the did requesting access
   * @returns Object containing the data of the claim and a link to the claim before it.
   */
  async get (link: string, did: string = null, privkey: string = null): Promise<Claim> {
    const peer = this.extractPeerFromDid(did)
    const reference = BaseConnector.referenceFromLink(link)
    const refSplit = reference?.split(this.LINK_DELIMITER)

    if (refSplit.length !== 2) {
      throw new Error('Could not extract a valid reference from the given claim')
    }

    const indicator = refSplit[0]
    if (indicator === this.LINK_TEMPORARY_INIDACOTR) {
      const attributeName = refSplit[1]

      return {
        data: Base64Utils.fromBase64(attributeName),
        previous: null
      }
    }

    if (indicator === this.LINK_PERMANTENT_INDICATOR) {
      const attributeHash = refSplit[1]
      const block = (await this.ipv8TrustchainClient.getBlocksForUser(peer.publicKey)).find(block => block.hash === attributeHash)

      return {
        data: block.transaction.name,
        previous: this.linkFromReference(`perm:${block.previous_hash}`)
      }
    }

    throw new Error(`Unknown link indirector: ${indicator}`)
  }

  getDidOfClaim (link: string): Promise<string> {
    throw new Error('Method not implemented.')
  }

  observe (): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
