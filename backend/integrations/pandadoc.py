"""PandaDoc integration stub"""
class PandaDocIntegration:
    def __init__(self, config):
        self.api_key = config.PANDADOC_API_KEY

    def create_document(self, template_id, variables):
        # In production, POST to PandaDoc create document endpoint and return document id
        return {
            'document_id': 'pandadoc-doc-stub-123',
            'status': 'sent'
        }

    def verify_webhook(self, request_headers, request_body):
        # Verify signature if available. This is a stub.
        return True
