import json
import requests
import sys
from datetime import datetime, timedelta
from pathlib import Path

# --- Configuration & Auth ---
def get_pb_info():
    info = {}
    try:
        with open('db/pb_info.txt', 'r') as f:
            for line in f:
                if ':' in line:
                    k, v = line.split(':', 1)
                    info[k.strip()] = v.strip()
        return info
    except Exception as e:
        print(f"Error reading config: {e}")
        return None

def authenticate(pb_url, email, password):
    try:
        resp = requests.post(f"{pb_url}/api/collections/_superusers/auth-with-password", json={
            "identity": email, "password": password
        })
        if resp.status_code != 200:
            print(f"Auth failed: {resp.text}")
            return None
        return resp.json()['token']
    except Exception as e:
        print(f"Auth error: {e}")
        return None

# --- Logic Helper ---
def resolve_recurring_date(mmdd, year):
    mm, dd = map(int, mmdd.split('-'))
    return datetime(year, mm, dd)

def resolve_window(today, signal):
    current_year = today.year
    if signal.get('mode') == 'one_off':
        start = datetime.strptime(signal['start_date'][:10], '%Y-%m-%d')
        end = datetime.strptime(signal['end_date'][:10], '%Y-%m-%d')
        peak_start = datetime.strptime(signal['peak_start_date'][:10], '%Y-%m-%d') if signal.get('peak_start_date') else None
        peak_end = datetime.strptime(signal['peak_end_date'][:10], '%Y-%m-%d') if signal.get('peak_end_date') else None
    else:
        start = resolve_recurring_date(signal['start_mmdd'], current_year)
        end = resolve_recurring_date(signal['end_mmdd'], current_year)
        if end < start:
            end = resolve_recurring_date(signal['end_mmdd'], current_year + 1)
        if today > end + timedelta(days=1):
            start = resolve_recurring_date(signal['start_mmdd'], current_year + 1)
            end = resolve_recurring_date(signal['end_mmdd'], start.year if signal['end_mmdd'] > signal['start_mmdd'] else start.year + 1)
        
        peak_start = resolve_recurring_date(signal['peak_start_mmdd'], start.year) if signal.get('peak_start_mmdd') else None
        peak_end = resolve_recurring_date(signal['peak_end_mmdd'], start.year) if signal.get('peak_end_mmdd') else None
        if peak_start and peak_end and peak_end < peak_start:
             peak_end = resolve_recurring_date(signal['peak_end_mmdd'], peak_start.year + 1)

    return start, end, peak_start, peak_end

def run_evaluation(today_str=None):
    today = datetime.strptime(today_str, '%Y-%m-%d') if today_str else datetime.now()
    print(f"--- Running Notification Evaluation (Today: {today.strftime('%Y-%m-%d')}) ---")
    
    info = get_pb_info()
    if not info: return
    pb_url = info['pb_url']
    token = authenticate(pb_url, info['email'], info['password'])
    if not token: return
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 1. Fetch all active signals
    resp = requests.get(f"{pb_url}/api/collections/trend_signals/records", headers=headers, params={'filter': 'status="active"', 'perPage': 200, 'expand': 'trend_type'})
    signals = resp.json().get('items', [])
    
    # 2. Fetch notification log to prevent repeats
    log_resp = requests.get(f"{pb_url}/api/collections/notification_log/records", headers=headers, params={'perPage': 500})
    fired_keys = {item['log_key'] for item in log_resp.json().get('items', [])}

    alerts_due = []

    for s in signals:
        start, end, peak_start, peak_end = resolve_window(today, s)
        pre_alert_days = s.get('pre_alert_days') or (s.get('expand', {}).get('trend_type', {}).get('default_pre_alert_days') or 14)
        pre_alert_date = start - timedelta(days=int(pre_alert_days))
        
        occurrence_key = start.strftime('%Y-%m-%d')
        
        # Define alert checkpoints
        checkpoints = [
            ('PRE_ALERT', pre_alert_date),
            ('START', start),
            ('END', end)
        ]
        if peak_start:
            checkpoints.append(('PEAK', peak_start))
        
        # Check source markets
        markets = s.get('source_markets') or ['ALL']
        
        for market in markets:
            for alert_type, alert_date in checkpoints:
                # Evaluation Window: is the alert_date within [today, today + 6 days]?
                # (This accommodates weekly runs; for daily, alert_date == today)
                if today <= alert_date < today + timedelta(days=7):
                    log_key = f"{s['key']}|{market}|{occurrence_key}|{alert_type}"
                    
                    if log_key not in fired_keys:
                        alerts_due.append({
                            'log_key': log_key,
                            'signal_key': s['key'],
                            'source_market': market,
                            'alert_type': alert_type,
                            'alert_date': alert_date.strftime('%Y-%m-%d'),
                            'occurrence_key': occurrence_key,
                            'summary': s['summary'],
                            'destinations': s['destinations']
                        })

    if not alerts_due:
        print("No new alerts due in the next 7 days.")
        return

    print(f"Found {len(alerts_due)} alerts to fire:")
    for a in alerts_due:
        print(f"🚀 [{a['alert_type']}] {a['signal_key']} for {a['source_market']} on {a['alert_date']}")
        
        # Mark as fired in DB
        log_payload = {
            "log_key": a['log_key'],
            "signal_key": a['signal_key'],
            "source_market": a['source_market'],
            "alert_type": a['alert_type'],
            "alert_date": a['alert_date'],
            "occurrence_key": a['occurrence_key'],
            "fired_at": datetime.now().isoformat()
        }
        r_log = requests.post(f"{pb_url}/api/collections/notification_log/records", headers=headers, json=log_payload)
        if r_log.status_code != 200:
            print(f"  ❌ Failed to log: {r_log.text}")

if __name__ == '__main__':
    # Usage: python3 notification_engine.py [YYYY-MM-DD]
    eval_date = sys.argv[1] if len(sys.argv) > 1 else None
    run_evaluation(eval_date)
