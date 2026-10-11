import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { getLocalDateString } from '../../utils/dateFormatting';

const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

const DAY_NAMES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

export default function InstallmentDatePicker({
  value,
  onChange,
  isFirst = false,
  frequency = 'weekly',
  openUpward = false,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse current selected date
  const selectedDate = value ? new Date(`${value}T00:00:00`) : null;
  const initialDate = selectedDate && !isNaN(selectedDate.getTime()) ? selectedDate : new Date();

  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());

  // Sync year/month when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(`${value}T00:00:00`);
      if (!isNaN(d.getTime())) {
        setCurrentYear(d.getFullYear());
        setCurrentMonth(d.getMonth());
      }
    }
  }, [value]);

  // Handle outside click & Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Format MM/DD/YYYY for display
  const displayFormattedValue = () => {
    if (!value) return 'Set Date';
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
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (dayNum, isOtherMonth = false, otherMonthOffset = 0) => {
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

  // Quick preset shortcuts
  const handleSetToday = (e) => {
    e.stopPropagation();
    const today = new Date();
    const iso = getLocalDateString(today);
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    onChange(iso);
    setIsOpen(false);
  };

  const handleSet15th = (e) => {
    e.stopPropagation();
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    onChange(`${currentYear}-${monthStr}-15`);
    setIsOpen(false);
  };

  const handleSet30th = (e) => {
    e.stopPropagation();
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const targetDay = String(Math.min(30, lastDay)).padStart(2, '0');
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    onChange(`${currentYear}-${monthStr}-${targetDay}`);
    setIsOpen(false);
  };

  const handleAddDays = (e, days) => {
    e.stopPropagation();
    const base = value ? new Date(`${value}T00:00:00`) : new Date();
    base.setDate(base.getDate() + days);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    setCurrentYear(y);
    setCurrentMonth(base.getMonth());
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  // Generate calendar grid (Monday = 0, Sunday = 6)
  const generateCalendarDays = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInMonth = lastDayOfMonth.getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Prev month overflow
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        monthOffset: -1
      });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        monthOffset: 0
      });
    }

    // Next month overflow
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

  const isDayToday = (dayObj) => {
    if (!dayObj.isCurrentMonth) return false;
    const today = new Date();
    return (
      today.getFullYear() === currentYear &&
      today.getMonth() === currentMonth &&
      today.getDate() === dayObj.day
    );
  };

  return (
    <div className="relative inline-flex items-center justify-center w-full" ref={containerRef}>
      {/* PRINT-ONLY CLEAN DISPLAY */}
      <span className="hidden print:inline font-mono font-bold text-xs text-slate-900">
        {displayFormattedValue()}
      </span>

      {/* SCREEN INTERACTIVE TRIGGER */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        title="Select due date"
        className={`print:hidden group inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer select-none outline-none bg-white hover:bg-blue-50/70 text-slate-800 border border-slate-200/90 hover:border-blue-300 hover:text-[#002B66] ${
          isOpen ? 'ring-2 ring-[#002B66]/30 border-[#002B66]' : ''
        }`}
      >
        <CalendarIcon
          size={12}
          className="text-slate-400 group-hover:text-[#002B66] shrink-0"
        />
        <span className="truncate">{displayFormattedValue()}</span>
      </button>

      {/* CUSTOM POPOVER CALENDAR */}
      {isOpen && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 z-50 ${
            openUpward ? 'bottom-full mb-1.5 origin-bottom' : 'top-full mt-1.5 origin-top'
          } w-[270px] bg-white border border-blue-200 rounded-2xl shadow-2xl p-3 text-slate-800 select-none animate-in fade-in zoom-in-95 duration-150 print:hidden`}
        >
          {/* Top Gold & Navy Accent Line */}
          <div className="h-1 bg-gradient-to-r from-[#002B66] via-blue-700 to-[#FFD700] rounded-t-xl -mt-3 -mx-3 mb-2.5" />

          {/* Month & Year Navigation Header */}
          <div className="flex items-center justify-between px-1 pb-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-slate-100 text-[#002B66] rounded-lg transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft size={15} />
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
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Quick Action Preset Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-blue-100/70 mb-2 pt-0.5 custom-scrollbar">
            <button
              type="button"
              onClick={handleSetToday}
              className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-[#002B66] transition-colors shrink-0 cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={(e) => handleAddDays(e, 7)}
              className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-[#002B66] transition-colors shrink-0 cursor-pointer"
            >
              +7 Days
            </button>
            {(frequency === 'semi-monthly' || frequency === '15_30') && (
              <>
                <button
                  type="button"
                  onClick={handleSet15th}
                  className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors shrink-0 cursor-pointer"
                >
                  15th
                </button>
                <button
                  type="button"
                  onClick={handleSet30th}
                  className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors shrink-0 cursor-pointer"
                >
                  30th
                </button>
              </>
            )}
          </div>

          {/* Weekday Headers (MO TU WE TH FR SA SU) */}
          <div className="grid grid-cols-7 text-center mb-1">
            {DAY_NAMES.map((d) => (
              <span key={d} className="text-[10px] font-black text-blue-600 py-0.5">
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((dayObj, idx) => {
              const selected = isDaySelected(dayObj);
              const today = isDayToday(dayObj);

              let btnClass = 'text-slate-700 hover:bg-slate-100 font-bold';

              if (!dayObj.isCurrentMonth) {
                btnClass = 'text-slate-300 hover:bg-slate-50 font-normal';
              } else if (selected) {
                btnClass = 'bg-[#002B66] text-[#FFD700] font-black shadow-xs ring-2 ring-amber-300';
              } else if (today) {
                btnClass = 'border border-blue-400 text-[#002B66] font-black bg-blue-50/50';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectDay(dayObj.day, !dayObj.isCurrentMonth, dayObj.monthOffset);
                  }}
                  className={`w-7 h-7 mx-auto flex items-center justify-center rounded-lg text-xs font-mono transition-all cursor-pointer ${btnClass}`}
                >
                  {dayObj.day}
                </button>
              );
            })}
          </div>

          {/* Footer Close */}
          <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-medium">Click outside to close</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="text-[#002B66] font-bold hover:underline cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
