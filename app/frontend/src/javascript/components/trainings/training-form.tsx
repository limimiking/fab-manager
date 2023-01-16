import { useEffect, useState } from 'react';
import * as React from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FormInput } from '../form/form-input';
import { FormImageUpload } from '../form/form-image-upload';
import { IApplication } from '../../models/application';
import { Loader } from '../base/loader';
import { react2angular } from 'react2angular';
import { ErrorBoundary } from '../base/error-boundary';
import { FormRichText } from '../form/form-rich-text';
import { FormSwitch } from '../form/form-switch';
import { FabButton } from '../base/fab-button';
import { Training } from '../../models/training';
import TrainingAPI from '../../api/training';
import { FormMultiSelect } from '../form/form-multi-select';
import MachineAPI from '../../api/machine';
import { Machine } from '../../models/machine';
import { SelectOption } from '../../models/select';
import SettingAPI from '../../api/setting';
import { Setting } from '../../models/setting';
import { AdvancedAccountingForm } from '../accounting/advanced-accounting-form';
import { FabAlert } from '../base/fab-alert';

declare const Application: IApplication;

interface TrainingFormProps {
  action: 'create' | 'update',
  training?: Training,
  onError: (message: string) => void,
  onSuccess: (message: string) => void,
}

/**
 * Form to edit or create trainings
 */
