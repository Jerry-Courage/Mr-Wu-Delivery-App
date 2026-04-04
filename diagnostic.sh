#!/bin/sh
echo "### DIAGNOSTIC: Container Starting..."
echo "### DIAGNOSTIC: Current Working Directory: $(pwd)"
echo "### DIAGNOSTIC: Environment PORT: $PORT"
echo "### DIAGNOSTIC: List /app/dist-server recursively:"
ls -R /app/dist-server
echo "### DIAGNOSTIC: Checking for database file..."
ls -l /app/sqlite_v2.db
echo "### DIAGNOSTIC: Executing npm start..."
npm start
