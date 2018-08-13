import os
import sys
from twisted.internet.defer import inlineCallbacks
from twisted.internet.task import deferLater
from twisted.internet import reactor
from twisted.web import server
from twisted.web.client import Agent, readBody
from twisted.web.http_headers import Headers

from pyipv8.ipv8.REST.rest_manager import RESTManager, RESTRequest
from pyipv8.ipv8.REST.root_endpoint import RootEndpoint
from pyipv8.ipv8_service import IPv8
from pyipv8.ipv8.configuration import get_default_configuration


agent = Agent(reactor)


class TestRESTAPI(RESTManager):

    port = 8085

    def start(self):
        self.root_endpoint = RootEndpoint(self.session)
        site = server.Site(resource=self.root_endpoint)
        site.requestFactory = RESTRequest
        TestRESTAPI.port += 1
        self.site = reactor.listenTCP(TestRESTAPI.port, site, interface="127.0.0.1")


@inlineCallbacks
def sleep(time):
    try:
        yield deferLater(reactor, time, lambda: None)
    except:
        import traceback
        print traceback.print_exc()


def create_working_dir(path):
    if os.path.isdir(path):
        import shutil
        shutil.rmtree(path)
    os.mkdir(path)


def initialize_peer(path):
    configuration = get_default_configuration()
    configuration['logger'] = {'level': "ERROR"}
    configuration['walker_interval'] = 4
    overlays = ['AttestationCommunity', 'IdentityCommunity']
    configuration['overlays'] = [o for o in configuration['overlays'] if o['class'] in overlays]
    for o in configuration['overlays']:
        o['walkers'] = [{
                    'strategy': "RandomWalk",
                    'peers': 4,
                    'init': {
                        'timeout': 60.0
                    }
                }]
    create_working_dir(path)
    os.chdir(path)
    ipv8 = IPv8(configuration)
    os.chdir(os.path.dirname(__file__))
    rest_manager = TestRESTAPI(ipv8)
    rest_manager.start()
    return ipv8, "http://localhost:%d/attestation" % rest_manager.port


@inlineCallbacks
def stop_peers(*peers):
    for p in peers:
        p.endpoint.close()
        yield p.stop(stop_reactor=(p==peers[-1]))


def make_request(url, type, arguments={}):
    global agent
    request_url = url + '?' + '&'.join("%s=%s" % (k,v) for k,v in arguments.iteritems())
    print "\t[HTTP-%s] %s" % (type, request_url)
    d = agent.request(
            type,
            request_url,
            Headers({'User-Agent': ['Twisted Web Client Example'],
                     'Content-Type': ['text/x-greeting']}),
            None)
    return d.addCallback(lambda response: readBody(response))
