import re
import io

with io.open('src/components/LiveTimeTracker.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace calculateSessionHours
old_calc_regex = r"export const calculateSessionHours = \([\s\S]*?return Math\.max\(0\.1, hours\);\n\};"

new_calc = """export const calculateSessionHours = (
  start: string,
  end: string,
  activityType: WorkType,
  breakMinutesOverride: number | null = null
): { hours: number, appliedBreak: number } => {
  if (!start || !end) return { hours: 0.1, appliedBreak: 0 };
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return { hours: 0.1, appliedBreak: 0 };

  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  let diff = endMinutes - startMinutes;
  let appliedBreak = 0;

  if (activityType === WorkType.REGULAR) {
    if (breakMinutesOverride !== null) {
      appliedBreak = breakMinutesOverride;
    } else {
      if (diff > 270) {
        appliedBreak = 30;
      }
    }
    diff -= appliedBreak;
  }

  const hours = Math.round((diff / 60) * 10) / 10;
  return { hours: Math.max(0.1, hours), appliedBreak };
};"""

text = re.sub(old_calc_regex, new_calc, text)

# Replace the calls
text = re.sub(r'const hours = calculateSessionHours\([^)]+\);', 
    r'''const { hours, appliedBreak } = calculateSessionHours(
      startTimeStr,
      endTimeStr,
      activeSession.activityType,
      activeSession.hasLunchDeduction ?? deductLunch ? null : 0
    );''', text)

text = re.sub(r'breakMinutes: \(activeSession\.activityType === WorkType\.REGULAR && activeSession\.hasLunchDeduction\) \? 30 : 0,',
    r'breakMinutes: appliedBreak,', text)

text = re.sub(r"lunchTime: \(activeSession\.activityType === WorkType\.REGULAR && activeSession\.hasLunchDeduction\) \? '11:00 – 11:30' : undefined",
    r"lunchTime: appliedBreak > 0 ? `Automaticky ${appliedBreak} min` : undefined", text)

text = re.sub(r'const prevNewHours = calculateSessionHours\([\s\S]*?\(prevEntry\.breakMinutes \|\| 0\) > 0\s*\);',
    r'''const { hours: prevNewHours } = calculateSessionHours(
          prevEntry.startTime || formatted,
          formatted,
          prevEntry.type,
          prevEntry.breakMinutes || 0
        );''', text, count=1)

text = re.sub(r'const newHours = calculateSessionHours\([\s\S]*?editingEntry\.breakMinutes \? editingEntry\.breakMinutes > 0 : true\s*\);',
    r'''const { hours: newHours } = calculateSessionHours(
        editStartTime,
        editEndTime,
        editType,
        editingEntry.breakMinutes != null ? editingEntry.breakMinutes : null
      );''', text)

text = re.sub(r'const nextNewHours = calculateSessionHours\([\s\S]*?\(nextEntry\.breakMinutes \|\| 0\) > 0\s*\);',
    r'''const { hours: nextNewHours } = calculateSessionHours(
              editEndTime,
              nextEntry.endTime,
              nextEntry.type,
              nextEntry.breakMinutes || 0
            );''', text)

text = re.sub(r'const prevNewHours = calculateSessionHours\([\s\S]*?\(prevEntry\.breakMinutes \|\| 0\) > 0\s*\);',
    r'''const { hours: prevNewHours } = calculateSessionHours(
              prevEntry.startTime,
              editStartTime,
              prevEntry.type,
              prevEntry.breakMinutes || 0
            );''', text)

text = re.sub(r'return calculateSessionHours\([\s\S]*?activeSession\.hasLunchDeduction \?\? deductLunch\s*\);',
    r'''return calculateSessionHours(
        activeSession.startTimeStr,
        currentTimeStr,
        activeSession.activityType,
        activeSession.hasLunchDeduction ?? deductLunch ? null : 0
      ).hours;''', text)

with io.open('src/components/LiveTimeTracker.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Done")
