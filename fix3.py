import re
import io

with io.open('src/components/EntryFormModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace getTimeWhenHoursReached
text = re.sub(
    r"const getTimeWhenHoursReached = \([\s\S]*?return `\$\{String\(eh\)\.padStart\(2, '0'\)\}:\$\{String\(em\)\.padStart\(2, '0'\)\}`;[\s]*\};",
    r"""const getTimeWhenHoursReached = (
  start: string,
  targetHours: number,
  breakMinutes: number
): string => {
  if (!start || targetHours <= 0) return start || '06:30';
  const [sh, sm] = start.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm)) return '06:30';

  const startMinutes = sh * 60 + sm;
  const targetMinutes = Math.round(targetHours * 60);

  const endMinutes = Math.min(23 * 60 + 59, startMinutes + targetMinutes + breakMinutes);
  const eh = Math.floor(endMinutes / 60);
  const em = endMinutes % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
};""", text)

# Helper for getting applied break
text = re.sub(r'const getDefaultJobId', r'''const getAppliedBreak = (start: string, end: string, isWork: boolean) => {
    if (!isWork) return 0;
    if (breakMinutes !== null) return breakMinutes;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
    let smins = sh * 60 + sm;
    let emins = eh * 60 + em;
    if (emins < smins) emins += 24 * 60;
    return (emins - smins > 270) ? 30 : 0;
  };

  const getDefaultJobId''', text)

# Replace usage of calculateRowNetHours
# old: const newHours = calculateRowNetHours(start, end, lunchBreak, lunchStart, lunchEnd);
# or similar... we need to find it.
text = re.sub(
    r"const newHours = calculateRowNetHours\([^)]+\);",
    r"const appliedB = getAppliedBreak(start || '', end || '', r.type === WorkType.REGULAR || r.type === WorkType.OVERTIME);\n        const newHours = calculateRowNetHours(start || '', end || '', appliedB);",
    text
)

text = re.sub(
    r"const targetTime = getTimeWhenHoursReached\(start, hrs, lunchBreak, lunchStart, lunchEnd\);",
    r"const appliedB = getAppliedBreak(start || '', '23:59', r.type === WorkType.REGULAR || r.type === WorkType.OVERTIME);\n        const targetTime = getTimeWhenHoursReached(start || '', hrs, appliedB);",
    text
)

# in onSubmit:
# breakMinutes: (e.type === WorkType.REGULAR || e.type === WorkType.OVERTIME) && lunchBreak ? 30 : 0,
# lunchTime: (e.type === WorkType.REGULAR || e.type === WorkType.OVERTIME) && lunchBreak ? `${lunchStart} – ${lunchEnd}` : undefined
text = re.sub(
    r"breakMinutes: \(e\.type === WorkType\.REGULAR \|\| e\.type === WorkType\.OVERTIME\) && lunchBreak \? 30 : 0,\s*lunchTime: \(e\.type === WorkType\.REGULAR \|\| e\.type === WorkType\.OVERTIME\) && lunchBreak \? `\$\{lunchStart\} – \$\{lunchEnd\}` : undefined",
    r"breakMinutes: getAppliedBreak(e.startTime, e.endTime, e.type === WorkType.REGULAR || e.type === WorkType.OVERTIME),\n          lunchTime: getAppliedBreak(e.startTime, e.endTime, e.type === WorkType.REGULAR || e.type === WorkType.OVERTIME) > 0 ? `Automaticky ${getAppliedBreak(e.startTime, e.endTime, e.type === WorkType.REGULAR || e.type === WorkType.OVERTIME)} min` : undefined",
    text
)

# Replace the UI for lunch
lunch_ui_regex = r"\{hasWorkHours && \([\s\S]*?\{/\* PŘIDÁNÍ DALŠÍHO ŘÁDKU \*/\}"
new_lunch_ui = """{hasWorkHours && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                  <span>☕ Přestávka (minut):</span>
                </label>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Pokud je čas > 4,5 h, aplikuje se automaticky 30 min. (Prázdné = automatika)
                </p>
              </div>
              <div className="w-24">
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={breakMinutes === null ? '' : breakMinutes}
                  onChange={(e) => setBreakMinutes(e.target.value === '' ? null : parseInt(e.target.value) || 0)}
                  placeholder="Auto (30)"
                  className="w-full border-slate-300 rounded-lg text-sm text-center"
                />
              </div>
            </div>
          )}

          {/* PŘIDÁNÍ DALŠÍHO ŘÁDKU */}"""

text = re.sub(r"\{hasWorkHours && \([\s\S]*?\{/\* PŘIDÁNÍ DALŠÍHO ŘÁDKU \*/\}", new_lunch_ui, text)


with io.open('src/components/EntryFormModal.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Done phase 2")
