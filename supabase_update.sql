-- Spusťte tento SQL příkaz ve vašem Supabase SQL Editoru pro přidání nového atributu "department" k existujícím zaměstnancům.

ALTER TABLE employees 
ADD COLUMN department VARCHAR(10) CHECK (department IN ('10000', '10001'));
