import { useState } from 'react';
import Button from './Button.jsx';
import Modal from './Modal.jsx';
import TextField from './TextField.jsx';
import { getErrorMessage } from '../utils/errors.js';
import { sanitizeText } from '../utils/sanitize.js';
import { validateWaitlistForm } from '../utils/validation.js';

const EMPTY = { name: '', phone: '', email: '' };

export default function AddToWaitlistModal({ sessionName, onClose, onSubmit }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Inputs are sanitised BEFORE they reach state.
  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: sanitizeText(value) }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;
    const trimmed = { name: values.name.trim(), phone: values.phone.trim(), email: values.email.trim() };
    const found = validateWaitlistForm(trimmed);
    setErrors(found);
    setFormError('');
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      form.elements[firstInvalid]?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
    } catch (error) {
      if (error?.fields) setErrors(error.fields);
      else setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add to waitlist" onClose={onClose}>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <p className="page-header__desc">Add a member to the waitlist for {sessionName}.</p>
        <TextField id="member-name" name="name" label="Full name" autoComplete="off" data-autofocus="true"
          aria-required="true" value={values.name} onChange={handleChange} error={errors.name} />
        <TextField id="member-phone" name="phone" label="Phone number" type="tel" autoComplete="off"
          aria-required="true" placeholder="+91 98765 43210" value={values.phone} onChange={handleChange} error={errors.phone} />
        <TextField id="member-email" name="email" label="Email" type="email" autoComplete="off"
          aria-required="true" placeholder="name@example.com" value={values.email} onChange={handleChange} error={errors.email} />
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="form__actions">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={submitting}>Join waitlist</Button>
        </div>
      </form>
    </Modal>
  );
}
