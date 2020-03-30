import * as IPv8 from '../types/ipv8'
import { Base64Utils } from '../utils/base64'
import 'isomorphic-fetch'

export class Ipv8AttestationClient {
  private baseUrl: string

  /**
   * Create a new IPv8 Attestation client instance
   *
   * @param {string} apiUrl Base url of the Ipv8 rest api including the port
   */
  constructor (apiUrl: string) {
    this.baseUrl = apiUrl
  }

  /**
   * Get all other visible peers in the network
   *
   * @return Array of peer identifiers
   */
  async getPeers (): Promise<string[]> {
    const urlParams = new URLSearchParams({ type: 'peers' })
    const res = await fetch(`${this.baseUrl}/attestation?` + urlParams)

    if (!res.ok) {
      throw new Error(`Error when sending request to IPv8: ${await res.text()}`)
    }

    return res.json()
  }

  /**
   * Get all outstanding requests for attestation
   */
  async getOutstanding (): Promise<IPv8.OutstandingRequest[]> {
    const urlParams = new URLSearchParams({ type: 'outstanding' })
    const res = await fetch(`${this.baseUrl}/attestation?` + urlParams)

    if (!res.ok) {
      throw new Error(`Error when sending request to IPv8: ${await res.text()}`)
    }

    const json: string[][] = await res.json()
    return json.map(request => ({
      peerMid: request[0],
      attributename: request[1],
      metadata: request[2]
    }))
  }

  /**
   * Get all attested attributes of this peer
   *
   * @param {string} mid Base64 encoded peer reference
   * @return All attributes of the current peer.
   */
  async getAttributes (mid: string = null): Promise<IPv8.Attribute[]> {
    const urlParams = new URLSearchParams({ type: 'attributes' })

    if (mid) {
      urlParams.append('mid', mid)
    }

    const res = await fetch(`${this.baseUrl}/attestation?` + urlParams)

    if (!res.ok) {
      throw new Error(`Error when sending request to IPv8: ${await res.text()}`)
    }

    const json: string[][] = await res.json()
    return json.map(attribute => ({
      name: attribute[0],
      hash: attribute[1],
      metadata: attribute[2],
      attestor: attribute[3]
    }))
  }

  /**
   * Get all outstanding requests for verification
   */
  async getOutstandingVerify (): Promise<IPv8.OutstandingVerifyRequest> {
    const urlParams = new URLSearchParams({ type: 'outstanding_verify' })
    const res = await fetch(`${this.baseUrl}/attestation?` + urlParams)

    if (!res.ok) {
      throw new Error(`Error when sending request to IPv8: ${await res.text()}`)
    }

    return res.json()
  }

  /**
   * Get the results of requested verifications
   */
  async getVerificationOutput (): Promise<IPv8.VerificationOutput> {
    const urlParams = new URLSearchParams({ type: 'verification_output' })
    const res = await fetch(`${this.baseUrl}/attestation?` + urlParams)

    if (!res.ok) {
      throw new Error(`Error when sending request to IPv8: ${await res.text()}`)
    }

    return res.json()
  }

  /**
   * Request another peer to attest an attribute
   *
   * @param attributeName Name of the attribute to request attestation for
   * @param peerToAttest The base64 mid of the peer that will attest the attribute
   * @param metadata Optional metatadat
   */
  async requestAttestation (attributeName: string, peerToAttest: string, metadata: object = {}): Promise<IPv8.ApiResponse> {
    const urlParams = new URLSearchParams({
      type: 'request',
      mid: peerToAttest,
      metadata: Base64Utils.toBase64(JSON.stringify(metadata)),
      // eslint-disable-next-line @typescript-eslint/camelcase
      attribute_name: attributeName
    })

    const res = await fetch(`${this.baseUrl}/attestation?` + urlParams, { method: 'POST' })

    if (!res.ok) {
      throw new Error(`Error when sending request to IPv8: ${await res.text()}`)
    }

    return res.json()
  }

  /**
   * Attest a attribute with a value
   *
   * @param attributeName Attribute to attest
   * @param attributeValue Value to test the attribute with
   * @param attributeOwner The base64 mid of the owner of the attribute
   */
  async attest (attributeName: string, attributeValue: string, attributeOwner: string): Promise<IPv8.ApiResponse> {
    const urlParams = new URLSearchParams({
      type: 'attest',
      mid: attributeOwner,
      // eslint-disable-next-line @typescript-eslint/camelcase
      attribute_name: attributeName,
      // eslint-disable-next-line @typescript-eslint/camelcase
      attribute_value: Base64Utils.toBase64(attributeValue)
    })

    const res = await fetch(`${this.baseUrl}/attestation?` + urlParams, { method: 'POST' })

    if (!res.ok) {
      throw new Error(`Error when attesting ${attributeName}: ${JSON.stringify(res.body)}`)
    }

    return res.json()
  }
}
