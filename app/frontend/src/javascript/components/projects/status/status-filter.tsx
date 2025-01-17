import React, { useState, useEffect } from 'react';
import { react2angular } from 'react2angular';
import Select from 'react-select';
import { useTranslation } from 'react-i18next';
import StatusAPI from '../../../api/status';
import { IApplication } from '../../../models/application';
import { SelectOption } from '../../../models/select';
import { Loader } from '../../base/loader';
import { Status } from '../../../models/status';

declare const Application: IApplication;

interface StatusFilterProps {
  currentStatusIndex: number,
  onFilterChange: (status: Status) => void,
  onError: (message: string) => void
}

/**
 * Implement filtering projects by their status
*/
export const StatusFilter: React.FC<StatusFilterProps> = ({ currentStatusIndex, onError, onFilterChange }) => {
  const { t } = useTranslation('public');
  const defaultValue = { value: null, label: t('app.public.status_filter.all_statuses') };
  const [statusesList, setStatusesList] = useState<Array<Status>>([]);
  const [currentOption, setCurrentOption] = useState<SelectOption<number>>(defaultValue);

  /**
  * From the statusesList (retrieved from API) and a default Value, generates an Array of options conform to react-select
  */
  const buildOptions = (): Array<SelectOption<number, string>> => {
    const apiStatusesList = statusesList.map(status => {
      return { value: status.id, label: status.name };
    });
    return [defaultValue, ...apiStatusesList];
  };

  /**
  * On component mount, asynchronously load the full list of statuses
  * Converts name property into label property, since a SelectOption needs a label
  */
  useEffect(() => {
    StatusAPI.index()
      .then((data) => {
        setStatusesList(data);
      }).catch(onError);
  }, []);

  // If currentStatusIndex is provided and match a status, set currentOption accordingly
  useEffect(() => {
    const selectedStatus = statusesList.find((status) => status.id === currentStatusIndex);
    if (selectedStatus) {
      setCurrentOption({ value: selectedStatus.id, label: selectedStatus.name });
    }
  }, [currentStatusIndex, statusesList]);

  /**
  * Callback triggered when the admin selects a status in the dropdown list
  */
  const handleStatusSelected = (option: SelectOption<number>): void => {
    onFilterChange({ id: option.value, name: option.label });
    setCurrentOption(option);
  };

  const selectStyles = {
    control: (baseStyles, state) => ({
      ...baseStyles,
      boxShadow: state.isFocused ? 'inset 0 1px 1px rgba(0, 0, 0, 0.075), 0 0 8px rgba(253, 222, 63, 0.6);' : 'grey',
      border: state.isFocused ? '1px solid #fdde3f' : '1px solid #c4c4c4',
      color: '#555555',
      '&:hover': {
        borderColor: state.isFocused ? '#fdde3f' : '#c4c4c4'
      }
    }),
    singleValue: (baseStyles) => ({
      ...baseStyles,
      color: '#555555'
    })
  };

  return (
    <div>
      {statusesList.length !== 0 &&
      <Select defaultValue={currentOption}
        value={currentOption}
        id="status"
        className="status-select"
        onChange={handleStatusSelected}
        options={buildOptions()}
        styles={selectStyles}
        aria-label={t('app.public.status_filter.select_status')}/>
      }
    </div>
  );
};

const StatusFilterWrapper: React.FC<StatusFilterProps> = (props) => {
  return (
    <Loader>
      <StatusFilter {...props} />
    </Loader>
  );
};

Application.Components.component('statusFilter', react2angular(StatusFilterWrapper, ['currentStatusIndex', 'onError', 'onFilterChange']));
