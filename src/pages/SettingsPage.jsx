import { useState } from 'react';
import { getSettings, saveSettings } from '../api/mockApi.js';
import Button from '../components/Button.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import LoadingState from '../components/LoadingState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import TextField from '../components/TextField.jsx';
import { useToast } from '../components/ToastProvider.jsx';
import { useApi } from '../hooks/useApi.js';
import { trackAction } from '../utils/analytics.js';
import { getErrorMessage } from '../utils/errors.js';
import { sanitizeText } from '../utils/sanitize.js';
import { validateSettingsForm } from '../utils/validation.js';
import './SettingsPage.css';

function SettingsForm({ initial }) {
  const { addToast } = useToast();
  const [values, setValues] = useState({
    confirmationWindowMinutes: String(initial.confirmationWindowMinutes),
    maxRetries: String(initial.maxRetries),
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: sanitizeText(value) }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    const form = event.currentTarget;
    const found = validateSettingsForm(values);
    setErrors(found);
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      form.elements[firstInvalid]?.focus();
      return;
    }
    setSaving(true);
    try {
      await saveSettings(values);
      trackAction('save settings');
      addToast('Settings saved.', 'success');
    } catch (failure) {
      if (failure?.fields) setErrors(failure.fields);
      else addToast(getErrorMessage(failure), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card form-card form" onSubmit={handleSubmit} noValidate>
      <TextField id="confirmation-window" name="confirmationWindowMinutes" label="Confirmation window (minutes)"
        inputMode="numeric" hint="How long a notified member has to confirm before the next person is notified."
        value={values.confirmationWindowMinutes} onChange={handleChange} error={errors.confirmationWindowMinutes} />
      <TextField id="max-retries" name="maxRetries" label="Max SMS attempts" inputMode="numeric"
        hint="Failed SMS messages are retried until this many attempts have been made."
        value={values.maxRetries} onChange={handleChange} error={errors.maxRetries} />
      <div className="form__actions">
        <Button variant="primary" type="submit" loading={saving}>Save settings</Button>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const { data, loading, error, execute } = useApi(getSettings);
  return (
    <>
      <PageHeader title="Settings" description="Tune how the waitlist notification job behaves." />
      {error && (
        <ErrorBanner
          message="We could not load settings. Check your connection and try again."
          onRetry={() => execute()}
          retrying={loading}
        />
      )}
      {!data && loading && <LoadingState label="Loading settings" rows={2} />}
      {data && <SettingsForm initial={data} />}
    </>
  );
}
