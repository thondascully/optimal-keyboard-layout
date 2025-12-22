#!/bin/bash

set -e

echo "Starting dev environment..."

if [ ! -f .env ]; then
    echo "No .env found. Creating default..."
    echo "ENV=development" > .env
fi

if ! docker info > /dev/null 2>&1; then
    echo "!!! Docker is not running. Please start Docker and try again."
    exit 1
fi

mkdir -p services/backend/data

echo "Building and starting containers..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

trap "docker compose -f docker-compose.yml -f docker-compose.dev.yml down" EXIT