#!/usr/bin/env python3
"""Deploy the brighton-upload Worker (R2 image uploads for the admin panel).

- Reads the PUBLIC Supabase anon key from web/src/config.js and injects it
  into the worker script (placeholder __SUPABASE_ANON_KEY__). The key is
  never printed.
- PUTs the script as a module with an R2 binding (MEDIA ->
  brighton-college-media) via the Cloudflare API, auth via the same
  surrogate credential as cf.py.
Usage: deploy.py [subdomain | deploy]
"""
import json
import re
import sys
import urllib.error
import urllib.request
import uuid

sys.path.insert(0, "/opt/muse/skills/custom-connector-setup/bin")
from dynamic_credentials import add_surrogate_to_request, read_json_response

CRED = "custom.cloudflare"
HOSTS = ["api.cloudflare.com"]
API = "https://api.cloudflare.com/client/v4"
ACCOUNT_ID = "da8b522f66448c60dea5660d4900a85b"
SCRIPT_NAME = "brighton-upload"
WORKER_PATH = "/home/hatch/workspace/brighton-college/worker/upload.js"
CONFIG_PATH = "/home/hatch/workspace/brighton-college/web/src/config.js"


def api_json(method, path):
    req = urllib.request.Request(API + path, method=method)
    add_surrogate_to_request(req, CRED, allowed_hosts=HOSTS)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return read_json_response(resp)
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()}", file=sys.stderr)
        sys.exit(1)


def anon_key():
    src = open(CONFIG_PATH).read()
    m = re.search(r"SUPABASE_ANON_KEY\s*=\s*['\"]([^'\"]+)['\"]", src)
    if not m:
        print("anon key not found in config.js", file=sys.stderr)
        sys.exit(1)
    return m.group(1)


def deploy():
    script = open(WORKER_PATH).read().replace("__SUPABASE_ANON_KEY__", anon_key())
    if "__SUPABASE_ANON_KEY__" in script:
        print("placeholder not replaced", file=sys.stderr)
        sys.exit(1)
    metadata = {
        "main_module": "upload.js",
        "compatibility_date": "2026-11-11",
        "bindings": [
            {"type": "r2_bucket", "name": "MEDIA", "bucket_name": "brighton-college-media"}
        ],
    }
    boundary = "----cfdeploy" + uuid.uuid4().hex
    parts = []
    parts.append(
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="metadata"\r\n'
        "Content-Type: application/json\r\n\r\n"
        + json.dumps(metadata)
        + "\r\n"
    )
    parts.append(
        f"--{boundary}\r\n"
        # main_module is the PART NAME, not the filename: the part must be
        # named exactly "upload.js" or the API falls back to service-worker
        # format and chokes on `export`.
        'Content-Disposition: form-data; name="upload.js"; filename="upload.js"\r\n'
        "Content-Type: application/javascript+module\r\n\r\n"
        + script
        + "\r\n"
    )
    parts.append(f"--{boundary}--\r\n")
    body = "".join(parts).encode()
    req = urllib.request.Request(
        API + f"/accounts/{ACCOUNT_ID}/workers/scripts/{SCRIPT_NAME}",
        data=body,
        method="PUT",
    )
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    add_surrogate_to_request(req, CRED, allowed_hosts=HOSTS)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            print(json.dumps(read_json_response(resp), indent=2))
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()}", file=sys.stderr)
        sys.exit(1)


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "deploy"
    if cmd == "subdomain":
        print(json.dumps(api_json("GET", f"/accounts/{ACCOUNT_ID}/workers/subdomain"), indent=2))
    elif cmd == "deploy":
        deploy()
    else:
        print("usage: deploy.py [subdomain | deploy]", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
