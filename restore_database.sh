#!/bin/bash

# Database restore script for Clowee ERP
# This script restores a complete backup including all tables, data, functions, rules, and policies

# Configuration
DB_NAME="clowee_erp"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "Usage: ./restore_database.sh <backup_file.sql.gz>"
    echo "Example: ./restore_database.sh database_backups/clowee_erp_backup_20240101_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Extract if compressed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "Extracting compressed backup..."
    gunzip -k "$BACKUP_FILE"
    SQL_FILE="${BACKUP_FILE%.gz}"
else
    SQL_FILE="$BACKUP_FILE"
fi

# Restore database
echo "Restoring database from: $SQL_FILE"
echo "WARNING: This will drop and recreate the database!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"

if [ $? -eq 0 ]; then
    echo "Database restored successfully!"
    
    # Clean up extracted file if it was compressed
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        rm "$SQL_FILE"
    fi
else
    echo "Restore failed!"
    exit 1
fi
