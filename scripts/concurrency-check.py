#!/usr/bin/env python3
"""Concurrency probe for the capacity rule (see docs/Technology_Choices_Design_and_Tradeoffs.pdf).

Fires N registrations at the SAME instant (threading.Barrier) for a workshop with
capacity 1 and reports how many ended up ACTIVE: 1 = the rule holds, >1 = overbooked.

    python3 scripts/concurrency-check.py                 # against http://localhost:3001
    API_URL=http://localhost:3999 python3 scripts/concurrency-check.py

Needs the API running with a seeded database (admin@test.com / admin123).
"""
import json
import os
import subprocess
import sys
import threading
import urllib.error
import urllib.request

API = os.environ.get("API_URL", "http://localhost:3001").rstrip("/")
N = int(os.environ.get("N", "10"))


def call(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw or b"{}")
        except Exception:
            return e.code, {"raw": raw[:120].decode(errors="replace")}


def main():
    _, login = call("POST", "/auth/login", body={"email": "admin@test.com", "password": "admin123"})
    if "access_token" not in login:
        print("could not log in - is the API running with a seeded database?", login)
        sys.exit(1)
    admin = login["access_token"]

    # MANAGER is the role allowed to create workshops.
    call("POST", "/users", admin, {"email": "mgr@test.com", "password": "manager123", "role": "MANAGER"})
    _, mlogin = call("POST", "/auth/login", body={"email": "mgr@test.com", "password": "manager123"})
    mgr = mlogin["access_token"]

    code = "RACE-" + subprocess.run(["date", "+%s"], capture_output=True, text=True).stdout.strip()
    status, ws = call("POST", "/workshops", mgr, {
        "code": code, "title": "Concurrency probe", "instructor": "Test",
        "date": "2026-11-01T10:00:00.000Z", "capacity": 1,
    })
    if status not in (200, 201):
        print("could not create workshop:", status, ws)
        sys.exit(1)
    wid = ws["id"]
    print(f"workshop {wid} ({code}) capacity=1 ->  {N} simultaneous registrations")

    results = []
    lock = threading.Lock()
    barrier = threading.Barrier(N)

    def worker(i):
        barrier.wait()  # release all threads at the same instant
        st, payload = call("POST", "/registrations", mgr, {
            "workshopId": wid, "attendeeName": f"Attendee {i}",
            "attendeeEmail": f"race{i}@example.com",
        })
        with lock:
            results.append((st, payload.get("status", payload.get("message", "?"))))

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(N)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    hist = {}
    for st, outcome in results:
        hist[f"{st} {outcome}"] = hist.get(f"{st} {outcome}", 0) + 1
    for key in sorted(hist):
        print(f"  HTTP {key}: {hist[key]}")

    _, detail = call("GET", f"/workshops/{wid}", mgr)
    counts = {}
    for reg in detail.get("registrations", []):
        counts[reg["status"]] = counts.get(reg["status"], 0) + 1
    print("DB rows:", counts, "| ACTIVE should be <= 1")
    print("RESULT:", "PASS - capacity respected" if counts.get("ACTIVE", 0) <= 1 else "FAIL - OVERBOOKED")


if __name__ == "__main__":
    main()
