import { BaseConnector, Ssid } from '@discipl/core-baseconnector'
import { Ipv8AttestationClient } from './Ipv8AttestationClient'

class Ipv8Connector extends BaseConnector {
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

  configure (serverEndpoint: string): void {
    this.ipv8AttestationClient = new Ipv8AttestationClient(serverEndpoint)
  }

  /**
   * Looks up the corresponding did for a particular claim
   *
   * @param link - Link to the claim
   * @returns Did that made this claim
   */
  async getDidOfClaim (link: string): Promise<string> {
    return null
  }

  /**
   * Returns a link to the last claim made by this did
   *
   * @param did
   * @returns {Promise<string>} Link to the last claim made by this did
   */
  async getLatestClaim (did: string): Promise<string> {
    const reference = this.referenceFromDid(did)
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
   * @param {string} ssid.privkey - Private key to sign the claim
   * @param {object} [data.DISCIPL_ALLOW] - Special type of claim that manages ACL
   * @param {string} [data.DISCIPL_ALLOW.scope] - Single link. If not present, the scope is the whole channel
   * @param {string} [data.DISCIPL_ALLOW.did] - Did that is allowed access. If not present, everyone is allowed.
   */
  // TODO The API does not work out because there is no claim unitl it is attested. Hijack the DISCIPLE_ALLOW.did?
  async claim (ssid: string, privkey: string, data: object): Promise<string> {
    const reference = this.referenceFromDid(ssid)
    const metadata = {
      message: data,
      publicKey: reference
    }

    this.ipv8AttestationClient.requestAttestation(JSON.stringify(data), '', metadata)
  }

  /**
   * Retrieve a claim by its link
   *
   * @param link - Link to the claim
   * @param did - Did that wants access
   */
  async get (link: string, did: string = null, privkey: string = null) {
    return this.ipv8AttestationClient.getAttributes()
  }
}

export { Ipv8Connector }
