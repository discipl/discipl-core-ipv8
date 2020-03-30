# discipl-core-ipv8
Discipl Core Connector for [IPv8](https://github.com/Tribler/py-ipv8) network overlays

## Attestations through IPv8
For a example in how attestation works for IPv8 see `docs/example-attestation-flow.md`.

## Usage of DID and link
The following implementations of a DID and link are used in the connector:

```
ssid:discipl:ipv8:{url: "", mid: ""} // base64 encoded
link:discipl:ipv8:temp:attribute_name // base64 encoded
link:discipl:ipv8:perm:trustchain-block-hash
```

### Temporary and permanent links
When a new attestation is made a temporary link, indicated with `temp`, will be received. This temporary link has the attribute name in base64 encoding as reference. This makes it possible to use a JSON object as the attribute name. The reason for the existence of this temporary link is a limitation by IPv8. An attribute does not really exist in the trustchain until it is attested by another peer. Once the attribute is attested a permanent link, indicated with `perm`, will be received. This link has the hash of the trust chain block that attested the claim as reference.

## Tests
Unit- and integration test can be ran by execution `npm run test`. For the integration tests Docker will be used to provide a running IPv8 instance. A `Dockerfile` is provided in `src/test/ipv8`.
```