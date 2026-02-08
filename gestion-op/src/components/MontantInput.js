import React, { useState, useEffect } from 'react';

// ==================== COMPOSANT MONTANT AVEC SÉPARATEURS ====================
const MontantInput = ({ value, onChange, style, placeholder, disabled, ...rest }) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      const num = parseFloat(String(value).replace(/\s/g, '').replace(/,/g, '.'));
      if (!isNaN(num) && num !== 0) {
        setDisplayValue(new Intl.NumberFormat('fr-FR').format(num));
      } else if (value === '' || value === undefined || value === null) {
        setDisplayValue('');
      } else {
        setDisplayValue(String(value));
      }
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    const raw = String(value).replace(/\s/g, '');
    setDisplayValue(raw);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const cleaned = displayValue.replace(/\s/g, '').replace(/,/g, '.');
    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      onChange(String(num));
      setDisplayValue(new Intl.NumberFormat('fr-FR').format(num));
    } else if (displayValue === '') {
      onChange('');
      setDisplayValue('');
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setDisplayValue(val);
    const cleaned = val.replace(/\s/g, '').replace(/,/g, '.');
    if (cleaned === '' || cleaned === '-') {
      onChange(cleaned);
    } else {
      const num = parseFloat(cleaned);
      if (!isNaN(num)) {
        onChange(String(num));
      }
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={style}
      placeholder={placeholder || '0'}
      disabled={disabled}
      {...rest}
    />
  );
};

export default MontantInput;
