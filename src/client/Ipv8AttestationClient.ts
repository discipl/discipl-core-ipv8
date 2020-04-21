import * as IPv8 from '../types/ipv8'
import { Base64Utils } from '../utils/base64'
import 'isomorphic-fetch'
import { Verification } from '../types/ipv8-connector'
import stringify from 'json-stable-stringify'

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
      attributeName: request[1],
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
   * Ask a peer to verify if a given hash is corresponding to a given value
   *
   * @param peer Owner mid of the attribute to verify
   * @param attributeHash Hash of the attribute to verify
   * @param attributeValue Value to verify
   */
  async verify (peer: string, attributeHash: string, attributeValue: string): Promise<IPv8.ApiResponse> {
    const urlParams = new URLSearchParams({
      type: 'verify',
      mid: peer,
      // eslint-disable-next-line @typescript-eslint/camelcase
      attribute_hash: attributeHash,
      // eslint-disable-next-line @typescript-eslint/camelcase
      attribute_values: Base64Utils.toBase64(attributeValue)
    })
    const res = await fetch(`${this.baseUrl}/attestation?` + urlParams, { method: 'POST' })

    if (!res.ok) {
      throw new Error(`Error when sending request to IPv8: ${await res.text()}`)
    }

    return res.json()
  }

  /**
   * Allow a given peer to verify the content of an attribute
   *
   * @param peer Peer that is allowed to verify the attribute value
   * @param attributeName Attribute to allow verification for
   */
  async allowVerify (peer: string, attributeName: string): Promise<IPv8.ApiResponse> {
    const urlParams = new URLSearchParams({
      type: 'allow_verify',
      mid: peer,
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
   * Get all outstanding requests for verification
   */
  async getOutstandingVerify (): Promise<IPv8.OutstandingVerifyRequest[]> {
    const urlParams = new URLSearchParams({ type: 'outstanding_verify' })
    const res = await fetch(`${this.baseUrl}/attestation?` + urlParams)

    if (!res.ok) {
      throw new Error(`Error when sending request to IPv8: ${await res.text()}`)
    }

    const json: string[][] = await res.json()
    return json.map(r => ({
      peerMid: r[0],
      name: r[1]
    }))
  }

  /**
   * Get the results of requested verifications
   */
  async getVerificationOutput (): Promise<Verification[]> {
    const urlParams = new URLSearchParams({ type: 'verification_output' })
    const res = await fetch(`${this.baseUrl}/attestation?` + urlParams)

    if (!res.ok) {
      throw new Error(`Error when sending request to IPv8: ${await res.text()}`)
    }

    const json: IPv8.VerificationOutput = await res.json()
    const hashes = Object.keys(json)

    return hashes.reduce((reduction, hash) => {
      const verifications = json[hash].map(verification => ({
        attributeHash: hash,
        attributeValue: verification[0],
        match: verification[1]
      }))

      return reduction.concat(verifications)
    }, [])
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
      metadata: Base64Utils.toBase64(stringify(metadata)),
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
      throw new Error(`Error when sending request to IPv8: ${await res.text()}`)
    }

    return res.json()
  }
}
