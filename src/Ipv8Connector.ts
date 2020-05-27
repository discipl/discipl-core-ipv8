import { BaseConnector, Ssid, Claim, ObserveResult, VerificationRequest } from '@discipl/core-baseconnector'
import { Ipv8AttestationClient } from './client/Ipv8AttestationClient'
import { Base64Utils } from './utils/base64'
import { Ipv8Utils } from './utils/ipv8'
import { Peer, Verification } from './types/ipv8-connector'
import stringify from 'json-stable-stringify'
import { Ipv8TrustchainClient } from './client/Ipv8TrustchainClient'
import { timer, from, iif, throwError, of, concat } from 'rxjs'
import { filter, map, switchMap, mergeMap, retryWhen, take, delay } from 'rxjs/operators'

import forge from 'node-forge'
import { OutstandingVerifyRequest } from './types/ipv8'

class Ipv8Connector extends BaseConnector {
  LINK_TEMPORARY_INIDACOTR = 'temp'
  LINK_PERMANTENT_INDICATOR = 'perm'
  LINK_DELIMITER = ':'
  VERIFICATION_REQUEST_MAX_RETRIES = 10
  VERIFICATION_REQUEST_RETRY_TIMEOUT_MS = 1000
  VERIFICATION_MINIMAl_MATCH = 0.99;
  OBSERVE_VERIFICATION_POLL_INTERVAL_MS = 1000

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
    this.ipv8TrustchainClient = new Ipv8TrustchainClient(serverEndpoint)
  }

  /**
   * Extract the information of a {@link Peer} from a given did. The public_key will be stored as a hexadecimal string.
   *
   * @param did Did of a IPv8 peer
   */
  extractPeerFromDid (did: string): Peer {
    let publicKey = BaseConnector.referenceFromDid(did)

    if (publicKey === null) {
      throw new Error(`The given string "${did}" is not a valid DID`)
    }

    publicKey = forge.util.decode64(publicKey)

    return {
      publicKey: forge.util.bytesToHex(publicKey),
      mid: Ipv8Utils.publicKeyToMid(publicKey, 'bytes')
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
   * @param ssid Identity that expresses the claim
   * @param privkey Private key to sign the claim
   * @param claim Made claim. This is the claim itself (that can be any object) of a attestation. A attestation is a object
   * with a single key that represents the attestation and a value that holds the actual claim.
   * @param attester Identity that is expected to attest te claim
   * @return Link to the maide claim or attestation.
   */
  async claim (ssid: string, privkey: string, claim: object | string, attester: string): Promise<string> {
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

      throw new Error(`Unknown link indicator: ${indicator}`)
    }

    return this.newClaim(ssid, attester, claim)
  }

  /**
   * Attest a claim that has not been attested for the first time. In IPv8 context this is always a
   * new attestation request that is in the outgoing queue.
   *
   * @param ssid Peer that attests the attribute
   * @param attributeName Base64 encoded attribute to attest
   * @param attestationValue Value to attest the attribute with
   */
  async attestClaim (ssid: string, attributeName: string, attestationValue: string): Promise<string> {
    const attester = this.extractPeerFromDid(ssid)
    const claim = (await this.ipv8AttestationClient.getOutstanding()).find(outstanding => outstanding.attributeName === attributeName)

    if (!claim) {
      throw new Error(`Attestation request for "${attributeName}" could not be found`)
    }

    await this.ipv8AttestationClient.attest(claim.attributeName, attestationValue, claim.peerMid)

    return this.ipv8TrustchainClient.getBlocksForUser(attester.publicKey)
      .then(blocks => blocks.find(block => block.transaction.name === attributeName))
      .then(block => this.linkFromReference(`perm:${block.hash}`))
  }

  /**
   * Re-attest an attribute that is allready attested.
   *
   * @param ssid Peer that attests the attribute
   * @param attributeHash Hash of the attribute to attest
   * @param attestationValue Value to attest the attribute with
   */
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
   * @param attester Identit that is expected to attest the claim
   * @param data Data that is claimed
   * @return Temporary link to the made claim
   */
  async newClaim (ssid: string, attester: string, data: object | string): Promise<string> {
    const peer = this.extractPeerFromDid(attester)

    if (typeof data === 'object') {
      data = stringify(data)
    }

    // Attribute names are base64 to avoid conflicts with colons when a object is given
    const stringData = Base64Utils.toBase64(data)
    await this.ipv8AttestationClient.requestAttestation(stringData, peer.mid)

    return this.linkFromReference(`temp:${stringData}`)
  }

  /**
   * Verifies existence of a claim with the given data in the channel of the given did
   *
   * @param attestorDid The did that might attested the claim
   * @param attestation Data that needs to be verified in the format of {@code {'value': 'link'}}
   * @param verifierDid Did that wants to verify (used for access management)
   * @param verifierPrivkey Private key of the verifier
   * @returns Link to claim that proves this data, null if such a claim does not exist
   */
  async verify (attestorDid: string, attestation: object, verifierDid: string, verifierPrivkey: string = null): Promise<string> {
    const attestationKeys = Object.keys(attestation)
    const attestationValues = Object.values(attestation)

    if (attestationKeys.length !== 1 || !BaseConnector.isLink(attestationValues[0])) {
      throw new Error(`Unexpected attestation object: ${stringify(attestation)}`)
    }

    const attestationValue = attestationKeys.pop()
    const link = attestationValues.pop()
    const attestorPeer = this.extractPeerFromDid(attestorDid)
    const reference = BaseConnector.referenceFromLink(link)
    const refSplit = reference?.split(this.LINK_DELIMITER)
    const indicator = refSplit[0]

    if (refSplit.length !== 2) {
      throw new Error('Could not extract a valid reference from the given link')
    }

    if (indicator === this.LINK_TEMPORARY_INIDACOTR) {
      throw new Error('Only an attestation refering to a permanent link can be verified')
    }

    const blockHash = refSplit[1]
    const block = await this.ipv8TrustchainClient.getBlocksForUser(attestorPeer.publicKey)
      .then(blocks => blocks.find(block => block.hash === blockHash))

    if (!block || block.public_key !== attestorPeer.publicKey) {
      return null
    }

    // The link is referring to the block that attested the claim, so the linked block is the owner of the claim
    const attributeHash = forge.util.encode64(block.transaction.hash)
    const ownerMid = Ipv8Utils.publicKeyToMid(block.link_public_key, 'hex')

    await this.ipv8AttestationClient.verify(ownerMid, attributeHash, attestationValue)

    return this.waitForVerificationResult(attributeHash)
      .then(res => res.match >= this.VERIFICATION_MINIMAl_MATCH ? link : null)
      .catch(_ => null)
  }

  /**
   * Wait for the verification result of a attribute
   *
   * @param attributeHash Attribute hash to get  the verification result for
   */
  async waitForVerificationResult (attributeHash: string): Promise<Verification> {
    return of(attributeHash).pipe(
      mergeMap(() => this.ipv8AttestationClient.getVerificationOutput()),
      map(verifications => verifications.find(v => v.attributeHash === attributeHash)),
      // If the verification is present pass it further, otherwise throw an "try again" error
      switchMap(verification => iif(() => verification === undefined || verification.match === 0, throwError('try again'), of(verification))),
      // When the "try again" error is thrown, retry after a given delay until the maximum (take) is reached
      retryWhen(errors => concat(
        errors.pipe(
          delay(this.VERIFICATION_REQUEST_RETRY_TIMEOUT_MS),
          take(this.VERIFICATION_REQUEST_MAX_RETRIES)
        ),
        throwError(new Error('No verification result received. The peer rejected the verification request or is offline'))
      ))
    ).toPromise()
  }

  /**
   * Retrieve a claim by its link
   *
   * @param link Link to the claim
   * @param did Did that wants access
   * @param privkey Key of the did requesting access
   * @returns Object containing the data of the claim and a link to the claim before it.
   */
  async get (link: string, did: string = null, privkey: string = null): Promise<Claim> {
    const reference = BaseConnector.referenceFromLink(link)
    const refSplit = reference?.split(this.LINK_DELIMITER)
    const indicator = refSplit[0]

    if (refSplit.length !== 2) {
      throw new Error('Could not extract a valid reference from the given claim')
    }

    if (indicator === this.LINK_TEMPORARY_INIDACOTR) {
      const attributeName = refSplit[1]

      return {
        data: Base64Utils.fromBase64(attributeName),
        previous: null
      }
    }

    if (indicator === this.LINK_PERMANTENT_INDICATOR) {
      const blockHash = refSplit[1]
      const block = (await this.ipv8TrustchainClient.getBlock(blockHash))

      return {
        data: block.transaction.name,
        previous: this.linkFromReference(`perm:${block.previous_hash}`)
      }
    }

    throw new Error(`Unknown link indicator: ${indicator}`)
  }

  /**
   * Get the DID of the owner of a claim
   *
   * @param link Link to a IPv8 claim
   */
  async getDidOfClaim (link: string): Promise<string> {
    const reference = BaseConnector.referenceFromLink(link)
    const refSplit = reference?.split(this.LINK_DELIMITER)

    if (!refSplit || refSplit.length !== 2) {
      throw new Error('Could not extract a valid reference from the given link')
    }

    const indicator = refSplit[0]
    if (indicator === this.LINK_TEMPORARY_INIDACOTR) {
      return null
    }

    if (indicator === this.LINK_PERMANTENT_INDICATOR) {
      const blockHash = refSplit[1]
      const block = (await this.ipv8TrustchainClient.getBlock(blockHash))

      // Permanent links are referring to the block of the attestor, so the link_public_key is the owner
      return Ipv8Utils.publicKeyToDid(block.link_public_key, 'hex')
    }

    throw new Error(`Unknown link indicator: ${indicator}`)
  }

  observe (): Promise<void> {
    throw new Error('Method not implemented.')
  }

  /**
   * Observe for verification requests.
   *
   * This method will actively poll the IPv8 node for outstanding verification requests. It will emit all outstanding request and won't
   * emit when no requests are found.
   *
   * @param did Only observe claims for this did
   * @param claimFilter Filter claims on a did
   * @param accessorDid Did that is observing
   * @param accessorPrivkey Private key of did that is observing
   */
  async observeVerificationRequests (did: string, claimFilter: { did: string } = null, accessorDid: string = null, accessorPrivkey: string = null): Promise<ObserveResult<VerificationRequest>> {
    const peer = this.extractPeerFromDid(did)
    const filterPeers = switchMap((outstanding: OutstandingVerifyRequest[]) => outstanding.filter(r => r.peerMid === this.extractPeerFromDid(claimFilter.did).mid))

    // Retreive all outstanding verification requests in the given interval
    const observarable = timer(0, this.OBSERVE_VERIFICATION_POLL_INTERVAL_MS).pipe(
      switchMap(() => from(this.ipv8AttestationClient.getOutstandingVerify())),
      // When the claimfilter is set apply it, otherwise proceed without filtering
      outstanding => iif(() => claimFilter !== null, filterPeers(outstanding), outstanding.pipe(switchMap(m => m))),
      mergeMap(request =>
        // To convert a verification request into a link the trustchain block is needed
        from(this.ipv8TrustchainClient.getBlocksForUser(peer.publicKey))
          .pipe(
            map(blocks => blocks.find(b => b.transaction.name === request.name)),
            filter(block => block !== undefined),
            map(block => {
              const link = this.linkFromReference(`perm:${block.hash}`)
              const prevLink = this.linkFromReference(`perm:${block.previous_hash}`)
              const ownerDid = Ipv8Utils.publicKeyToDid(block.public_key, 'hex')

              return {
                claim: { data: request.name, previous: prevLink },
                link: link,
                did: ownerDid,
                // A mid cannot be converted back to the public key, so no did is generated
                verifier: { did: null, mid: request.peerMid }
              }
            })
          )
      )
    )

    return { observable: observarable, readyPromise: Promise.resolve() }
  }
}

export default Ipv8Connector
