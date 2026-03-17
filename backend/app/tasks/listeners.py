"""
listeners.py — Celery tasks for blockchain event listening.

Periodically polls the blockchain for new events (donations, withdrawals)
and syncs them to the PostgreSQL database. Tracks the last processed
block to avoid duplicate entries.
"""

from datetime import datetime
from app.tasks.celery_app import celery_app
from app.database import SessionLocal
from app.models.donation import Donation
from app.models.withdrawal import Withdrawal
from app.services.blockchain import BlockchainService

# Track last processed block (in-memory; for production use Redis/DB)
_last_donation_block = 0
_last_withdrawal_block = 0


@celery_app.task(
    name="app.tasks.listeners.sync_donation_events",
    bind=True,
    max_retries=3,
    default_retry_delay=10,
)
def sync_donation_events(self):
    """Sync DonationReceived events from the blockchain to PostgreSQL.

    Polls the DonationTracker contract for new DonationReceived events
    since the last processed block. Creates donation records for any
    new events not already in the database.

    Retries up to 3 times on failure with 10-second delay.
    """
    global _last_donation_block

    try:
        blockchain = BlockchainService()
        if not blockchain.is_connected():
            print("⚠️ Blockchain not connected, skipping sync")
            return

        events = blockchain.get_donation_events(from_block=_last_donation_block)

        if not events:
            return

        db = SessionLocal()
        try:
            for event in events:
                args = event["args"]
                tx_hash = event["transactionHash"].hex()

                # Check if already recorded
                existing = db.query(Donation).filter(
                    Donation.tx_hash == tx_hash
                ).first()

                if existing:
                    continue

                # Get block timestamp
                block = blockchain.w3.eth.get_block(event["blockNumber"])

                donation = Donation(
                    tx_hash=tx_hash,
                    donor_address=args["donor"].lower(),
                    ngo_address=args["ngoAddress"].lower(),
                    amount_eth=float(blockchain.w3.from_wei(args["amount"], "ether")),
                    block_number=event["blockNumber"],
                    timestamp=datetime.utcfromtimestamp(block["timestamp"]),
                )
                db.add(donation)

            db.commit()

            # Update last processed block
            if events:
                _last_donation_block = max(e["blockNumber"] for e in events) + 1

            print(f"✅ Synced {len(events)} donation events")

        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()

    except Exception as exc:
        print(f"❌ Donation sync failed: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(
    name="app.tasks.listeners.sync_withdrawal_events",
    bind=True,
    max_retries=3,
    default_retry_delay=10,
)
def sync_withdrawal_events(self):
    """Sync FundsWithdrawn events from the blockchain to PostgreSQL.

    Polls the DonationTracker contract for new FundsWithdrawn events
    since the last processed block. Creates withdrawal records for
    new events.

    Retries up to 3 times on failure with 10-second delay.
    """
    global _last_withdrawal_block

    try:
        blockchain = BlockchainService()
        if not blockchain.is_connected():
            print("⚠️ Blockchain not connected, skipping sync")
            return

        events = blockchain.get_withdrawal_events(from_block=_last_withdrawal_block)

        if not events:
            return

        db = SessionLocal()
        try:
            for event in events:
                args = event["args"]
                tx_hash = event["transactionHash"].hex()

                # Check if already recorded
                existing = db.query(Withdrawal).filter(
                    Withdrawal.tx_hash == tx_hash
                ).first()

                if existing:
                    continue

                block = blockchain.w3.eth.get_block(event["blockNumber"])

                withdrawal = Withdrawal(
                    tx_hash=tx_hash,
                    ngo_address=args["ngoAddress"].lower(),
                    amount_eth=float(blockchain.w3.from_wei(args["amount"], "ether")),
                    timestamp=datetime.utcfromtimestamp(block["timestamp"]),
                )
                db.add(withdrawal)

            db.commit()

            if events:
                _last_withdrawal_block = max(e["blockNumber"] for e in events) + 1

            print(f"✅ Synced {len(events)} withdrawal events")

        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()

    except Exception as exc:
        print(f"❌ Withdrawal sync failed: {exc}")
        raise self.retry(exc=exc)
