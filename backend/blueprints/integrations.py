from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from integrations import GoogleIntegration, PandaDocIntegration, ZoomIntegration, EmailIntegration, generate_qr

integrations_bp = Blueprint('integrations', __name__)


@integrations_bp.route('/api/oauth/authorize', methods=['GET'])
def oauth_authorize():
    g = GoogleIntegration(current_app.config)
    state = request.args.get('state')
    url = g.get_authorize_url(state=state)
    return jsonify({'authorize_url': url}), 200


@integrations_bp.route('/api/oauth/callback/google', methods=['GET'])
def oauth_callback_google():
    code = request.args.get('code')
    user_id = request.args.get('user_id') or request.args.get('state')
    if not code:
        return jsonify({'error': 'Missing code'}), 400
    if not user_id:
        return jsonify({'error': 'Missing user_id in callback (pass user_id in state or query)'}), 400
    g = GoogleIntegration(current_app.config)
    try:
        tokens = g.exchange_code_and_store(current_app.db, current_app.config, user_id, code)
    except Exception as e:
        return jsonify({'error': f'Failed to exchange code: {str(e)}'}), 500
    return jsonify({'tokens': tokens}), 200


@integrations_bp.route('/api/appointments', methods=['POST'])
def create_appointment():
    payload = request.get_json() or {}
    provider = payload.get('provider', 'google')
    # Minimal flow: create calendar event using GoogleIntegration
    if provider == 'google':
        g = GoogleIntegration(current_app.config)
        # In production, fetch access_token for user from DB
        access_token = payload.get('access_token', 'google-access-token-stub')
        event = payload.get('event', {})
        created = g.create_calendar_event(access_token, event)
        return jsonify({'event': created}), 201
    return jsonify({'error': 'Unsupported provider'}), 400


@integrations_bp.route('/api/pandadoc/create', methods=['POST'])
def create_pandadoc():
    data = request.get_json() or {}
    template_id = data.get('template_id')
    variables = data.get('variables', {})
    p = PandaDocIntegration(current_app.config)
    doc = p.create_document(template_id, variables)
    return jsonify({'document': doc}), 201


@integrations_bp.route('/api/email/send', methods=['POST'])
def api_send_email():
    data = request.get_json() or {}
    to = data.get('to')
    subject = data.get('subject', 'No subject')
    html = data.get('html', '<p>No content</p>')
    if not to:
        return jsonify({'error': 'Missing recipient (to)'}), 400
    e = EmailIntegration(current_app.config)
    ok = e.send_email(to, subject, html)
    if ok:
        return jsonify({'status': 'sent'}), 200
    return jsonify({'status': 'failed'}), 500


@integrations_bp.route('/api/email/send/gmail', methods=['POST'])
def api_send_email_gmail():
    data = request.get_json() or {}
    to = data.get('to')
    subject = data.get('subject', 'No subject')
    html = data.get('html', '<p>No content</p>')
    user_id = data.get('user_id')
    if not to or not user_id:
        return jsonify({'error': 'Missing recipient (to) or user_id'}), 400
    # EmailIntegration already imported at module level
    e = EmailIntegration(current_app.config)
    try:
        resp = e.send_via_gmail(current_app.db, current_app.config, user_id, to, subject, html)
    except Exception as ex:
        return jsonify({'error': str(ex)}), 500
    return jsonify({'status': 'sent', 'response': resp}), 200


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


@integrations_bp.route('/api/qr/generate', methods=['POST'])
def api_generate_qr():
    payload = request.get_json() or {}
    qr = generate_qr(payload)
    return jsonify(qr), 200


@integrations_bp.route('/api/zoom/create', methods=['POST'])
def api_zoom_create():
    data = request.get_json() or {}
    access_token = data.get('access_token')
    topic = data.get('topic', 'CPS Session')
    start_time = data.get('start_time')
    duration = data.get('duration', 60)

    if not access_token or not start_time:
        return jsonify({'error': 'access_token and start_time are required'}), 400

    z = ZoomIntegration(current_app.config)
    meeting = z.create_meeting(access_token, topic, start_time, duration_minutes=duration)
    return jsonify({'meeting': meeting}), 201


@integrations_bp.route('/webhooks/calendar', methods=['POST'])
def webhook_calendar():
    """Handle calendar push notifications (Google push or other providers)
    Minimal stub: record notification into `calendar_notifications` collection for later processing.
    """
    payload = request.get_json() or {}
    try:
        current_app.db.calendar_notifications.insert_one({
            'payload': payload,
            'received_at': __import__('datetime').datetime.utcnow()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    return jsonify({'status': 'accepted'}), 200


@integrations_bp.route('/api/integrations/process-calendar', methods=['POST'])
@jwt_required()
def api_process_calendar():
    """Trigger processing of queued calendar notifications (requires appropriate permission)."""
    from flask_jwt_extended import get_jwt_identity
    user_id = get_jwt_identity()
    # simple permission check: only ADMIN or DPO can trigger
    user = current_app.db.users.find_one({'_id': user_id})
    role = user.get('role') if user else None
    if role not in ['ADMIN', 'DPO']:
        return jsonify({'error': 'Insufficient permissions'}), 403

    # run processor
    try:
        from ..scripts.process_calendar_notifications import process_one
        process_one(current_app.db)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    return jsonify({'status': 'processing_started'}), 200


@integrations_bp.route('/webhooks/virus-scan', methods=['POST'])
def webhook_virus_scan():
    """Receive virus scan results from external scanner and update document status."""
    data = request.get_json() or {}
    document_id = data.get('document_id')
    result = data.get('result')
    if not document_id or not result:
        return jsonify({'error': 'document_id and result required'}), 400
    try:
        current_app.db.documents.update_one({'_id': document_id}, {'$set': {'virus_scan': {'result': result, 'checked_at': __import__('datetime').datetime.utcnow()}}})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    return jsonify({'status': 'updated'}), 200
