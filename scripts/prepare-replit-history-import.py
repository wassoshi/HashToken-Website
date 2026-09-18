#!/usr/bin/env python3
"""Validate the public Replit mint-history export and emit an atomic SQL import.

Only mint events are imported. The public JSON stays on the VPS, outside Git.
"""

import argparse
import base64
from datetime import datetime
import json
from pathlib import Path
import re
import sys


HASH = re.compile(r"0x[0-9a-fA-F]{64}\Z")
ADDRESS = re.compile(r"0x[0-9a-fA-F]{40}\Z")


def positive_int(value: str) -> int:
    result = int(value)
    if result <= 0:
        raise argparse.ArgumentTypeError("must be positive")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", type=Path)
    parser.add_argument("--expected-count", required=True, type=positive_int)
    parser.add_argument("--forward-checkpoint", required=True, type=positive_int)
    parser.add_argument("--history-checkpoint", required=True, type=positive_int)
    parser.add_argument("--check-only", action="store_true")
    args = parser.parse_args()

    events = json.loads(args.file.read_text(encoding="utf-8"))
    if not isinstance(events, list) or len(events) != args.expected_count:
        raise ValueError(f"expected {args.expected_count} mint events; got {len(events) if isinstance(events, list) else 'non-array JSON'}")

    hashes: set[str] = set()
    for index, event in enumerate(events):
        if not isinstance(event, dict):
            raise ValueError(f"event {index}: expected an object")
        block = event.get("blockNumber")
        tx_hash = event.get("transactionHash")
        address = event.get("minter")
        timestamp = event.get("timestamp")
        if type(block) is not int or block < 1:
            raise ValueError(f"event {index}: invalid block number")
        if not isinstance(tx_hash, str) or not HASH.fullmatch(tx_hash):
            raise ValueError(f"event {index}: invalid transaction hash")
        if not isinstance(address, str) or not ADDRESS.fullmatch(address):
            raise ValueError(f"event {index}: invalid minter address")
        if not isinstance(timestamp, str):
            raise ValueError(f"event {index}: missing timestamp")
        datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        for field in ("gasUsed", "gasPrice", "difficulty", "expectedAttempts"):
            if event.get(field) is not None and not isinstance(event[field], str):
                raise ValueError(f"event {index}: invalid {field}")
        if tx_hash.lower() in hashes:
            raise ValueError(f"event {index}: duplicate transaction hash")
        hashes.add(tx_hash.lower())

    print(f"Validated {len(events)} unique mint events", file=sys.stderr)
    if args.check_only:
        return

    # Encode the input so its contents cannot be interpreted as SQL syntax.
    payload = base64.b64encode(json.dumps(events, separators=(",", ":")).encode("utf-8")).decode("ascii")
    print(f"""BEGIN;
CREATE TEMP TABLE replit_mints ON COMMIT DROP AS
SELECT e."blockNumber" AS block_number,
       e."transactionHash" AS transaction_hash,
       e.minter,
       (e."timestamp"::timestamptz AT TIME ZONE 'UTC') AS "timestamp",
       e."gasUsed" AS gas_used,
       e."gasPrice" AS gas_price,
       e.difficulty,
       e."expectedAttempts" AS expected_attempts
FROM jsonb_to_recordset(convert_from(decode('{payload}', 'base64'), 'UTF8')::jsonb)
  AS e("blockNumber" integer, "transactionHash" text, minter text,
       "timestamp" text, "gasUsed" text, "gasPrice" text,
       difficulty text, "expectedAttempts" text);

DO $$ BEGIN
  IF (SELECT count(*) FROM replit_mints) <> {args.expected_count} THEN
    RAISE EXCEPTION 'The complete Replit history was not loaded';
  END IF;
END $$;

WITH imported AS (
  INSERT INTO mint_events (block_number, transaction_hash, minter, "timestamp",
                           gas_used, gas_price, difficulty, expected_attempts)
  SELECT block_number, transaction_hash, minter, "timestamp",
         gas_used, gas_price, difficulty, expected_attempts
  FROM replit_mints
  WHERE true
  ON CONFLICT (transaction_hash) DO NOTHING
  RETURNING 1
)
SELECT (SELECT count(*) FROM replit_mints) AS source_records,
       count(*) AS newly_imported FROM imported;

-- These checkpoints were reached by the old indexer before this export.
-- Forward progress is increasing, while older-history progress is decreasing.
INSERT INTO sync_states (chain, last_processed_block)
VALUES ('ethereum-mainnet', {args.forward_checkpoint})
ON CONFLICT (chain) DO UPDATE
SET last_processed_block = GREATEST(sync_states.last_processed_block, EXCLUDED.last_processed_block),
    updated_at = now();

INSERT INTO sync_states (chain, last_processed_block)
VALUES ('ethereum-mainnet-history', {args.history_checkpoint})
ON CONFLICT (chain) DO UPDATE
SET last_processed_block = LEAST(sync_states.last_processed_block, EXCLUDED.last_processed_block),
    updated_at = now();

SELECT count(*) AS total_records FROM mint_events;
COMMIT;""")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError) as exc:
        print(f"Import validation failed: {exc}", file=sys.stderr)
        sys.exit(1)
