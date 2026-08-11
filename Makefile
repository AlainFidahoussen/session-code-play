.PHONY: help install install-backend install-frontend install-test-e2e dev backend frontend test-e2e

help: ## Show this list of commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-18s %s\n", $$1, $$2}'

install: install-backend install-frontend ## Install backend and frontend dependencies

install-backend: ## Install backend dependencies
	cd backend && uv sync

install-frontend: ## Install frontend dependencies
	cd frontend && npm install

install-test-e2e: ## Install end-to-end test dependencies
	cd tests_e2e && npm install && npx playwright install chromium

backend: ## Run the backend dev server
	cd backend && uv run fastapi dev src/backend/main.py

frontend: ## Run the frontend dev server
	cd frontend && npm run dev

dev: ## Run backend and frontend dev servers together
	$(MAKE) -j2 backend frontend

test-e2e: ## Run Playwright end-to-end tests against `docker compose up`
	docker compose up -d --build
	for i in $$(seq 1 60); do \
		curl -sf http://localhost:8000/health > /dev/null && break; \
		sleep 1; \
	done; \
	curl -sf http://localhost:8000/health > /dev/null || { \
		echo "app did not become healthy within 60s" >&2; \
		docker compose logs; \
		docker compose down; \
		exit 1; \
	}
	( cd tests_e2e && npm install && npx playwright install chromium && npx playwright test ); \
	status=$$?; \
	docker compose down; \
	exit $$status

.DEFAULT_GOAL := help
