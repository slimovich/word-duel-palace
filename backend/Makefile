# Word Duel Palace — backend (FastAPI + WebSockets)
#
# Dependencies are managed by Poetry (see pyproject.toml). `make install`
# creates/updates the in-project .venv; PYTHON points straight at it so the
# other targets don't need to go through `poetry run` for every invocation.

.DEFAULT_GOAL := help
POETRY ?= poetry
PYTHON ?= .venv/bin/python3
HOST   ?= 0.0.0.0
PORT   ?= 8000

.PHONY: help install run dev test pytest lint format format-check markdown-lint words clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install Python dependencies into .venv via Poetry
	$(POETRY) install

run: ## Serve the app on HOST:PORT (serves ../frontend/dist if present)
	$(PYTHON) -m uvicorn main:app --host $(HOST) --port $(PORT)

dev: ## Serve with autoreload
	$(PYTHON) -m uvicorn main:app --host $(HOST) --port $(PORT) --reload

test: ## Smoke-test app wiring + dictionary
	$(PYTHON) -c "from app import create_app; from app.services import Services; \
		create_app(); print('OK —', len(Services.build().dictionary), 'words')"

pytest: ## Run the test suite with coverage
	$(PYTHON) -m coverage run -m pytest
	$(PYTHON) -m coverage report

lint: ## Flake8 the backend source
	$(PYTHON) -m flake8 app main.py tests

format: ## Reformat with black + isort
	$(PYTHON) -m isort app main.py tests
	$(PYTHON) -m black app main.py tests

format-check: ## Check formatting without writing changes
	$(PYTHON) -m isort --check-only app main.py tests
	$(PYTHON) -m black --check app main.py tests

markdown-lint: ## Lint project markdown docs
	$(PYTHON) -m pymarkdown scan ../README.md ../docs README.md

words: ## Print dictionary stats
	@echo "words.txt: $$(wc -l < words.txt) entries (3-7 letters)"

clean: ## Remove Python caches
	find . -name __pycache__ -type d -prune -exec rm -rf {} + 2>/dev/null || true
