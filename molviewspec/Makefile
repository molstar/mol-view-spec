format:
	autoflake --remove-all-unused-imports --remove-unused-variables --ignore-init-module-imports -ir .
	isort .
	black .

mypy:
	mypy .

serve:
	python serve.py

# starts server in background
start-server:
	@echo "Starting server..."
	@sh -c 'uvicorn app.main:app --host 0.0.0.0 --port 9000 --log-level warning & echo $$! | tee .server_pid'
	@sleep 1  # wait to start

# stop background server
stop-server:
	@echo "Stopping server..."
	@kill -TERM `cat .server_pid` && rm .server_pid

# integration tests against server
test-server: start-server
	@python test_server.py || (make stop-server && exit 1)
	@make stop-server

# unit tests
test-units:
	@python -m unittest discover -s ./tests -p "test_*.py"

test: test-server test-units
