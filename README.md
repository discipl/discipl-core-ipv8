# discipl-core-ipv8

Discipl Core Connector for IPV8 network overlays
Implementation utilizing REST interface provided by local ipv8 service

At this moment the only overlay that can be used through a REST interface implemented within the ipv8 project itself
is the Attestation Community. While the first milestone for this connector is to utilize only this interface for now,
the aim is to also support trustchain itself as it seems more in line with self sovereign identities having their
channels (in trustchain: everyone has their own chain).

## Attestations through IPV8
For a example in how attestation works for IPv8 see `docs/example-attestation-flow.md`.

## Usage of DID and link
ssid:discipl:ipv8:{url: "", mid: ""}
link:discipl:ipv8:tmp:attribute_name
link:discipl:ipv8:perm:trust-chain-hash

{url:"",mid:""}