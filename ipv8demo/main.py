from base64 import b64encode
import json
from urllib import quote

from twisted.internet import reactor
from twisted.internet.defer import inlineCallbacks, returnValue
from twisted.internet.task import deferLater

from roles import initialize_peer, make_request, sleep, stop_peers


print "Initializing peers"
idowner, idowner_restapi = initialize_peer("idowner")
attester, attester_restapi  = initialize_peer("attester")
verifier, verifier_restapi  = initialize_peer("verifier")


@inlineCallbacks
def wait_for_peers(idowner_restapi):
    # Wait a second, if we fail to find peers: repeat, otherwise: return the result
    peers = yield make_request(idowner_restapi, 'GET', {
        'type': 'peers'
    })
    if peers != "[]":
        returnValue(peers)
    else:
        print "No peers have connected yet, waiting for 4 seconds!"
        peers = yield deferLater(reactor, 4.0, wait_for_peers, idowner_restapi)
        returnValue(peers)


@inlineCallbacks
def wait_for_attestation_request(attester_restapi):
    # Wait a second, if we fail to find pending requests: repeat, otherwise: return the result
    requests = yield make_request(attester_restapi, 'GET', {
        'type': 'outstanding'
    })
    if requests != "[]":
        returnValue(requests)
    else:
        print "No attestation requests have been received yet, waiting for 4 seconds!"
        requests = yield deferLater(reactor, 4.0, wait_for_attestation_request, attester_restapi)
        returnValue(requests)


@inlineCallbacks
def make_attribute():
    global attester, attester_restapi, idowner, idowner_restapi, verifier, verifier_restapi
    try:
        idowner_id = quote(b64encode(idowner.keys["anonymous id"].mid))
        attest_id = quote(b64encode(attester.keys["anonymous id"].mid))
        verifier_id = quote(b64encode(verifier.keys["anonymous id"].mid))

        print "REST api available at localhost:8086 for mid: ", idowner_id
        print "REST api available at localhost:8087 for mid: ", attest_id
        print "REST api available at localhost:8088 for mid: ", verifier_id		

        # value = yield wait_for_peers(idowner_restapi)
        # print "Known peers for id owner:", value
        # print "Requesting attestation for QR from", b64encode(attester.keys["anonymous id"].mid),\
            # "(generates one-time EC key)"
        # yield make_request(idowner_restapi, 'POST', {
             # 'type': 'request',
             # 'mid': attest_id,
             # 'attribute_name': 'QR'
        # })
        # value = yield wait_for_attestation_request(attester_restapi)
        # print "Pending attestation request for attester:", value
        # print "Attesting QR for", b64encode(idowner.keys["anonymous id"].mid)
        # yield make_request(attester_restapi, 'POST', {
            # 'type': 'attest',
            # 'mid': idowner_id,
            # 'attribute_name': 'QR',
            # 'attribute_value': quote(b64encode('binarydata'))
        # })
        # value = yield make_request(idowner_restapi, 'GET', {
            # 'type': 'attributes',
            # 'mid': attest_id
        # })
        # print "ID Owner attributes:", value
        # yield make_request(verifier_restapi, 'POST', {
            # 'type': 'verify',
            # 'mid': idowner_id,
            # 'attribute_hash': quote(json.loads(value)[0][1]),
            # 'attribute_values': quote(b64encode('binarydata'))
        # })
        # yield sleep(2)
        # i = 0
        # while i < 20:
            # value = yield make_request(verifier_restapi, 'GET', {
                # 'type': 'verification_output'
            # })
            # print "Verification output:", value
            # yield sleep(0.2)
            # i += 1
        # #yield stop_peers(attester, idowner)
    except:
        import traceback
        traceback.print_exc()


deferLater(reactor, 0.5, make_attribute)
reactor.run()
