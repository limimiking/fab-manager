import React, { SelectHTMLAttributes } from 'react';
import Select from 'react-select';
import { Controller, Path } from 'react-hook-form';
import { Control } from 'react-hook-form/dist/types/form';
import { FieldValues } from 'react-hook-form/dist/types/fields';
import { FieldPath } from 'react-hook-form/dist/types/path';
import { FieldPathValue, UnpackNestedValue } from 'react-hook-form/dist/types';

interface FabSelectProps<TFieldValues, TContext extends object, TOptionValue> extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string,
  label?: string,
  className?: string,
  control: Control<TFieldValues, TContext>,
  placeholder?: string,
  options: Array<selectOption<TOptionValue>>,
  valueDefault?: TOptionValue,
}

/**
 * Option format, expected by react-select
 * @see https://github.com/JedWatson/react-select
 */
type selectOption<TOptionValue> = { value: TOptionValue, label: string };

/**
 * This component is a wrapper for react-select to use with react-hook-form
 */
export const FabSelect = <TFieldValues extends FieldValues, TContext extends object, TOptionValue>({ id, label, className, control, placeholder, options, valueDefault }: FabSelectProps<TFieldValues, TContext, TOptionValue>) => {
  return (
    <label className={`fab-select ${className || ''}`}>
      {label && <div className="fab-select-header">
        <p>{label}</p>
      </div>}
      <div className="fab-select-field">
        <Controller name={id as FieldPath<TFieldValues>}
                    control={control}
                    defaultValue={valueDefault as UnpackNestedValue<FieldPathValue<TFieldValues, Path<TFieldValues>>>}
                    render={({ field: { onChange, value, ref } }) =>
          <Select inputRef={ref}
                  className="fab-select-field-input"
                  value={options.find(c => c.value === value)}
                  onChange={val => onChange(val.value)}
                  placeholder={placeholder}
                  options={options} />
        } />
      </div>
    </label>
  );
};
