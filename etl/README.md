# Database Setup Guide

This guide provides step-by-step instructions for setting up the Learning My Recipes database from scratch.

## Prerequisites

- PostgreSQL server running on `localhost:5432`
- Python 3.7+ with required packages (`psycopg2`, `python-dotenv`)
- Database user with CREATE/DROP privileges (typically `postgres`)

## Database Setup Steps

### 1. Drop Existing Database (if needed)

If you need to start fresh or the database already exists:

```bash
# Check if database exists and drop it
psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS learning_my_recipes;"
```

If you get an error about existing connections:
```
ERROR: database "learning_my_recipes" is being accessed by other users
DETAIL: There are X other sessions using the database.
```

Force terminate all connections first:
```bash
# Terminate all active connections to the database
psql -h localhost -U postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'learning_my_recipes' AND pid <> pg_backend_pid();"

# Then drop the database
psql -h localhost -U postgres -c "DROP DATABASE learning_my_recipes;"
```

### 2. Create Database and Schema

```bash
# Create new database
psql -h localhost -U postgres -c "CREATE DATABASE learning_my_recipes;"

# Navigate to project root (adjust path as needed)
cd "C:\Users\shikhar.shrivastava\OneDrive - Accenture\Documents\git-projects\learning-my-recipes"

# Run schema to create all tables with UUID support
psql -h localhost -U postgres -d learning_my_recipes -f database/schema.sql
```

### 3. Populate Database with Test Data

```bash
# Navigate to ETL folder
cd etl

# Run the ETL script to populate with test data
python etl_ingest_data.py
```

## Complete Setup Script

For a complete fresh setup, run these commands in sequence:

```bash
# 1. Force drop existing database (if needed)
psql -h localhost -U postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'learning_my_recipes' AND pid <> pg_backend_pid();"
psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS learning_my_recipes;"

# 2. Create database and schema
psql -h localhost -U postgres -c "CREATE DATABASE learning_my_recipes;"
cd "C:\Users\shikhar.shrivastava\OneDrive - Accenture\Documents\git-projects\learning-my-recipes"
psql -h localhost -U postgres -d learning_my_recipes -f database/schema.sql

# 3. Populate with test data
cd etl
python etl_ingest_data.py
```

## Expected Results

After successful completion, you should see:
- ✅ **8 categories** created
- ✅ **25 ingredients** created  
- ✅ **8 recipes** created
- ✅ **48 recipe-ingredient relationships** established
- ✅ **0 errors**

## Verification

Test that the setup worked correctly:

```bash
# Check database contents
psql -h localhost -U postgres -d learning_my_recipes -c "SELECT COUNT(*) as recipes FROM recipes;"
psql -h localhost -U postgres -d learning_my_recipes -c "SELECT COUNT(*) as ingredients FROM ingredients;"
psql -h localhost -U postgres -d learning_my_recipes -c "SELECT COUNT(*) as categories FROM categories;"
```

## Database Schema Features

The database includes:
- **UUID primary keys** for all tables
- **JSONB fields** for flexible data storage (instructions, nutrition_data)
- **Foreign key relationships** between recipes, ingredients, and categories
- **Indexes** for optimized queries
- **Constraints** for data integrity
- **Automatic timestamps** (created_at, updated_at)

## Troubleshooting

### Common Issues

1. **Connection refused**: Ensure PostgreSQL is running on port 5432
2. **Authentication failed**: Check PostgreSQL user credentials
3. **Permission denied**: Ensure user has CREATE/DROP database privileges
4. **Module not found**: Install required Python packages with `pip install psycopg2 python-dotenv`

### Environment Configuration

Create a `.env` file in the project root with:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=learning_my_recipes
DB_USER=postgres
DB_PASSWORD=your_password
```

## Files Description

- `test_data.json` - Sample data for categories, ingredients, and recipes
- `etl_ingest_data.py` - Python script to populate database
- `../database/schema.sql` - Complete database schema with UUID support
- `README.md` - This setup guide

## API Testing

After setup, you can test the API endpoints:

```bash
# Test recipe listing
curl "http://localhost:3001/api/recipes"

# Test ingredient creation
curl -X POST "http://localhost:3001/api/ingredients" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Ingredient","category":"test"}'

# Test recipe search by ingredients (use actual ingredient UUIDs)
curl "http://localhost:3001/api/recipes/search/ingredients?ingredients=<ingredient-uuid>"
```

---

**Note**: This setup creates a complete development database with sample recipes including Mediterranean, Asian, and appetizer dishes with proper UUID relationships and JSONB data structures.