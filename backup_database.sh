#!/bin/bash

# Database backup script for Clowee ERP
# This script creates a complete backup including all tables, data, functions, rules, and policies

# Configuration
DB_NAME="clowee_erp"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5433"
BACKUP_DIR="./database_backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/clowee_erp_backup_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create complete database backup
echo "Creating backup of $DB_NAME database..."
sudo -u postgres pg_dump -p "$DB_PORT" -d "$DB_NAME" \
  --format=plain \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --file="$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "Backup created successfully: $BACKUP_FILE"
    
    # Compress the backup
    gzip "$BACKUP_FILE"
    echo "Backup compressed: ${BACKUP_FILE}.gz"
    
    # Keep only last 10 backups
    ls -t "${BACKUP_DIR}"/clowee_erp_backup_*.sql.gz | tail -n +11 | xargs -r rm
    echo "Old backups cleaned up (keeping last 10)"
else
    echo "Backup failed!"
    exit 1
fi
