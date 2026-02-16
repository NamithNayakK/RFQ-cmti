import { useState, useRef, useEffect } from 'react';
import { FiChevronDown } from 'react-icons/fi';

export default function CustomSelect({ 
  id, 
  name, 
  value, 
  onChange, 
  disabled = false, 
  required = false,
  placeholder = 'Select an option...',
  options = [] 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (selectedValue) => {
    onChange({ target: { name, value: selectedValue } });
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-4 py-2 text-left border border-slate-300 rounded-lg bg-white hover:bg-slate-50 focus:ring-2 focus:ring-manufacturing-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-between"
      >
        <span className={value ? 'text-slate-900' : 'text-slate-500'}>
          {selectedLabel}
        </span>
        <FiChevronDown 
          size={18} 
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div 
          ref={menuRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg"
        >
          {/* Search Input */}
          <div className="p-2 border-b border-slate-200 sticky top-0 bg-white rounded-t-lg">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-manufacturing-primary"
            />
          </div>

          {/* Options List */}
          <ul className="max-h-64 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, idx) => (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full text-left px-4 py-2 hover:bg-manufacturing-primary/10 transition ${
                      value === option.value 
                        ? 'bg-manufacturing-primary/20 text-manufacturing-primary font-semibold' 
                        : 'text-slate-700'
                    }`}
                  >
                    {option.label}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-2 text-slate-500 text-sm">No results found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
