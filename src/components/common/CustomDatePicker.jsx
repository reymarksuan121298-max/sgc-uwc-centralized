import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { getLocalDateString } from '../../utils/dateFormatting';

const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

const DAY_NAMES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

export default function CustomDatePicker({
  label,
  value,
  onChange,
  placeholder = 'MM/DD/YYYY'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse current selected value or default to today
  const selectedDate = value ? new Date(`${value}T00:00:00`) : null;
  const initialDate = selectedDate && !isNaN(selectedDate.getTime()) ? selectedDate : new Date();

  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());

  // Sync view when value changes
  useEffect(() => {
    if (value) {
      const d = new Date(`${value}T00:00:00`);
      if (!isNaN(d.getTime())) {
        setCurrentYear(d.getFullYear());
        setCurrentMonth(d.getMonth());
      }
    }
  }, [value]);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Format value for display: MM/DD/YYYY (Month/Day/Year)
  const displayFormattedValue = () => {
    if (!value) return placeholder;
    try {
      const parts = value.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${year}`;
      }
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const year = d.getFullYear();
        return `${month}/${day}/${year}`;
      }
    } catch {
      return value;
    }
    return value;
  };

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (dayNum, isOtherMonth, otherMonthOffset = 0) => {
    let targetYear = currentYear;
    let targetMonth = currentMonth + otherMonthOffset;

    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    } else if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }

    const monthStr = String(targetMonth + 1).padStart(2, '0');
    const dayStr = String(dayNum).padStart(2, '0');
    const formattedIso = `${targetYear}-${monthStr}-${dayStr}`;

    onChange(formattedIso);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const handleToday = (e) => {
    e.stopPropagation();
    const today = new Date();
    const isoToday = getLocalDateString(today);
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    onChange(isoToday);
    setIsOpen(false);
  };

  // Generate calendar grid days (Monday = 0, Sunday = 6)
  const generateCalendarDays = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // JavaScript getDay(): 0 is Sunday, 1 is Monday... 6 is Saturday
    // Convert to Monday start: Monday=0, Tuesday=1 ... Sunday=6
    let startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

    const daysInMonth = lastDayOfMonth.getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Previous month overflow days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        monthOffset: -1
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        monthOffset: 0
      });
    }

    // Next month overflow days (fill to grid of 35 or 42)
    const totalSlots = days.length > 35 ? 42 : 35;
    const remainingSlots = totalSlots - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        monthOffset: 1
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  // Helper to check if day is selected
  const isDaySelected = (dayObj) => {
    if (!value || !dayObj.isCurrentMonth) return false;
    const parts = value.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return year === currentYear && month === currentMonth && day === dayObj.day;
    }
    return false;
  };

  return (
    <div className="relative inline-flex items-center gap-2.5 bg-white border border-blue-200/90 rounded-xl px-3 py-2 shadow-2xs hover:border-blue-300 transition-all" ref={containerRef}>
      {label && (
        <span className="text-[11px] font-black uppercase text-[#002B66] tracking-wider shrink-0 select-none">
          {label}:
        </span>
      )}

      {/* Date Trigger Input Box */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2.5 bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/80 rounded-lg px-2.5 py-1 text-xs font-mono font-black text-slate-800 transition-all cursor-pointer select-none min-w-[115px]"
      >
        <span>{displayFormattedValue()}</span>
        <CalendarIcon size={14} className="text-[#002B66] shrink-0" />
      </button>

      {/* Calendar Popover Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 w-[280px] text-slate-800 select-none animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header Month / Year Navigation */}
          <div className="flex items-center justify-between px-1 pb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-slate-100 text-[#002B66] rounded-lg transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="font-black uppercase tracking-wider text-xs text-[#002B66]">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-slate-100 text-[#002B66] rounded-lg transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Subtle Top Divider */}
          <div className="border-b border-blue-100 mb-2"></div>

          {/* Weekday Headers (MO TU WE TH FR SA SU) */}
          <div className="grid grid-cols-7 text-center mb-1">
            {DAY_NAMES.map((d) => (
              <span key={d} className="text-[11px] font-black text-blue-600 py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {calendarDays.map((dObj, idx) => {
              const selected = isDaySelected(dObj);

              return (
                <button
                  key={`${dObj.day}_${idx}`}
                  type="button"
                  onClick={() => handleSelectDay(dObj.day, !dObj.isCurrentMonth, dObj.monthOffset)}
                  className={`h-8 w-8 flex items-center justify-center mx-auto rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selected
                      ? 'bg-[#002B66] text-white font-black shadow-xs'
                      : dObj.isCurrentMonth
                        ? 'text-slate-800 hover:bg-blue-50 hover:text-[#002B66]'
                        : 'text-slate-300 hover:text-slate-500 font-medium'
                  }`}
                >
                  {dObj.day}
                </button>
              );
            })}
          </div>

          {/* Footer Actions: Clear & Today */}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 px-1">
            <button
              type="button"
              onClick={handleClear}
              className="text-blue-600 hover:text-blue-800 text-xs font-bold hover:underline cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="text-blue-600 hover:text-blue-800 text-xs font-bold hover:underline cursor-pointer"
            >
              Today
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
