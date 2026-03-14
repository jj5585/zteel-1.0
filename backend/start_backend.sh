#!/bin/bash
# Ensure PostgreSQL is running before starting backend
if ! pg_ctlcluster 15 main status > /dev/null 2>&1; then
    pg_ctlcluster 15 main start
    sleep 2
fi
exec /root/.venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --workers 1 --reload
