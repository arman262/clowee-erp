# Clowee ERP Database Backup & Restore Guide

## Creating a Backup

To create a complete backup of your database:

```bash
./backup_database.sh
```

This will:
- Create a complete backup including all tables, data, functions, rules, and policies
- Save the backup to `database_backups/` directory with timestamp
- Compress the backup file (.gz)
- Keep only the last 10 backups (older ones are automatically deleted)

## Restoring from Backup

To restore from a backup:

```bash
./restore_database.sh database_backups/clowee_erp_backup_YYYYMMDD_HHMMSS.sql.gz
```

Example:
```bash
./restore_database.sh database_backups/clowee_erp_backup_20240315_143022.sql.gz
```

**WARNING**: Restore will drop and recreate the database. You will be prompted to confirm.

## Automated Backups (Optional)

To schedule automatic daily backups, add to crontab:

```bash
# Edit crontab
crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * cd /var/www/html/web_apps/clowee-erp && ./backup_database.sh
```

## Backup Location

All backups are stored in: `database_backups/`

## Notes

- Backups include all database objects (tables, functions, rules, policies)
- Backups are compressed to save space
- Only the last 10 backups are kept automatically
- You can manually copy important backups to another location for long-term storage
