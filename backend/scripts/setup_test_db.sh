#!/bin/bash

# Create test database
psql -U postgres -c "DROP DATABASE IF EXISTS dankfolio_test;"
psql -U postgres -c "CREATE DATABASE dankfolio_test;"

# Apply migrations to test database
psql -U postgres -d dankfolio_test -f ../db/migrations/000001_consolidated_schema.sql

echo "✅ Test database setup complete" 