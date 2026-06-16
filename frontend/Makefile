# Word Duel Palace — frontend (React + Vite)

.DEFAULT_GOAL := help
SHELL := /bin/bash

# Load nvm (if present) so a modern Node (>=18) is used; otherwise use PATH.
# Used inline as a prefix: `$(NODE) && <command>`.
NODE := { [ -s "$$HOME/.nvm/nvm.sh" ] && source "$$HOME/.nvm/nvm.sh" && nvm use 22 >/dev/null 2>&1 || true; }

.PHONY: help install build dev preview clean clean-all

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install Node dependencies
	$(NODE) && npm install

build: ## Production build into dist/
	$(NODE) && npm run build

dev: ## Vite dev server on :5173 (proxies /ws + /api to the backend)
	$(NODE) && npm run dev

preview: ## Preview the production build locally
	$(NODE) && npm run preview

clean: ## Remove the build output
	rm -rf dist

clean-all: clean ## Also remove node_modules
	rm -rf node_modules
