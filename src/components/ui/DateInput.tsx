import React, { forwardRef, useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Calendar } from 'lucide-react';
import { format, parse } from 'date-fns';

export interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  onChange?: (value: string) => void; // yyyy-MM-dd
  value?: string; // yyyy-MM-dd
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      className,
      id,
      onChange,
      value, // value is yyyy-MM-dd
      ...props
    },
    ref
  ) => {
    const inputId = id || `date-input-${Math.random().toString(36).substring(2, 11)}`;
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
      if (value) {
        try {
          const date = parse(value, 'yyyy-MM-dd', new Date());
          setDisplayValue(format(date, 'dd/MM/yyyy'));
        } catch (e) {
          setDisplayValue(value); // fallback to raw value on parse error
        }
      } else {
        setDisplayValue('');
      }
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let input = e.target.value.replace(/\D/g, '');
      if (input.length > 8) {
        input = input.slice(0, 8);
      }

      let formattedInput = '';
      if (input.length > 4) {
        formattedInput = `${input.slice(0, 2)}/${input.slice(2, 4)}/${input.slice(4)}`;
      } else if (input.length > 2) {
        formattedInput = `${input.slice(0, 2)}/${input.slice(2)}`;
      } else {
        formattedInput = input;
      }
      
      setDisplayValue(formattedInput);

      if (formattedInput.length === 10) {
        try {
          const date = parse(formattedInput, 'dd/MM/yyyy', new Date());
          if (!isNaN(date.getTime())) {
            onChange?.(format(date, 'yyyy-MM-dd'));
          }
        } catch (error) {
          // Not a valid date yet
        }
      }
    };
    
    const handleBlur = () => {
        try {
            const date = parse(displayValue, 'dd/MM/yyyy', new Date());
            if (isNaN(date.getTime())) {
                setDisplayValue('');
                onChange?.('');
            }
        } catch (error) {
            setDisplayValue('');
            onChange?.('');
        }
    }

    const baseInputClasses = 'block px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors';
    const errorInputClasses = 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500';

    return (
      <div className={clsx('flex flex-col', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Calendar className="h-4 w-4 text-gray-400" />
          </div>
          
          <input
            ref={ref}
            id={inputId}
            type="text" // Changed to text
            placeholder="dd/mm/aaaa"
            className={clsx(
              baseInputClasses,
              error && errorInputClasses,
              'pl-10',
              fullWidth && 'w-full',
              className
            )}
            value={displayValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            {...props}
          />
        </div>
        
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

DateInput.displayName = 'DateInput';