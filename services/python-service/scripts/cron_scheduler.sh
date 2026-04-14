#!/bin/sh
# services/python-service/scripts/cron_scheduler.sh
# Script to run the subscription expiration task once a day (86400 seconds)
set +e

# Get the directory where the script is located
SCRIPT_DIR=$(dirname "$0")

echo "[Cron Scheduler] Waiting 10s for DB to be ready..."
sleep 10

echo "[Cron Scheduler] Starting ParkLive background tasks..."

while true; do
    echo "[Cron Scheduler] $(date) - Running subscription expiration task..."
    python3 "$SCRIPT_DIR/cron_expire_subscriptions.py" || echo "[Cron Scheduler] ERROR: Expiration task failed"
    
    echo "[Cron Scheduler] $(date) - Running payment capture task..."
    python3 "$SCRIPT_DIR/cron_capture_payments.py" || echo "[Cron Scheduler] ERROR: Capture task failed"
    
    echo "[Cron Scheduler] $(date) - Cycle completed. Sleeping for 1 hour..."
    # Sleep for 1 hour (3600 seconds)
    sleep 3600
done
