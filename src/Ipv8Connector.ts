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
  async getLatestClaim (did: string) {
    const reference = this.referenceFromDid(did)
  }

  /**
   * Expresses a claim
   *
   * The data will be serialized using a stable stringify that only depends on the actual data being claimed,
   * and not on the order of insertion of attributes.
   * If the exact claim has been made before, this will return the existing link, but not recreate the claim.
   *
   * @param ssid - Identity that expresses the claim
   * @param {object} [data.DISCIPL_ALLOW] - Special type of claim that manages ACL
   * @param {string} [data.DISCIPL_ALLOW.scope] - Single link. If not present, the scope is the whole channel
   * @param {string} [data.DISCIPL_ALLOW.did] - Did that is allowed access. If not present, everyone is allowed.
   */
  // TODO Did is not needed for Ipv8 since the url is a direct reference to the owner
  // TODO Think about the `DISCIPL_ALLOW` properties
  async claim (ssid: Ssid, data: object): Promise<void> {
    this.ipv8AttestationClient.requestAttestation(JSON.stringify(data), '')
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

  /**
   * Observe claims being made in the connector
   *
   * @param did - Only observe claims from this did
   * @param claimFilter - Only observe claims that contain this data. If a value is null, claims with the key will be observed.
   * @param accessorDid - Did requesting access
   * @param accessorPrivkey - Private key of did requesting access
   * @returns {Promise<{observable: Observable<ExtendedClaimInfo>, readyPromise: Promise<>}>} -
   * The observable can be subscribed to. The readyPromise signals that the observation has truly started.
   */
  async observe (did: Ssid, claimFilter: object = {}, accessorDid: string = null, accessorPrivkey: string = null) {

  }
}

export { Ipv8Connector }
