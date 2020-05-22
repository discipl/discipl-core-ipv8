import forge from 'node-forge'

export class Ipv8Utils {
  /**
   * Convert a given public key into a mid.
   *
   * @param publicKey Key to convert
   * @param encoding Encoding of the given public key
   */
  static publicKeyToMid (publicKey: string, encoding: 'base64' | 'hex' | 'bytes'): string {
    if (encoding === 'base64') {
      publicKey = forge.util.decode64(publicKey)
    } else if (encoding === 'hex') {
      publicKey = forge.util.hexToBytes(publicKey)
    }

    const md = forge.md.sha1.create()
    md.update(publicKey)

    return forge.util.encode64(md.digest().bytes())
  }

  /**
   * Convert a given public key into a did
   *
   * @param publicKey Key to convert
   * @param encoding Encoding of the given public key
   */
  static publicKeyToDid (publicKey: string, encoding: 'base64' | 'hex' | 'bytes'): string {
    if (encoding === 'hex') {
      publicKey = forge.util.encode64(forge.util.hexToBytes(publicKey))
    } else if (encoding === 'bytes') {
      publicKey = forge.util.encode64(publicKey)
    }

    return 'did:discipl:ipv8:' + publicKey
  }
}
