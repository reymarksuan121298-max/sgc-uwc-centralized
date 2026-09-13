import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

const COLOR_VARIANTS = {
  emerald: {
    btn: 'bg-emerald-50 hover:bg-emerald-100/70 border-emerald-300 text-emerald-800',
    btnText: 'text-emerald-800',
    selectedItem: 'bg-emerald-600 text-white',
    badge: 'bg-emerald-100 text-emerald-800 border border-emerald-300'
  },
  rose: {
    btn: 'bg-rose-50 hover:bg-rose-100/70 border-rose-300 text-rose-800',
    btnText: 'text-rose-800',
    selectedItem: 'bg-rose-600 text-white',
    badge: 'bg-rose-100 text-rose-800 border border-rose-300'
  },
  amber: {
    btn: 'bg-amber-50 hover:bg-amber-100/70 border-amber-300 text-amber-900',
    btnText: 'text-amber-900',
    selectedItem: 'bg-amber-600 text-white',
    badge: 'bg-amber-100 text-amber-900 border border-amber-300'
  },
  blue: {
    btn: 'bg-blue-50 hover:bg-blue-100/70 border-blue-300 text-[#002B66]',
    btnText: 'text-[#002B66]',
    selectedItem: 'bg-[#002B66] text-[#FFD700]',
    badge: 'bg-blue-100 text-blue-900 border border-blue-300'
  },
  navy: {
    btn: 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700',
    btnText: 'text-[#002B66]',
    selectedItem: 'bg-[#002B66] text-[#FFD700]',
    badge: 'bg-[#002B66]/10 text-[#002B66]'
  }
};

export default function ModernDropdown({
  label,
  icon: Icon,
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  searchable = false,
  align = 'left',
  size = 'md' // 'sm' | 'md'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize options to array of objects: { value, label, badge, badgeColor, subLabel, icon, color }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: opt, label: String(opt) };
    }
    return {
      value: opt.value !== undefined ? opt.value : opt.id,
      label: opt.label || opt.name || String(opt.value || opt.id || ''),
      badge: opt.badge,
      badgeColor: opt.badgeColor,
      subLabel: opt.subLabel,
      icon: opt.icon,
      color: opt.color
    };
  });

  // Find currently selected option
  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(value)
  ) || normalizedOptions[0];

  const activeColorKey = selectedOption?.color || 'navy';
  const colorStyle = COLOR_VARIANTS[activeColorKey] || COLOR_VARIANTS.navy;

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, searchable]);

  // Keyboard navigation (ESC to close)
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Filter options based on search query
  const filteredOptions = normalizedOptions.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.subLabel && opt.subLabel.toLowerCase().includes(q))
    );
  });

  const handleSelect = (optValue) => {
    onChange?.(optValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  const isSmall = size === 'sm';

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group flex items-center gap-2 border rounded-xl font-semibold shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer outline-none focus:ring-2 focus:ring-[#002B66]/20 focus:border-[#002B66] active:scale-[0.99] ${
          isSmall ? 'px-2.5 py-1.5 text-[11px]' : 'px-3.5 py-2 text-xs'
        } ${selectedOption?.color ? colorStyle.btn : 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-slate-300 text-slate-700'} ${
          isOpen ? 'ring-2 ring-[#002B66]/20 border-[#002B66]' : ''
        } ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {Icon && (
          <Icon
            size={isSmall ? 13 : 15}
            className={`${selectedOption?.color ? colorStyle.btnText : 'text-[#002B66]'} shrink-0 transition-transform duration-150 group-hover:scale-110`}
          />
        )}

        {label && (
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider shrink-0 select-none">
            {label}
          </span>
        )}

        <span className={`font-black truncate max-w-[200px] ${selectedOption?.color ? colorStyle.btnText : 'text-[#002B66]'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        {selectedOption?.badge && (
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded font-mono ${selectedOption.badgeColor || colorStyle.badge}`}>
            {selectedOption.badge}
          </span>
        )}

        <ChevronDown
          size={isSmall ? 12 : 14}
          className={`text-slate-400 group-hover:text-[#002B66] transition-transform duration-200 shrink-0 ml-0.5 ${
            isOpen ? 'rotate-180 text-[#002B66]' : ''
          }`}
        />
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-2 w-64 max-w-[90vw] bg-white rounded-2xl border border-blue-200/80 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top ${menuClassName}`}
          role="listbox"
        >
          {/* Header Accent Strip */}
          <div className="h-1 bg-gradient-to-r from-[#002B66] via-blue-700 to-[#FFD700]" />

          {/* Optional Search Bar */}
          {searchable && (
            <div className="p-2 border-b border-slate-100 bg-slate-50/70">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Filter options..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 pl-8 pr-3 py-1.5 text-xs rounded-lg outline-none focus:border-[#002B66] focus:ring-1 focus:ring-[#002B66] font-medium"
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="p-1.5 max-h-64 overflow-y-auto space-y-0.5 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                const ItemIcon = opt.icon;
                const itemColorKey = opt.color || 'navy';
                const itemStyle = COLOR_VARIANTS[itemColorKey] || COLOR_VARIANTS.navy;

                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                      isSelected
                        ? itemStyle.selectedItem + ' shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100/90 hover:text-[#002B66]'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {ItemIcon && (
                        <ItemIcon
                          size={14}
                          className={isSelected ? 'text-white' : 'text-slate-400 group-hover:text-[#002B66]'}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs">{opt.label}</div>
                        {opt.subLabel && (
                          <div
                            className={`text-[10px] font-medium truncate ${
                              isSelected ? 'text-white/80' : 'text-slate-400'
                            }`}
                          >
                            {opt.subLabel}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.badge && (
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded font-mono ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : opt.badgeColor || itemStyle.badge
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && (
                        <Check size={14} className="stroke-[3] shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-slate-400 text-xs font-medium">
                No matching options found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
