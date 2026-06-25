.PHONY: menu run run-backend run-frontend test help

# Default target
menu:
	@node menu.js

run:
	@node menu.js --run-all

run-backend:
	@node menu.js --run-backend

run-frontend:
	@node menu.js --run-frontend

test:
	@node menu.js --run-tests

help:
	@echo "Educational Pathfinder Developer Automation"
	@echo ""
	@echo "Available commands:"
	@echo "  make (or make menu) - Launch interactive developer menu"
	@echo "  make run            - Run both backend and frontend concurrently (merged logs)"
	@echo "  make run-backend    - Run backend only (FastAPI)"
	@echo "  make run-frontend   - Run frontend only (React/Vite)"
	@echo "  make test           - Run Playwright E2E tests"
	@echo ""
