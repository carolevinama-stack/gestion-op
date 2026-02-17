import React from 'react';
import Select from 'react-select';

// ==================== COMPOSANT AUTOCOMPLETE ====================
const Autocomplete = ({ 
  options, 
  value, 
  onChange, 
  placeholder = 'Rechercher...', 
  isDisabled = false,
  isClearable = true,
  isMulti = false,
  noOptionsMessage = 'Aucun résultat',
  accentColor = '#0f4c3a'
}) => {
  const customStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      borderRadius: 8,
      border: state.isFocused ? `2px solid ${accentColor}` : '2px solid #e9ecef',
      boxShadow: 'none',
      '&:hover': { borderColor: accentColor },
      background: isDisabled ? '#f8f9fa' : 'white',
      cursor: isDisabled ? 'not-allowed' : 'pointer'
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '2px 12px'
    }),
    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0
    }),
    placeholder: (base) => ({
      ...base,
      color: '#adb5bd'
    }),
    singleValue: (base) => ({
      ...base,
      color: '#333'
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: `${accentColor}15`,
      borderRadius: 6,
      border: `1px solid ${accentColor}30`
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: accentColor,
      fontWeight: 600,
      fontSize: 12,
      padding: '3px 6px'
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: accentColor,
      cursor: 'pointer',
      '&:hover': { backgroundColor: `${accentColor}30`, color: '#dc3545' }
    }),
    menu: (base) => ({
      ...base,
      borderRadius: 8,
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      zIndex: 9999,
      overflow: 'hidden'
    }),
    menuList: (base) => ({
      ...base,
      padding: 0,
      maxHeight: 250
    }),
    option: (base, state) => ({
      ...base,
      padding: '10px 14px',
      cursor: 'pointer',
      backgroundColor: state.isSelected ? accentColor : state.isFocused ? `${accentColor}15` : 'white',
      color: state.isSelected ? 'white' : '#333',
      '&:active': { backgroundColor: `${accentColor}30` }
    }),
    noOptionsMessage: (base) => ({
      ...base,
      color: '#6c757d',
      padding: '16px'
    }),
    clearIndicator: (base) => ({
      ...base,
      cursor: 'pointer',
      color: '#adb5bd',
      '&:hover': { color: '#dc3545' }
    }),
    dropdownIndicator: (base) => ({
      ...base,
      cursor: 'pointer',
      color: '#adb5bd',
      '&:hover': { color: accentColor }
    })
  };

  return (
    <Select
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      isDisabled={isDisabled}
      isClearable={isClearable}
      isSearchable={true}
      isMulti={isMulti}
      noOptionsMessage={() => noOptionsMessage}
      styles={customStyles}
      filterOption={(option, inputValue) => {
        if (!inputValue) return true;
        const search = inputValue.toLowerCase();
        const label = (option.label || '').toLowerCase();
        const searchFields = option.data?.searchFields || [];
        
        if (label.includes(search)) return true;
        return searchFields.some(field => field?.toLowerCase().includes(search));
      }}
    />
  );
};

export default Autocomplete;
