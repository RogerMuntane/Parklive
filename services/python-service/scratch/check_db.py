import mysql.connector
import json

try:
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="parklive",
        port=3306
    )
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, fotos_url FROM valoracions ORDER BY id DESC LIMIT 5")
    rows = cursor.fetchall()
    for row in rows:
        print(f"ID: {row['id']}, fotos_url: {row['fotos_url']}")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
