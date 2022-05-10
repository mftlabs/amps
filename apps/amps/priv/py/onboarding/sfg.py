from amps import Action
import json
from requests.auth import HTTPBasicAuth
import requests
import traceback
import os


class onb_user_onboarding(Action):
    def action(self):
        action, user, apidata = self.get_properties()
        self.logger.debug(f'starting user onboarding: {user}')
        self.logger.info(f'Onboarding user: {user}')
        if action == 'add':
            self.do_post_sfg(self.sfg_uri, apidata)
        elif action == 'update' or action == "reset_password":
            self.do_put_sfg(self.sfg_uri + user, apidata)
        elif action == 'delete':
            self.do_delete_sfg(self.sfg_uri + user)
        else:
            raise Exception(f'invalid action specified: {action}')
        self.set_status('ok', '')
        return Action.send_status("completed")

    def get_properties(self):
        data = self.msg["data"]
        props = self.provider["values"]
        self.sfg_uri = props['SFG_API_URI'] + os.environ["SFG_USER_PATH"]
        self.auth = HTTPBasicAuth(
            props['SFG_API_USERNAME'], props['SFG_API_PASSWORD'])
        jdata = json.loads(data)
        if jdata["approved"]:
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
        else:
            raise Exception('User not approved')

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

    def do_put_sfg(self, url, payload):
        self.logger.debug('performing update user')
        headers = {'Content-Type': 'application/json'}
        response = requests.put(url, auth=self.auth,
                                headers=headers, data=payload, verify=False)
        self.logger.debug(response.text)
        if response.status_code != 200:
            raise Exception(
                'sfg put request failed - url [%s], status [%s]' % (url, response.status_code))
