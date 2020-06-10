# discipl-core-ipv8
Discipl Core Connector for [IPv8](https://github.com/Tribler/py-ipv8) network overlays

## Attestations through IPv8
For an example in how attestation works for IPv8 see `docs/example-attestation-flow.md`.

## Usage of DID and link
The following implementations of a DID and link are used in the connector:

```
ssid:discipl:ipv8:public_key
link:discipl:ipv8:temp:attribute_name
link:discipl:ipv8:perm:trustchain-block-hash
```

### DID
A Did for the IPv8 connector is a normal DID with a base64 encoded public key as reference. To reduce the length of the DID the encoded public key is in binary representation. So decoding the base64 reference of a DID will result in bytes.

IPv8 uses two representations of this public key, the hexadecimal format and a _mid_. The mid is a base64 encoded sha1 hash of the public key (`base64(sha1(binary_public_key))`). When giving a public key to the `extractPeerFromDid` both representation will be created.

### Temporary and permanent links
When a new attestation is made a temporary link, indicated with `temp`, will be received. This temporary link has the attribute name in base64 encoding as reference. This makes it possible to use a JSON object as the attribute name. The reason for the existence of this temporary link is a limitation by IPv8. An attribute does not really exist in the trustchain until it is attested by another peer. Once the attribute is attested a permanent link, indicated with `perm`, will be received. This link has the hash of the trustchain block that attested the claim as reference.

## Race conditions
The IPv8 connector is built upon the REST interface of IPv8 peers. Since IPv8 itself is also a network-based application, race conditions may happen. A typical example is a situation where the creation of a claim is immediately followed by a attest of this claim. In this situation, the new claim might be not synced across the entire IPv8 network yet. The peer that needs to attest this claim won't be able to find it.

Prevention of this situation can be fairly difficult since it depends on the IPv8 peer the connector is talking to. A basic rule that can be applied is to make sure that all peers are connected to the network. It is also recommended to implement code that will catch potential errors and handles them in a way that fits your needs.

## Tests
Unit- and integration tests can be ran by execution `npm run test`. Docker is needed to run these tests. A container with an ipv8 server will be automatically started using the `Dockerfile` provided at [./test/integration/ipv8](./test/integration/ipv8). The unit- and integration tests can also be run seperately with the commands `npm run test:unit` and `npm run test:integration`.
```
