# Copyright 2022 Agile Data, Inc <code@mftlabs.io>


from amps import Action
import json
from requests.auth import HTTPBasicAuth
import requests
import traceback
import os


class sfg_user_onboarding(Action):
    SFG_USER_PATH = '/B2BAPIs/svc/tradingpartners/'

    def action(self):
        action, user, apidata = self.get_properties()
        self.logger.debug(f'starting user onboarding: {user}')
        self.logger.info(f'Onboarding user: {user}')
        if action == 'status':
            status = self.verify(os.path.join(self.sfg_uri, user), apidata)
            return Action.send_data("completed", status)
        elif action == 'create':
            self.do_post_sfg(self.sfg_uri, apidata)
        elif action == 'approve_user' or action == "reset_password":
            self.do_put_sfg(os.path.join(self.sfg_uri, user), apidata)
        elif action == 'delete':
            self.do_delete_sfg(os.path.join(self.sfg_uri, user))
        else:
            raise Exception(f'invalid action specified: {action}')
        return Action.send_status("completed")

    def get_properties(self):
        data = self.msg["data"]
        props = self.provider
        self.sfg_uri = os.path.join(props['api_uri'], self.SFG_USER_PATH)
        self.auth = HTTPBasicAuth(
            props['api_username'], props['api_password'])
        jdata = json.loads(data)
        action = self.msg["action"]
        user = jdata['username']
        if action == "reset_password":
            data = {key: jdata[key] for key in jdata.keys()
                    & {'username', 'password', 'firstname' 'lastname', 'email', 'phone'}}
        else:
            data = {key: jdata[key] for key in jdata.keys()
                    & {'username', 'firstname' 'lastname', 'email', 'phone'}}
        data = json.dumps(jdata)
        return action, user, data

    def do_post_sfg(self, url, payload):
        self.logger.debug('performing add user')
        headers = {'Content-Type': 'application/json'}
        response = requests.post(
            url, auth=self.auth, headers=headers, data=payload, verify=False)
        self.logger.debug(response.text)
        if response.status_code != 201:
            if 'already exists' not in response.text:
                raise Exception('sfg post request failed - url [%s], status [%s], response [%s]' % (
                    url, response.status_code, response.text))

    def do_delete_sfg(self, url):
        self.logger.debug('performing delete user')
        headers = {'Content-Type': 'application/json'}
        response = requests.delete(
            url, auth=self.auth, headers=headers, verify=False)
        self.logger.debug(response.text)
        if response.status_code != 200 and response.status_code != 404:
            raise Exception(
                'sfg delete request failed - url [%s], status [%s]' % (url, response.status_code))

    def verify(self, url, payload):
        self.logger.debug('Verifying user')
        headers = {'Content-Type': 'application/json'}
        try:
            response = requests.get(url, auth=self.auth,
                                    headers=headers, data=payload, verify=False)
            self.logger.debug(response.text)
            if response.status_code == 200:
                return True
            else:
                return False
        except Exception as e:
            return False

    def do_put_sfg(self, url, payload):
        self.logger.debug('performing update user')
        headers = {'Content-Type': 'application/json'}
        response = requests.put(url, auth=self.auth,
                                headers=headers, data=payload, verify=False)
        self.logger.debug(response.text)
        if response.status_code != 200:
            raise Exception(
                'sfg put request failed - url [%s], status [%s]' % (url, response.status_code))
