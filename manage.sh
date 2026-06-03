#!/usr/bin/env bash
cd "$(dirname "$0")"
docker compose exec backend python manage.py "$@"
