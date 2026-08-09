.PHONY: help install install-backend install-frontend dev backend frontend

help: ## Show this list of commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-18s %s\n", $$1, $$2}'

install: install-backend install-frontend ## Install backend and frontend dependencies

install-backend: ## Install backend dependencies
	cd backend && uv sync

install-frontend: ## Install frontend dependencies
	cd frontend && npm install

backend: ## Run the backend dev server
	cd backend && uv run fastapi dev src/backend/main.py

frontend: ## Run the frontend dev server
	cd frontend && npm run dev

dev: ## Run backend and frontend dev servers together
	$(MAKE) -j2 backend frontend

.DEFAULT_GOAL := help
