#!/bin/bash
# This script is used to hard reset the DB and rebuild

docker compose down -v

docker compose up --build
