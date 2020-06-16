import 'isomorphic-fetch'
import * as IPv8 from '../types/ipv8'
import { Base64Utils } from '../utils/base64'
import { Verification } from '../types/ipv8-connector'
import stringify from 'json-stable-stringify'
import { of, empty, iif, throwError, concat, pipe } from 'rxjs'
import { mergeMap, map, switchMap, retryWhen, delay, take, tap } from 'rxjs/operators'

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
    const urlParams = 'type=peers'
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
    const urlParams = 'type=outstanding'
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
   * Find a outstanding attestation request by attribute name.
   *
   * If no outstanding verification request are found, the client will retry at a maximum of 5 times.
   * This allows the connector to handle rapid claim and attest workflows and gives IPv8 the time
   * to sync a new attestation request across it's peers.
   *
   * @param attributeName Attribute name to find a outstanding request for
   * @returns Outstanding verification request, null of no request could be found
   */
  async findOutstanding (attributeName: string): Promise<IPv8.OutstandingRequest> {
    return of(attributeName).pipe(
      mergeMap(() => this.getOutstanding()),
      map(outstanding => outstanding.find(o => o.attributeName === attributeName)),
      // If the outstanding request is found pas it further, otherwise throw an "try again" error
      switchMap(claim => iif(() => claim === undefined, throwError('try again'), of(claim))),
      // When the "try again" error is thrown, retry after 200ms until the maximum (take) is reached
      retryWhen(errors => concat(
        errors.pipe(
          delay(200),
          take(5)
        ),
        of(null)
      ))
    ).toPromise()
  }

  /**
   * Get all attested attributes of this peer
   *
   * @param {string} mid Base64 encoded peer reference
   * @return All attributes of the current peer.
   */
  async getAttributes (mid: string = null): Promise<IPv8.Attribute[]> {
    let urlParams = 'type=attributes'

    if (mid) {
      urlParams += `&mid=${encodeURIComponent(mid)}`
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
    const urlParams = `type=verify&mid=${encodeURIComponent(peer)}` +
                      `&attribute_hash=${encodeURIComponent(attributeHash)}` +
                      `&attribute_values=${encodeURIComponent(Base64Utils.toBase64(attributeValue))}`
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
    const urlParams = `type=allow_verify&mid=${encodeURIComponent(peer)}&attribute_name=${encodeURIComponent(attributeName)}`
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
    const urlParams = 'type=outstanding_verify'
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
    const urlParams = 'type=verification_output'
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
    const urlParams = `type=request&mid=${encodeURIComponent(peerToAttest)}` +
                      `&metadata=${encodeURIComponent(Base64Utils.toBase64(stringify(metadata)))}` +
                      `&attribute_name=${encodeURIComponent(attributeName)}`
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
    const urlParams = `type=attest&mid=${encodeURIComponent(attributeOwner)}` +
                      `&attribute_name=${encodeURIComponent(attributeName)}` +
                      `&attribute_value=${encodeURIComponent(Base64Utils.toBase64(attributeValue))}`
    const res = await fetch(`${this.baseUrl}/attestation?` + urlParams, { method: 'POST' })

    if (!res.ok) {
      throw new Error(`Error when sending request to IPv8: ${await res.text()}`)
    }

    return res.json()
  }
}
