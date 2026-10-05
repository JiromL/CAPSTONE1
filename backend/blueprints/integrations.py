from flask import Blueprint, request, jsonify, current_app
from integrations import PandaDocIntegration

# Inbound webhooks only. The early integration stubs that used to live here (email
# sending, Zoom/PandaDoc/QR creation, a second Google OAuth flow, calendar and virus-scan
# webhooks) accepted requests without a login or signature and were not used by the
# app; Google Calendar connects through blueprints/google_calendar.py.

integrations_bp = Blueprint('integrations', __name__)


@integrations_bp.route('/webhooks/pandadoc', methods=['POST'])
def webhook_pandadoc():
    # Verify signature then process
    p = PandaDocIntegration(current_app.config)
    ok = p.verify_webhook(request.headers, request.get_data())
    if not ok:
        return jsonify({'error': 'Invalid signature'}), 400
    # TODO: enqueue processing of webhook payload
    return jsonify({'status': 'received'}), 200


@integrations_bp.route('/webhooks/zoom', methods=['POST'])
def webhook_zoom():
    # Basic acceptance endpoint for Zoom webhooks
    return jsonify({'status': 'received'}), 200
