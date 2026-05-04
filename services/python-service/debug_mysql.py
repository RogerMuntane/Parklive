from models.db_connection import get_new_connection

def debug_valoracions():
    conn = get_new_connection()
    if not conn:
        print("Failed to connect to DB")
        return
    
    cursor = conn.cursor(dictionary=True)
    try:
        print("Testing SELECT from valoracions...")
        cursor.execute("SELECT * FROM valoracions LIMIT 1")
        row = cursor.fetchone()
        print(f"Row found: {row}")
        
        print("\nChecking columns in valoracions...")
        cursor.execute("DESCRIBE valoracions")
        columns = cursor.fetchall()
        for col in columns:
            print(col)
            
    except Exception as e:
        print(f"MySQL Error: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    debug_valoracions()
