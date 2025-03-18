format:
	autoflake --remove-all-unused-imports --remove-unused-variables --ignore-init-module-imports -ir .
	isort .
	black .

mypy:
	mypy .

serve:
	python serve.py

test:
	( uvicorn app.main:app --host 0.0.0.0 --port 9000 --log-level warning & pid=$$! && sleep 1 && \
	python test_server.py && \
	kill -TERM $$pid ) || (kill -TERM $$pid; exit 1)
