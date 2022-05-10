from requests.auth import HTTPBasicAuth
from amps import Action
import json
import requests
import traceback
import subprocess
# import grpc
# import cipher_pb2
# import cipher_pb2_grpc
import boto3


class user_info:
    username = ''
    password = ''
    email = ''
    firstname = ''
    phone = ''
    lastname = ''


class aws_user_onboarding(Action):
    def action(self):
        try:
            self.get_properties()
            success = False
            if self.msg["action"] == 'create':
                success = self.aws_add_account()
            elif self.msg["action"] == 'reset_password' or self.msg["action"] == 'approve_user':
                self.aws_update_account()
            elif self.msg["action"] == 'delete':
                success = self.aws_delete_account()
            else:
                raise Exception(
                    f'invalid action specified: {self.msg["action"]}')
            if success:
                return Action.send_status("completed")
            else:
                return Action.send_status('failed', 'AWS Account Process Failed')
        except:
            return Action.send_status("failed", traceback.format_exc())

    def get_properties(self):
        jdata = json.loads(self.msg["data"])
        self.userInfo = {key: jdata[key] for key in jdata.keys()
                         & {'username', 'password', 'firstname' 'lastname', 'email', 'phone'}}
        props = self.parms["provider"]

    def aws_add_account(self):

        userInfo = self.userInfo
        aws_access_keyid = self.provider['access_key_id']
        aws_secret_key = self.provider['secret_key']
        # plain_secret_key = self.get_plain_text(aws_secret_key)
        # self.logger.info(aws_access_keyid)
        # self.logger.info(aws_secret_key)
        session = boto3.Session(
            aws_access_key_id=aws_access_keyid,
            aws_secret_access_key=aws_secret_key
        )
        iam = session.client('iam')
        try:
            response = iam.create_user(UserName=userInfo.username)
            self.logger.info(str(response))
            self.aws_add_login_profile()
        except:
            pass

        reqinfo = json.loads(userInfo.additionalinfo)
        allowed = self.is_valid_policy()

        if not allowed:
            self.logger.warn('Profile currently only supported for S3')
            return True
        try:
            response2 = iam.create_policy(PolicyName='user-policy-{}'.format(
                userInfo.username), PolicyDocument=userInfo.additionalinfo)
            self.logger.info(str(response2))
            # text = str(response2)
            # result = json.loads(text.replace("'",'"'))
            if 'Arn' in response2['Policy'].keys():
                policy_arn = response2['Policy']['Arn']
                response3 = iam.attach_user_policy(
                    UserName=userInfo.username,
                    PolicyArn=policy_arn
                )
                self.logger.info(str(response3))
            else:
                self.logger.warn('Policy creation failed')
                return False
        except:
            self.logger.error(traceback.format_exc())
        return True

    def aws_add_login_profile(self):
        iam = self.get_iam_ref()
        userInfo = self.userInfo
        response = iam.create_login_profile(
            UserName=userInfo.username,
            Password=userInfo.password,
            PasswordResetRequired=False
        )
        if response['ResponseMetadata']['HTTPStatusCode'] == 200:
            self.logger.info('Succesfully created login profile')
            return True
        self.logger.warn(
            'Failed to create login profile, {}'.format(str(response)))
        return False

    def aws_update_account(self):
        pass

    def aws_delete_account(self):
        userInfo = self.userInfo
        arn = self.get_arn(userInfo.username)
        self.logger.info('Policy ARN:{}'.format(arn))
        policy_exception = False
        try:
            result = self.detach_user_policy(userInfo.username, arn)
        except:
            policy_exception = True

        if policy_exception or result['ResponseMetadata']['HTTPStatusCode'] == 200:
            self.logger.info(
                'Policy detached from user : {}'.format(userInfo.username))
            iam = self.get_iam_ref()
            try:
                iam.delete_policy(PolicyArn=arn)
            except:
                self.logger.error(traceback.format_exc())
            self.logger.info('Policy deleted: {}'.format(
                'user-policy-{}'.format(userInfo.username)))

            delresp = None
            try:
                delresp = iam.delete_login_profile(UserName=userInfo.username)
            except:
                self.logger.error(traceback.format_exc())

            if delresp == None or delresp['ResponseMetadata']['HTTPStatusCode'] == 200:
                self.logger.info('Login profile deleted successfully for user {}'.format(
                    userInfo.username))

            resp2 = None
            try:
                resp2 = iam.delete_user(UserName=userInfo.username)
            except:
                self.logger.error(traceback.format_exc())

            self.logger.info('Result of delete user: {}'.format(str(resp2)))

            if resp2 == None or resp2['ResponseMetadata']['HTTPStatusCode'] == 200:
                self.logger.info(
                    'User {} deleted successfully'.format(userInfo.username))
                return True
        self.logger.warn('Failed to delete user {}'.format(userInfo.username))
        return False

    def get_iam_ref(self):
        userInfo = self.userInfo
        aws_access_keyid = self.provider['access_key_id']
        aws_secret_key = self.provider['secret_key']
        session = boto3.Session(
            aws_access_key_id=aws_access_keyid,
            aws_secret_access_key=aws_secret_key
        )
        iam = session.client('iam')
        return iam

    def get_iam_ref2(self):
        userInfo = self.userInfo
        aws_access_keyid = self.provider['access_key_id']
        aws_secret_key = self.provider['secret_key']
        session = boto3.Session(
            aws_access_key_id=aws_access_keyid,
            aws_secret_access_key=aws_secret_key,
        )
        iam = session.resource('iam')
        return iam

    def get_arn(self, username):
        userInfo = self.userInfo
        iam = self.get_iam_ref()

        paginator = iam.get_paginator('list_policies')

        for response in paginator.paginate(Scope="Local"):
            for policy in response["Policies"]:
                if policy['PolicyName'] == 'user-policy-{}'.format(userInfo.username):
                    return policy['Arn']
        return None

    def detach_user_policy(self, username, policy_arn):
        iam = self.get_iam_ref2()
        attached_policy = iam.Policy(policy_arn)
        response = attached_policy.detach_user(
            UserName=username
        )
        return response

    def is_valid_policy(self):
        userInfo = self.userInfo
        additionalinfo = userInfo.additionalinfo
        result = ''
        for x in additionalinfo:
            if x == ' ':
                continue
        result = result+x
        if 's3:*' in result and '"Resource":"*"' in result:
            return False
        pos = 0
        valid = True
        while pos != -1:
            pos = result.find('arn:aws:', pos+1)
            if pos != -1:
                pos2 = result.find('s3', pos)
                if pos2 == -1 or pos2-pos != 8:
                    valid = False
                break
        if not valid:
            return valid

        pos = 0
        valid = True
        while pos != -1:
            pos = result.find('"Action"', pos+1)
            if pos != -1:
                pos2 = result.find('"s3', pos)
                if pos2 == -1 or (pos2-pos != 9 and pos2-pos != 11):
                    valid = False
                    break
        return valid
