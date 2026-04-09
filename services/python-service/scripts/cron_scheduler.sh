#!/bin/sh
# services/python-service/scripts/cron_scheduler.sh
# Script to run the subscription expiration task once a day (86400 seconds)

echo "[Cron Scheduler] Starting subscription expiration scheduler..."

while true; do
    echo "[Cron Scheduler] $(date) - Running subscription expiration task..."
    python /app/scripts/cron_expire_subscriptions.py
    
    echo "[Cron Scheduler] $(date) - Task completed. Sleeping for 24 hours..."
    # Sleep for 24 hours (86400 seconds)
    sleep 86400
done
