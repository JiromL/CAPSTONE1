"""S3 helpers for presigned uploads"""
import boto3
import os
from botocore.config import Config as BotoConfig


class S3Integration:
    def __init__(self, config):
        self.enabled = getattr(config, 'S3_ENABLED', False)
        if not self.enabled:
            return
        self.bucket = getattr(config, 'S3_BUCKET')
        region = getattr(config, 'S3_REGION', None)
        access = getattr(config, 'S3_ACCESS_KEY', None)
        secret = getattr(config, 'S3_SECRET_KEY', None)
        session_kwargs = {}
        if access and secret:
            session_kwargs['aws_access_key_id'] = access
            session_kwargs['aws_secret_access_key'] = secret

        self.session = boto3.session.Session(**session_kwargs)
        self.s3 = self.session.client('s3', region_name=region, config=BotoConfig(signature_version='s3v4'))

    def presign_upload(self, key, expires_in=3600, content_type=None):
        if not self.enabled:
            raise RuntimeError('S3 not enabled')
        params = {'Bucket': self.bucket, 'Key': key}
        if content_type:
            params['ContentType'] = content_type
        url = self.s3.generate_presigned_url('put_object', Params=params, ExpiresIn=expires_in)
        return url
    
    def presign_download(self, key, expires_in=3600):
        """Generate presigned URL for downloading an object"""
        if not self.enabled:
            raise RuntimeError('S3 not enabled')
        params = {'Bucket': self.bucket, 'Key': key}
        url = self.s3.generate_presigned_url('get_object', Params=params, ExpiresIn=expires_in)
        return url
    
    def delete_object(self, key):
        """Delete an object from S3"""
        if not self.enabled:
            raise RuntimeError('S3 not enabled')
        self.s3.delete_object(Bucket=self.bucket, Key=key)
