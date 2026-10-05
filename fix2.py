import re
import io

with io.open('src/components/EntryFormModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace calculateRowNetHours
old_calc = r"const calculateRowNetHours = \([\s\S]*?return Math\.max\(0, Math\.round\(\(diff / 60\) \* 10\) / 10\);\n\};"

new_calc = """const calculateRowNetHours = (
  start: string, 
  end: string, 
  breakMinutes: number
): number => {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
  
  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes < startMinutes) endMinutes += 24 * 60;
  let diff = endMinutes - startMinutes;

  diff -= breakMinutes;

  return Math.max(0, Math.round((diff / 60) * 10) / 10);
};"""

text = re.sub(old_calc, new_calc, text)

# We need to change the states in EntryFormModal.
# const [lunchBreak, setLunchBreak] = useState(true);
# const [lunchStart, setLunchStart] = useState('11:00');
# const [lunchEnd, setLunchEnd] = useState('11:30');
text = re.sub(
    r"const \[lunchBreak, setLunchBreak\] = useState\(true\);\s*const \[lunchStart, setLunchStart\] = useState\('11:00'\);\s*const \[lunchEnd, setLunchEnd\] = useState\('11:30'\);",
    r"const [breakMinutes, setBreakMinutes] = useState<number | null>(null);",
    text
)

# In useEffect when loading initialEntries:
# setLunchBreak((firstWithTime.breakMinutes ?? 30) > 0);
# if (firstWithTime.lunchTime && firstWithTime.lunchTime.includes('–')) { ... }
text = re.sub(
    r"setLunchBreak\(\(firstWithTime\.breakMinutes \?\? 30\) > 0\);\s*if \(firstWithTime\.lunchTime && firstWithTime\.lunchTime\.includes\('–'\)\) \{[\s\S]*?\}",
    r"setBreakMinutes(firstWithTime.breakMinutes ?? null);",
    text
)

# In the 'else' block for today:
# setLunchBreak(true);
# setLunchStart('11:00');
# setLunchEnd('11:30');
text = re.sub(
    r"setLunchBreak\(true\);\s*setLunchStart\('11:00'\);\s*setLunchEnd\('11:30'\);",
    r"setBreakMinutes(null);",
    text
)

with io.open('src/components/EntryFormModal.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Done phase 1")
