-- AKTUALIZAČNÍ SKRIPT PRO SUPABASE (SQL EDITOR)
-- Tento skript rozšíří vaši stávající databázi o střediska a evidenci příchodů/odchodů (dle inspektorátu práce).

-- 1. Přidání střediska pro zaměstnance (10000 nebo 10001)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS department VARCHAR(10) CHECK (department IN ('10000', '10001'));

-- Nastavení výchozího střediska pro stávající zaměstnance (nepovinné, např. 10000):
UPDATE employees SET department = '10000' WHERE department IS NULL;

-- 2. Přidání evidence začátku, konce pracovní doby a přestávky na oběd (pro inspektorát práce):
ALTER TABLE time_entries 
ADD COLUMN IF NOT EXISTS start_time VARCHAR(10),
ADD COLUMN IF NOT EXISTS end_time VARCHAR(10),
ADD COLUMN IF NOT EXISTS break_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS lunch_time VARCHAR(30);
