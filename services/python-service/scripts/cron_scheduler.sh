#!/bin/sh
# services/python-service/scripts/cron_scheduler.sh
# Script to run the subscription expiration task once a day (86400 seconds)

echo "[Cron Scheduler] Starting ParkLive background tasks..."

while true; do
    echo "[Cron Scheduler] $(date) - Running subscription expiration task..."
    python /app/scripts/cron_expire_subscriptions.py
    
    echo "[Cron Scheduler] $(date) - Running payment capture task..."
    python /app/scripts/cron_capture_payments.py
    
    echo "[Cron Scheduler] $(date) - Tasks completed. Sleeping for 1 hour..."
    # Sleep for 1 hour (3600 seconds)
    sleep 3600
done
