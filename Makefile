# =============================================================================
# Word Duel Palace — root automation for the backend (FastAPI) and the
# frontend (React/Vite). Run `make help` to see everything.
# =============================================================================

.DEFAULT_GOAL := help
SHELL := /bin/bash

POETRY ?= poetry
PYTHON ?= .venv/bin/python3
HOST   ?= 0.0.0.0
PORT   ?= 8000
BACKEND  := backend
FRONTEND := frontend

# Load nvm (if installed) so the frontend uses a modern Node (>=18). Falls
# back to whatever `node` is on PATH when nvm is absent. Used inline as a
# prefix: `$(NODE) && <command>`.
NODE := { [ -s "$$HOME/.nvm/nvm.sh" ] && source "$$HOME/.nvm/nvm.sh" && nvm use 22 >/dev/null 2>&1 || true; }

.PHONY: help install backend-install frontend-install build run lan \
        backend frontend dev test clean clean-all

help: ## Show this help
	@echo ""
	@echo "Word Duel Palace — make targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Vars: HOST=$(HOST) PORT=$(PORT) PYTHON=$(PYTHON)"
	@echo ""

install: backend-install frontend-install ## Install backend + frontend deps

backend-install: ## Install Python dependencies via Poetry into backend/.venv
	cd $(BACKEND) && $(POETRY) install

frontend-install: ## Install Node dependencies
	$(NODE) && cd $(FRONTEND) && npm install

build: ## Build the frontend into frontend/dist
	$(NODE) && cd $(FRONTEND) && npm run build

run: build ## Build the frontend, then serve the whole app on HOST:PORT
	cd $(BACKEND) && $(PYTHON) -m uvicorn main:app --host $(HOST) --port $(PORT)

lan: ## Build + serve bound to 0.0.0.0 for LAN play (same as run)
	$(MAKE) run HOST=0.0.0.0

backend: ## Run the backend only, with autoreload (serves existing build)
	cd $(BACKEND) && $(PYTHON) -m uvicorn main:app --host $(HOST) --port $(PORT) --reload

frontend: ## Run the Vite dev server (proxies /ws + /api to the backend)
	$(NODE) && cd $(FRONTEND) && npm run dev

dev: ## Print how to run backend + frontend together in dev mode
	@echo "Open two terminals:"
	@echo "  1) make backend     # FastAPI (autoreload) on :$(PORT)"
	@echo "  2) make frontend    # Vite dev on :5173, proxying /ws + /api"

test: ## Smoke-test the backend (app wiring + dictionary load)
	cd $(BACKEND) && $(PYTHON) -c "from app import create_app; from app.services import Services; \
		create_app(); d = Services.build().dictionary; \
		print('backend OK —', len(d), 'words,', d.anagram_count, 'anagram keys')"

clean: ## Remove build artifacts and Python caches
	rm -rf $(FRONTEND)/dist
	find $(BACKEND) -name __pycache__ -type d -prune -exec rm -rf {} + 2>/dev/null || true

clean-all: clean ## Also remove node_modules
	rm -rf $(FRONTEND)/node_modules
