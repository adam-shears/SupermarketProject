#!/bin/bash
# This script is used to hard reset the DB and rebuild

docker compose down -v

# Lint and unit test first to avoid wasting time
npm run lint
if [ $? -ne 0 ]; then
  echo "Linting failed. Aborting build."
  exit 1
fi
npm run test
if [ $? -ne 0 ]; then
  echo "Tests failed. Aborting build."
  exit 1
fi

docker compose up --build
