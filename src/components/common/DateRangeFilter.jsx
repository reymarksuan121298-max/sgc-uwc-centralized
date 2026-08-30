import CustomDatePicker from './CustomDatePicker';

export default function DateRangeFilter({
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  className = ''
}) {
  return (
    <div className={`flex flex-wrap items-center gap-3 sm:gap-4 bg-slate-50/80 border border-slate-200/90 px-3.5 py-2 rounded-xl shadow-2xs ${className}`}>
      <CustomDatePicker
        label="DATE FROM"
        value={fromDate}
        onChange={setFromDate}
      />
      <CustomDatePicker
        label="DATE TO"
        value={toDate}
        onChange={setToDate}
      />
    </div>
  );
}
