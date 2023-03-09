from amps import Action
from xml.dom.minidom import parseString
import traceback
import requests
import base64
import json
from requests.auth import HTTPBasicAuth


class config_info:
    sspcm_user = ''
    sspcm_pasw = ''
    sfg_user = ''
    sfg_pasw = ''
    sspcm_uri = ''
    sfg_uri = ''
    token = ''
    truststore = ''
    keystore = ''
    keycert = ''
    policy = ''
    netmap = ''
    int_forward_proxy = ''
    int_reverse_proxy = ''
    ext_forward_proxy = ''
    ext_reverse_proxy = ''
    ssp_engine_host = ''
    ssp_engine_port = ''


class cd_info:
    user_type = ''
    host = ''
    port = ''
    use_spoe = False
    use_secure_plus = False
    certdata = ''
    certname = ''
    nodename = ''
    commonname = ''
    tls_version = ''
    alternatehosts = ''
    ciphers = ''


class cd_onboarding_sscpm(Action):
    # constants
    INTERNAL_USER = 'Internal'
    SSPCM_SESSION_PATH = '/sspcmrest/sspcm/rest/session'
    SSPCM_CERT_PATH = '/sspcmrest/sspcm/rest/keyStore/createKeyDefEntries/'
    SSPCM_CERT_DEL_PATH = '/sspcmrest/sspcm/rest/keyStore/deleteKeyDefEntries/'
    SSPCM_NETMAP_PATH = '/sspcmrest/sspcm/rest/netmap/addNetmapNodes/'
    SSPCM_NETMAP_DEL_PATH = '/sspcmrest/sspcm/rest/netmap/deleteNetmapNodes/'
    SFG_NODE_PATH = '/B2BAPIs/svc/sterlingconnectdirectnodes/'
    SFG_XREF_PATH = '/B2BAPIs/svc/sterlingconnectdirectnetmapxrefs/'

    def run(self):
        try:
            self.set_logger(__name__)
            data = self.read_input_data_string()
            jval = json.loads(data)
            self.user_type = jval['user_type']
            self.get_cd_info(jval)
            self.get_config_info()
            action = jval['action_type']
            if action == 'add':
                self.process_add()
            elif action == 'update':
                self.process_update()
            elif action == 'delete':
                self.process_delete()
            else:
                raise Exception("invalid action specified: " + action)
            self.set_status("ok")
        except amf_util.CertificateException:
            self.set_status('Failed', 'Invalid certificate provided')
        except:
            self.set_status("Failed", traceback.format_exc())

    def process_add(self):
        self.log_debug('adding CD profile: ' + self.cd.nodename)
        self.do_get_sspcm_token()
        if self.cd.use_secure_plus:
            self.log_event('Info', 'Adding public key to SSPCM truststore')
            self.create_cert()
        self.log_event('Info', 'Creating netmap entries')
        self.create_netmap()
        self.do_delete_sspcm_token()
        self.log_event('Info', 'Creating CD node in SFG')
        self.create_node()
        self.log_event('Info', 'Adding CD node to SFG xref')
        self.create_xref()

    def process_update(self):
        raise Exception('CD profile update is not currently supported')

    def process_delete(self):
        self.log_debug('deleting CD profile: ' + self.cd.nodename)
        self.do_get_sspcm_token()
        self.log_event('Info', 'Deleting netmap entries')
        self.delete_netmap()
        if self.cd.use_secure_plus:
            self.log_event('Info', 'Deleting cert from SSPCM truststore')
            self.delete_cert()
        self.log_event('Info', 'Deleting CD node from SFG xref')
        self.delete_xref()
        self.log_event('Info', 'Deleting CD node from SFG')
        self.delete_node()

    def create_netmap(self):
        self.log_debug('adding CD netmap to sspcm: ' + self.cd.nodename)
        proxy_list = []
        if self.cd.user_type == self.INTERNAL_USER:
            proxy_list = [self.config.int_forward_proxy,
                          self.config.int_reverse_proxy]
        else:
            proxy_list = [self.config.ext_forward_proxy,
                          self.config.ext_reverse_proxy]
        payload = self.format_netmap_info()
        for proxy in proxy_list:
            url = self.config.sspcm_uri + self.SSPCM_NETMAP_PATH + proxy
            self.log_debug(
                f'adding CD netmap with sspcm proxy: {proxy} url: {url}')
            self.do_post_sspcm(url, payload)

    def create_node(self):
        self.log_debug('adding node to sfg: ' + self.cd.nodename)
        url = self.config.sfg_uri + self.SFG_NODE_PATH
        payload = self.format_sfg_node_info()
        self.do_post_sfg(url, payload)

    def create_xref(self):
        self.log_debug('adding xref to sfg: ' + self.cd.nodename)
        url = self.config.sfg_uri + self.SFG_XREF_PATH
        payload = self.format_sfg_xref_info()
        self.do_post_sfg(url, payload)

    def create_cert(self):
        self.log_debug('adding cert to sspcm: ' + self.cd.certname)
        url = self.config.sspcm_uri + self.SSPCM_CERT_PATH + self.config.truststore
        payload = self.format_cert_info()
        self.log_debug('payload for sspcm:'+payload)
        self.do_post_sspcm(url, payload)

    def delete_xref(self):
        self.log_debug('deleting sfg xref: ' + self.cd.nodename)
        #url = self.config.sfg_uri + self.SFG_XREF_PATH + self.config.netmap+'?locale=en_US&_accept=application%2Fjson&_contentType=application%2Fjson'
        url = self.config.sfg_uri + self.SFG_XREF_PATH + self.config.netmap
        self.log_debug('url: ' + url)
        data = self.do_get_sfg(url)
        self.log_debug(data)
        jval = json.loads(data)
        found = False
        try:
            for i in range(len(jval['nodes'])):
                self.log_debug(
                    'testing item: [' + jval['nodes'][i]['nodeName']+']')
                if jval['nodes'][i]['nodeName'] == self.cd.nodename:
                    self.log_debug('found item: ' +
                                   jval['nodes'][i]['nodeName'])
                    del jval['nodes'][i]
                    found = True
                    break
        except:
            self.log_warn(traceback.format_exc())
            self.log_warn('node [%s] not found in xref [%s]' %
                          (self.cd.nodename, self.config.netmap))
        if found:
            self.log_debug(json.dumps(jval))
            self.do_put_sfg(url, json.dumps(jval))

    def delete_node(self):
        self.log_debug('deleting ssfg node: ' + self.cd.nodename)
        url = self.config.sfg_uri + self.SFG_NODE_PATH + self.cd.nodename
        self.do_delete_sfg(url)

    def delete_netmap(self):
        self.log_debug('deleting sspcm netmap: ' + self.cd.nodename)
        proxy_list = []
        if self.cd.user_type == self.INTERNAL_USER:
            proxy_list = [self.config.int_forward_proxy,
                          self.config.int_reverse_proxy]
        else:
            proxy_list = [self.config.ext_forward_proxy,
                          self.config.ext_reverse_proxy]
        for proxy in proxy_list:
            url = self.config.sspcm_uri + self.SSPCM_NETMAP_DEL_PATH + \
                proxy + "/" + self.cd.nodename
            self.log_debug(
                f'deleting CD netmap with sspcm proxy: {proxy} url: {url}')
            self.do_delete_sspcm(url)

    def delete_cert(self):
        self.log_debug('deleting sspcm cert: ' + self.cd.certname)
        url = self.config.sspcm_uri + self.SSPCM_CERT_DEL_PATH + \
            self.config.truststore+"/"+self.cd.certname
        self.do_delete_sspcm(url)

    def get_cd_info(self, jval):
        cd = cd_info()
        self.cd = cd
        cd.nodename = jval['node_name']
        cd.commonname = jval['common_name']
        if 'tls_version' in jval:
            cd.tls_version = jval['tls_version']
        if cd.tls_version == '':
            cd.tls_version = 'TLSv1.2'
        if 'cipherSuiteName' in jval:
            cd.ciphers = jval['cipherSuiteName']
        cd.certdata = jval.get('certificate')
        if cd.certdata:
            cd.certdata = base64.decodebytes(
                cd.certdata.encode()).decode('UTF-8')
        self.log_debug(cd.certdata)
        cd.certname = 'PUBLIC_' + cd.nodename
        cd.user_type = jval['user_type']
        cd.host = jval['host']
        cd.port = jval['port']
        cd.use_spoe = jval['spoe'].lower() == 'true'
        cd.use_secure_plus = jval['secure_plus'].lower() == 'true'
        if 'alternatehosts' in jval:
            alternatehosts = jval['alternatehosts']
            if len(alternatehosts) > 0:
                stobj = ''
                arr = alternatehosts.split(',')
                for item in arr:
                    obj_arr = []
                    if item.find(':') != -1:
                        obj_arr = item.split(':')
                    elif item.find(';') != -1:
                        obj_arr = item.split(';')
                    if len(obj_arr) > 0:
                        stobj += '<address><host>' + \
                            obj_arr[0]+'</host><port>' + \
                            obj_arr[1]+'</port></address>'
                cd.alternatehosts = stobj
            else:
                cd.alternatehosts = ''
        else:
            cd.alternatehosts = ''

    def get_config_info(self):
        pmap = amf_util.get_amf_properties()
        cf = config_info()
        self.config = cf
        cf.sfg_user = pmap['SFG_API_USERNAME']
        cf.sfg_pasw = pmap['SFG_API_PASSWORD']
        cf.sspcm_user = pmap['SSPCM_API_USERNAME']
        cf.sspcm_pasw = pmap['SSPCM_API_PASSWORD']
        cf.policy = pmap['CD_POLICY']
        cf.keycert = pmap['CD_KEYCERT']
        cf.keystore = pmap['CD_KEYSTORE']
        cf.truststore = pmap['CD_TRUSTSTORE']
        cf.sspcm_uri = pmap['SSPCM_API_URI']
        cf.sfg_uri = pmap['SFG_API_URI']
        cf.netmap = pmap['SFG_API_NETMAP']
        cf.ext_forward_proxy = pmap['CD_EXT_FPXY']
        cf.int_forward_proxy = pmap['CD_INT_FPXY']
        cf.ext_reverse_proxy = pmap['CD_EXT_RPXY']
        cf.int_reverse_proxy = pmap['CD_INT_RPXY']
        if self.user_type == 'External':
            cf.ssp_engine_host = pmap['CD_SSP_ENGINE_HOST_EXT']
            cf.ssp_engine_port = pmap['CD_SSP_ENGINE_PORT_EXT']
        else:
            cf.ssp_engine_host = pmap['CD_SSP_ENGINE_HOST_INT']
            cf.ssp_engine_port = pmap['CD_SSP_ENGINE_PORT_INT']

    def do_get_sspcm_token(self):
        self.log_debug('requesting sspcm token')
        url = self.config.sspcm_uri + self.SSPCM_SESSION_PATH
        payload = {"userId": self.config.sspcm_user,
                   "password": self.config.sspcm_pasw}
        headers = {'Content-Type': 'application/json'}
        data = json.dumps(payload)
        response = requests.post(url, headers=headers, data=data, verify=False)
        if response.status_code != 200:
            raise Exception('sspcm post request failed - url [%s], status [%s], reason[%s]' % (
                url, response.status_code, response.text))
        self.log_debug(response.text)
        dom3 = parseString(response.text)
        data = dom3.getElementsByTagName("objectsList")[0].firstChild.data
        jdata = json.loads(data)
        self.token = jdata['sessionToken']

    def do_post_sspcm(self, url, payload):
        headers = {'Content-Type': 'application/xml',
                   'X-Authentication': self.token}
        self.log_debug(payload)
        response = requests.post(url, headers=headers,
                                 data=payload, verify=False)
        self.log_debug(response.text)
        if response.status_code != 200 or '<messageLevel>ERROR<' in response.text:
            if 'Invalid trusted' in response.text:
                raise amf_util.CertificateException
            if 'already exists' not in response.text:
                raise Exception('sspcm post request failed - url [%s], status [%s], reason [%s]' % (
                    url, response.status_code, response.text))

    def do_delete_sspcm(self, url):
        headers = {'Content-Type': 'application/json',
                   'X-Authentication': self.token}
        response = requests.delete(url, headers=headers, verify=False)
        self.log_debug(response.text)
        if response.status_code != 200:
            dom3 = parseString(response.text)
            message = dom3.getElementsByTagName("message")[0].firstChild.data
            self.log_debug(
                'Status code returned in sspcm delete request %s' % message)
            if ('Netmap node' in message) and ('not found' in message):
                pass
            else:
                raise Exception(
                    'sspcm delete request failed - url [%s], status [%s]' % (url, response.status_code))

    def do_get_sfg(self, url):
        headers = {'Content-Type': 'application/json',
                   'Accept': 'application/json'}
        auth = HTTPBasicAuth(self.config.sfg_user, self.config.sfg_pasw)
        response = requests.get(url, auth=auth, headers=headers, verify=False)
        if response.status_code != 200:
            raise Exception(
                'sfg get request failed - url [%s], status [%s]' % (url, response.status_code))
        return response.text

    def do_delete_sfg(self, url):
        headers = {'Content-Type': 'application/json'}
        auth = HTTPBasicAuth(self.config.sfg_user, self.config.sfg_pasw)
        response = requests.delete(
            url, auth=auth, headers=headers, verify=False)
        self.log_debug(response.text)
        if response.status_code != 200 and response.status_code != 404:
            raise Exception(
                'sfg delete request failed - url [%s], status [%s]' % (url, response.status_code))

    def do_put_sfg(self, url, payload):
        headers = {'Accept': 'application/json',
                   'Content-Type': 'application/json'}
        auth = HTTPBasicAuth(self.config.sfg_user, self.config.sfg_pasw)
        response = requests.put(
            url, auth=auth, headers=headers, data=payload, verify=False)
        self.log_debug(response.text)
        if response.status_code != 200:
            self.log_event('debug', response.text)
            jval = json.loads(response.text)
            # if jval['errorDescription'] != None:
            raise Exception(
                'sfg put request failed - url [%s], status [%s]' % (url, response.status_code))

    def do_post_sfg(self, url, payload):
        headers = {'Content-Type': 'application/xml'}
        self.log_debug('sending: ' + payload)
        auth = HTTPBasicAuth(self.config.sfg_user, self.config.sfg_pasw)
        response = requests.post(
            url, auth=auth, headers=headers, data=payload, verify=False)
        self.log_debug(response.text)
        if response.status_code != 201:
            if 'already exists' not in response.text:
                self.log_event('debug', response.text)
                raise Exception(
                    'sfg post request failed - url [%s], status [%s]' % (url, response.status_code))

    def format_cert_info(self):
        return f'''<?xml version="1.0" encoding="UTF-8"?><elements> 
            <keyDef>
            <description>Trusted certificate of {self.cd.nodename}</description>
            <enabled>true</enabled> 
            <keyData>
            <![CDATA[{self.cd.certdata}]]> 
            </keyData>
            <keyType>x509Cert</keyType>
            <name>{self.cd.certname}</name>  
            </keyDef>
            </elements>'''

    def format_ssl_info(self):
        return f'''<sslInfo> 
            <cipherSuites> 
            <cipherSuite>{self.cd.ciphers}</cipherSuite> 
            </cipherSuites> 
            <clientAuthenticationCD>true</clientAuthenticationCD> 
            <keyCertName>{self.config.keycert}</keyCertName> 
            <keyStoreName>{self.config.keystore}</keyStoreName> 
            <protocol>{self.cd.tls_version}</protocol> 
            <trustStoreName>{self.config.truststore}</trustStoreName> 
            <trustedCertNames> 
            <trustedCertName>{self.cd.certname}</trustedCertName> 
            </trustedCertNames> 
            <verifyCommonName>true</verifyCommonName> 
            <certificateCommonName>{self.cd.commonname}</certificateCommonName>
            </sslInfo>'''

    def format_netmap_info(self):
        plus_option = 'Without'
        ssl_info = ''
        plus_flag = 'false'
        if self.cd.use_secure_plus:
            plus_option = 'With'
            ssl_info = self.format_ssl_info()
            plus_flag = 'true'
        return f'''<?xml version="1.0" encoding="UTF-8"?>
            <inboundNodes>
            <inboundNodeDef> 
            <addresses>
            <address> 
            <nodeName>{self.cd.nodename}</nodeName> 
            <host>{self.cd.host}</host> 
            <port>{self.cd.port}</port> 
            </address> 
            {self.cd.alternatehosts}
            </addresses> 
            <description><![CDATA[{self.cd.nodename} {plus_option} Secure Plus]]></description> 
            <forceToUnlock>false</forceToUnlock> 
            <logLevel>DEBUG</logLevel> 
            <name>{self.cd.nodename}</name> 
            <outboundACLNodes> 
            <outboundACLNode>{self.cd.nodename}</outboundACLNode> 
            </outboundACLNodes> 
            <peerAddressPattern>{self.cd.host}</peerAddressPattern> 
            <policyId>{self.config.policy}</policyId> 
            <port>{self.cd.port}</port> 
            <routingName>{self.cd.nodename}</routingName> 
            <secureConnection>{plus_flag}</secureConnection> 
            <serverAddress>{self.cd.host}</serverAddress> 
            {ssl_info}
            <tcpTimeout>90</tcpTimeout> 
            <verStamp>1</verStamp> 
            </inboundNodeDef>
            </inboundNodes>'''

    def format_sfg_node_info(self):
        return f'''<create securePlusOption="DISABLED" 
            serverHost="{self.config.ssp_engine_host}" 
            serverPort="{self.config.ssp_engine_port}" 
            serverNodeName="{self.cd.nodename}" />'''

    def format_sfg_xref_info(self):
        return f'''<create netMapName="{self.config.netmap}">
            <nodes>
            <SterlingConnectDirectNodeName nodeName="{self.cd.nodename}"/>
            </nodes>
            </create>'''

    def do_delete_sspcm_token(self):
        auth = HTTPBasicAuth(self.config.sspcm_user, self.config.sspcm_pasw)
        headers = {'Content-Type': 'application/xml',
                   'X-Authentication': self.token}
        url = self.config.sspcm_uri + self.SSPCM_SESSION_PATH
        response = requests.delete(
            url, auth=auth, headers=headers, verify=False)
        self.log_debug('Delete sspcm session token '+response.text)
        if response.status_code != 200:
            self.log_event(
                'Failed to delete sspcm session token', response.text)
            raise Exception(
                'SSPCM session token delete request failed - url [%s], status [%s]' % (url, response.status_code))
        else:
            self.log_event('Info', 'SSPCM session token deleted successfully')
