# discipl-core-ipv8

Discipl Core Connector for IPV8 network overlays
Implementation utilizing REST interface provided by local ipv8 service

At this moment the only overlay that can be used through a REST interface implemented within the ipv8 project itself
is the Attestation Community. While the first milestone for this connector is to utilize only this interface for now,
the aim is to also support trustchain itself as it seems more in line with self sovereign identities having their
channels (in trustchain: everyone has their own chain).

# Attestations through IPV8

Note this connector is being implemented and probably broke, the information below out of date or incorrect. Work in progress.

Have a look at ipv8demo/demo.html to get a sense of how the ipv8 attestation rest service works and get up and running.
An npm install should already have set up a ipv8 test service and it's required dependencies

discipl core baseconnector methods are mapped to the following ipv8 attestation REST interface actions as follows:

getName() => returns 'ipv8'
newSsid() => returns an empty ssid. you automaticly connect to a localhost ipv8 service at port 8086 and thereby identify yourself as you should be the only one that can access it.
             You can change this default using the extra configure() method however
claim()   => if you claim a attest request ({'request-attest':attribute-name}) a request for the attestation of the given atribute is requested.
             otherwise you will attest {'predicate':value} where the predicate is assumed to be the attribute name and the value the attribute value. The ssid pubkey is expected to
             contain the mid of the attester or the attribute owner of who to attest the attribute for respectively. In both cases a referente indicating a attribute name and mid is returned
             separated by a hash (QR#usdjUD3jjdssaaa%3=). When an attest is requested the mid would be the attribute owner, in case of an attest, the mid of the attester.
get()     => given a reference from the claim() method, it will either return attribute info including attestation proof or the mid of the attribute owner requesting attestation
            (if a corresponding attribute or outstanding request was found, otherwise null)
verify()  => will verify a zero knowledge proof (an attribute "hash") against a attribute value and attribute owners mid. (it will wait for the verify result). It will return the attester mid (which should be possible because otherwise
            there's no way to assert the attester that generated the proof is actually trusted by you as verifier)

note because of you could see that a temporarily presented anonymous wallet is what is being used as platform to store and retrieve single claims from and there's no way to iterate claims in it:
- getLatestClaim : returns null, do not use
- getSsidOfClaim : returns null, do not use
- subscribe      : returns null, do not use

Note that revocation functionality of discipl core on claims stored through this connector will not work.

# Status:

tests need to be added yet

# Requirements for testing:

you need to build and install the ipv8 android app or local ipv8 service and doing so create / set your identity with it.
Doing a `npm test` will run services for id owner, attester and verifier
