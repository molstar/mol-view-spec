format:
	autoflake --remove-all-unused-imports --remove-unused-variables --ignore-init-module-imports -ir .
	isort .
	black .

mypy:
	mypy .

serve:
	python serve.py
