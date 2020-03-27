import forge from 'node-forge'

export class Base64Utils {
  /**
   * Create a Base64-encoded string from a given input. To allow unicode characters
   * the input will be converted into a binary string before encoding.
   *
   * @param input String input
   * @return Base64 encoded binary representation of the input
   */
  static toBase64 (input: string): string {
    return forge.util.encode64(forge.util.encodeUtf8(input))
  }

  /**
   * Decode a string of base64 encoded data
   *
   * @param base64 Base64 encoded string
   */
  static fromBase64 (base64: string): string {
    try {
      return forge.util.decodeUtf8(forge.util.decode64(base64))
    } catch (e) {
      throw new Error(`Error when decoding base64 string: ${e.message}`)
    }
  }
}