export const TrainingForm: React.FC<TrainingFormProps> = ({ action, training, onError, onSuccess }) => {
  const { t } = useTranslation('admin');

  const [machineModule, setMachineModule] = useState<Setting>(null);
  const [isActiveCancellation, setIsActiveCancellation] = useState<boolean>(false);
  const [isActiveTextBlock, setIsActiveTextBlock] = useState<boolean>(false);
  const [isActiveCta, setIsActiveCta] = useState<boolean>(false);
  const [isActiveAccounting, setIsActiveAccounting] = useState<boolean>(false);
  const { handleSubmit, register, control, setValue, formState } = useForm<Training>({ defaultValues: { ...training } });
  const output = useWatch<Training>({ control });

  useEffect(() => {
    SettingAPI.get('machines_module').then(setMachineModule).catch(onError);
    SettingAPI.get('advanced_accounting').then(res => setIsActiveAccounting(res.value === 'true')).catch(onError);
  }, []);

  /**
   * Callback triggered when the user validates the machine form: handle create or update
   */
  const onSubmit: SubmitHandler<Training> = (data: Training) => {
    TrainingAPI[action](data).then((res) => {
      onSuccess(t(`app.admin.training_form.${action}_success`));
      window.location.href = `/#!/trainings/${res.slug}`;
    }).catch(error => {
      onError(error);
    });
  };

  /**
   * Convert a machine to an option usable by react-select
   */
  const machineToOption = (machine: Machine): SelectOption<number> => {
    return { value: machine.id, label: machine.name };
  };

  /**
   * Asynchronously load the full list of enabled machines to display in the drop-down select field
   */
  const loadMachines = (inputValue: string, callback: (options: Array<SelectOption<number>>) => void): void => {
    MachineAPI.index({ disabled: false }).then(data => {
      callback(data.map(m => machineToOption(m)));
    }).catch(error => onError(error));
  };

  /**
   * Callback triggered when the auto cancellation switch has changed.
   */
  const toggleCancellationSwitch = (value: boolean) => {
    setIsActiveCancellation(value);
  };

  /**
   * Callback triggered when the text block switch has changed.
   */
  const toggleTextBlockSwitch = (value: boolean) => {
    setIsActiveTextBlock(value);
  };

  /**
   * Callback triggered when the CTA switch has changed.
  */
  const toggleTextBlockCta = (value: boolean) => {
    setIsActiveCta(value);
  };

  /**
   * Callback triggered when the CTA label has changed.
  */
  const handleCtaLabelChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    console.log('cta label:', event.target.value);
  };
  /**
   * Callback triggered when the cta url has changed.
   */
  const handleCtaUrlChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    console.log('cta url:', event.target.value);
  };

  // regular expression to validate the input fields
  const urlRegex = /^(https?:\/\/)([^.]+)\.(.{2,30})(\/.*)*\/?$/;

  return (
    <div className="training-form">
      <header>
        <h2>{t('app.admin.training_form.ACTION_title', { ACTION: action })}</h2>
        <FabButton onClick={handleSubmit(onSubmit)} className="fab-button save-btn is-main">
          {t('app.admin.training_form.save')}
        </FabButton>
      </header>
      <form className='training-form-content'>
        {action === 'create' &&
          <FabAlert level='warning'>
            {t('app.admin.training_form.beware_when_creating_a_training_its_reservation_prices_are_initialized_to_zero')} {t('app.admin.training_form.dont_forget_to_change_them_before_creating_slots_for_this_training')}
          </FabAlert>
        }
        <section>
          <header>
            <p className="title">{t('app.admin.training_form.description')}</p>
          </header>
          <div className="content">
            <FormInput register={register} id="name"
                       formState={formState}
                       rules={{ required: true }}
                       label={t('app.admin.training_form.name')} />
            <FormImageUpload setValue={setValue}
                             register={register}
                             control={control}
                             formState={formState}
                             rules={{ required: true }}
                             id="training_image_attributes"
                             accept="image/*"
                             defaultImage={output.training_image_attributes}
                             label={t('app.admin.training_form.illustration')} />
            <FormRichText control={control}
                          id="description"
                          rules={{ required: true }}
                          label={t('app.admin.training_form.description')}
                          limit={null}
                          heading bulletList blockquote link />
          </div>
        </section>

        <section>
          <header>
            <p className="title">{t('app.admin.training_form.settings')}</p>
          </header>
          <div className="content">
            {machineModule?.value === 'true' &&
              <FormMultiSelect control={control}
                              id="machine_ids"
                              formState={formState}
                              label={t('app.admin.training_form.associated_machines')}
                              tooltip={t('app.admin.training_form.associated_machines_help')}
                              loadOptions={loadMachines} />
            }
            <FormInput register={register}
                    type="number"
                    id="nb_total_places"
                    formState={formState}
                    nullable
                    label={t('app.admin.training_form.default_seats')} />
            <FormSwitch control={control}
                        id="public_page"
                        defaultValue={true}
                        label={t('app.admin.training_form.public_page')}
                        tooltip={t('app.admin.training_form.public_help')} />
            <FormSwitch control={control}
                        id="disabled"
                        label={t('app.admin.training_form.disable_training')}
                        tooltip={t('app.admin.training_form.disabled_help')} />
          </div>
        </section>

        <section>
          <header>
            <p className="title">{t('app.admin.training_form.automatic_cancellation')}</p>
            <p className="description">{t('app.admin.training_form.automatic_cancellation_info')}</p>
          </header>
          <div className="content">
            <FormSwitch id="active_cancellation" control={control}
              onChange={toggleCancellationSwitch} formState={formState}
              defaultValue={isActiveCancellation}
              label={t('app.admin.training_form.automatic_cancellation_switch')} />
            {isActiveCancellation && <>
              <FormInput register={register}
                        type="number"
                        step={1}
                        id="auto_cancellation_threshold"
                        formState={formState}
                        rules={{ required: isActiveCancellation }}
                        nullable
                        label={t('app.admin.training_form.automatic_cancellation_threshold')} />
              <FormInput register={register}
                        type="number"
                        step={1}
                        id="auto_cancellation_deadline"
                        formState={formState}
                        rules={{ required: isActiveCancellation }}
                        nullable
                        label={t('app.admin.training_form.automatic_cancellation_deadline')} />
            </>}
          </div>

        </section>

        <section>
          <header>
            <p className="title">{t('app.admin.training_form.generic_text_block')}</p>
            <p className="description">{t('app.admin.training_form.generic_text_block_info')}</p>
          </header>

          <div className="content">
            <FormSwitch id="active_text_block" control={control}
              onChange={toggleTextBlockSwitch} formState={formState}
              defaultValue={isActiveTextBlock}
              label={t('app.admin.training_form.generic_text_block_switch')} />

            <FormRichText id="text_block"
                          control={control}
                          heading
                          limit={280}
                          disabled={!isActiveTextBlock} />

            {isActiveTextBlock && <>
              <FormSwitch id="active_cta" control={control}
                onChange={toggleTextBlockCta} formState={formState}
                label={t('app.admin.training_form.cta_switch')} />

              {isActiveCta && <>
                <FormInput id="cta_label"
                          register={register}
                          rules={{ required: true }}
                          onChange={handleCtaLabelChange}
                          maxLength={40}
                          label={t('app.admin.training_form.cta_label')} />
                <FormInput id="cta_url"
                          register={register}
                          rules={{ required: true, pattern: urlRegex }}
                          onChange={handleCtaUrlChange}
                          label={t('app.admin.training_form.cta_url')} />
              </>}
            </>}
          </div>
        </section>

        {isActiveAccounting &&
          <section>
            <AdvancedAccountingForm register={register} onError={onError} />
          </section>
        }
      </form>
    </div>
  );
};

const TrainingFormWrapper: React.FC<TrainingFormProps> = (props) => {
  return (
    <Loader>
      <ErrorBoundary>
        <TrainingForm {...props} />
      </ErrorBoundary>
    </Loader>
  );
};

Application.Components.component('trainingForm', react2angular(TrainingFormWrapper, ['action', 'training', 'onError', 'onSuccess']));
