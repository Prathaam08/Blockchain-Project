"""
celery_app.py — Celery application configuration.

Configures the Celery worker with Redis as the broker and result backend.
Defines beat schedule for periodic blockchain event syncing.
"""

from celery import Celery
from app.config import get_settings

settings = get_settings()

# Create Celery application
celery_app = Celery(
    "ngo_donation_tracker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.listeners"],
)

# Celery configuration
celery_app.conf.update(
    # Task serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    # Task execution
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,

    # Beat schedule for periodic tasks
    beat_schedule={
        "sync-donation-events": {
            "task": "app.tasks.listeners.sync_donation_events",
            "schedule": 30.0,  # Every 30 seconds
        },
        "sync-withdrawal-events": {
            "task": "app.tasks.listeners.sync_withdrawal_events",
            "schedule": 30.0,  # Every 30 seconds
        },
    },
)
