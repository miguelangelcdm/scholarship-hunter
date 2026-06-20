import sqlite3
import os

def upgrade_db():
    db_path = os.path.join(os.path.dirname(__file__), 'scholarships.db')
    if not os.path.exists(db_path):
        print("No database found, nothing to migrate.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    new_columns = [
        ("details", "TEXT"),
        ("steps", "TEXT"),
        ("important_info", "TEXT"),
        ("next_steps", "TEXT"),
        ("desire_score", "FLOAT DEFAULT 0.0"),
        ("probability_score", "FLOAT DEFAULT 0.0")
    ]
    
    for col_name, col_type in new_columns:
        try:
            cursor.execute(f"ALTER TABLE target_programs ADD COLUMN {col_name} {col_type}")
            print(f"Successfully added column '{col_name}' to target_programs.")
        except sqlite3.OperationalError as e:
            print(f"Skipping '{col_name}': {e}")
            
    conn.commit()
    conn.close()
    print("Database migration complete.")

if __name__ == '__main__':
    upgrade_db()
