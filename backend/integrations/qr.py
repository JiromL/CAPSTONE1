"""QR generation stub"""
import base64
import json

def generate_qr(payload: dict):
    # Minimal safe approach: return a signed token or base64 payload for client-side QR rendering
    token = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    data_url = f"data:text/plain;base64,{token}"
    return {
        'token': token,
        'data_url': data_url,
    }
