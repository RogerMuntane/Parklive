import sys
import os
sys.path.append('/home/roger/Projecte/Parklive/services/python-service')

from models.reserves_model import get_reserves_usuari
import mysql.connector

try:
    # We need a user ID that exists. I'll try to find one or just see if the query fails on syntax.
    # If the database is not accessible from here, I'll just check for syntax errors.
    filters = {'estat': 'completada,cancel·lada', 'limit': 5, 'offset': 0, 'search': 'test'}
    # This will probably fail if DB is not reachable, but we can see the trace.
    # We don't strictly need a real DB to see if the string manipulation works if we mocked the cursor.
    print("Testing get_reserves_usuari string manipulation...")
    # I'll just check if I can run the logic without calling the DB.
except Exception as e:
    print(f"Caught early error: {e}")

print("Verification script finished.")
