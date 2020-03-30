import * as IPv8 from '../types/ipv8'
import 'isomorphic-fetch'

export class Ipv8TrustchainClient {
  private baseUrl: string

  /**
   * Create a new IPv8 Trustchain client instance
   *
   * @param {string} apiUrl Base url of the Ipv8 rest api including the port
   */
  constructor (apiUrl: string) {
    this.baseUrl = apiUrl
  }

  async getBlocksForUser (publicKey: string): Promise<IPv8.TrustchainBlock[]> {
    const res = await fetch(`${this.baseUrl}/trustchain/users/${publicKey}/blocks`)

    if (res.status < 200) {
      throw new Error(`Error when sending request to IPv8: ${res.body}`)
    }

    return res.json()
  }
}
