import sys

import requests
from fastapi.routing import APIRoute
from starlette.routing import NoMatchFound

from app.api.examples import router
from app.main import app

if __name__ == "__main__":
    SERVER_URL = "http://localhost:9000"
    print(f"Testing server at {SERVER_URL}")

    docs_url = f"{SERVER_URL}/docs"
    try:
        requests.get(docs_url)
    except Exception as ex:
        print(ex, end="\n\n", file=sys.stderr)
        print(f"Request to docs page failed ({docs_url})", file=sys.stderr)
        print(f"Is your server running?", file=sys.stderr)
        exit(4)

    passed = 0
    failed = 0
    skipped = 0

    for route in router.routes:
        if isinstance(route, APIRoute) and "GET" in route.methods:
            try:
                path = app.url_path_for(route.name)
            except NoMatchFound:
                # This endpoint cannot be run without parameters -> skip
                skipped += 1
                continue

            response = requests.get(f"{SERVER_URL}{path}")
            if response.ok:
                print(f" OK  {response.status_code} {path}")
                passed += 1
            else:
                print(f"FAIL {response.status_code} {path}")
                failed += 1

    print(f"Passed: {passed}   Failed: {failed}   Skipped: {skipped}")

    if failed > 0:
        exit(3)
