#!/usr/bin/env python3
"""
Script para migrar de SQLite para PostgreSQL
Este script exporta dados do SQLite e importa para PostgreSQL
"""

import os
import sqlite3
import sys
from pathlib import Path

import psycopg
from sqlalchemy import create_engine, text
from telaflow_cloud_api.persistence.database import get_engine


def export_sqlite_data():
    """Export all data from SQLite to dictionaries"""
    sqlite_path = Path(__file__).parent.parent / "telaflow_cloud_api.db"
    conn = sqlite3.connect(str(sqlite_path))
    conn.row_factory = sqlite3.Row
    
    data = {}
    
    # List all tables
    tables = [
        'organizations', 'users', 'memberships', 'events', 
        'scenes', 'draw_configs', 'media_requirements', 
        'export_packages', 'draw_registration_sessions', 'draw_registrations'
    ]
    
    for table in tables:
        cursor = conn.execute(f"SELECT * FROM {table}")
        data[table] = [dict(row) for row in cursor.fetchall()]
        print(f"Exported {len(data[table])} rows from {table}")
    
    conn.close()
    return data


def import_postgresql_data(data):
    """Import data to PostgreSQL"""
    pg_url = os.environ.get("DATABASE_URL", "postgresql://telaflow:password@localhost:5432/telaflow_cloud")
    
    with psycopg.connect(pg_url) as conn:
        conn.autocommit = False
        
        try:
            with conn.cursor() as cursor:
                for table_name, rows in data.items():
                    if not rows:
                        continue
                        
                    print(f"Importing {len(rows)} rows to {table_name}")
                    
                    for row in rows:
                        # Build INSERT statement dynamically
                        columns = list(row.keys())
                        placeholders = [f"%({col}s" for col in columns]
                        query = f"""
                            INSERT INTO {table_name} ({', '.join(columns)})
                            VALUES ({', '.join(placeholders)})
                            ON CONFLICT DO NOTHING
                        """
                        
                        cursor.execute(query, row)
                
                conn.commit()
                print("All data imported successfully!")
                
        except Exception as e:
            conn.rollback()
            print(f"Error importing data: {e}")
            raise


def setup_postgresql_database():
    """Create PostgreSQL database if it doesn't exist"""
    pg_url = os.environ.get("DATABASE_URL", "postgresql://telaflow:password@localhost:5432/telaflow_cloud")
    
    # Extract connection info without database name
    base_url = pg_url.rsplit('/', 1)[0]
    db_name = pg_url.rsplit('/', 1)[1]
    
    try:
        # Connect to postgres database to create our database
        with psycopg.connect(f"{base_url}/postgres") as conn:
            conn.autocommit = True
            with conn.cursor() as cursor:
                cursor.execute(f"CREATE DATABASE {db_name}")
                print(f"Created database {db_name}")
    except psycopg.errors.DuplicateDatabase:
        print(f"Database {db_name} already exists")
    except Exception as e:
        print(f"Error creating database: {e}")


def run_migrations():
    """Run Alembic migrations on PostgreSQL"""
    os.chdir(Path(__file__).parent.parent)
    os.system("alembic upgrade head")


def main():
    """Main migration process"""
    print("=== SQLite to PostgreSQL Migration ===")
    
    # Step 1: Export SQLite data
    print("\n1. Exporting data from SQLite...")
    data = export_sqlite_data()
    
    # Step 2: Setup PostgreSQL database
    print("\n2. Setting up PostgreSQL database...")
    setup_postgresql_database()
    
    # Step 3: Run migrations
    print("\n3. Running Alembic migrations...")
    run_migrations()
    
    # Step 4: Import data
    print("\n4. Importing data to PostgreSQL...")
    import_postgresql_data(data)
    
    print("\n=== Migration completed successfully! ===")
    print("Don't forget to:")
    print("1. Update your .env file with DATABASE_URL=postgresql://...")
    print("2. Test the application")
    print("3. Backup the SQLite file before deleting it")


if __name__ == "__main__":
    main()
