#!/bin/bash

set -e

echo "Starting dev environment..."

# Check for .env file
if [ ! -f .env ]; then
    echo "No .env found. Creating default..."
    echo "ENV=development" > .env
fi

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Ensure data directory exists
mkdir -p services/backend/data

# Cleanup function
cleanup() {
    echo ""
    echo "Shutting down..."
    docker compose -f docker-compose.yml -f docker-compose.dev.yml down
}

# Set trap before starting containers
trap cleanup EXIT INT TERM

echo "Building and starting containers..."
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo ""

docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
