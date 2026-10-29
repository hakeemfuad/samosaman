(() => {
    'use strict';

    window.lucide?.createIcons();

    const form = document.getElementById('catering-form');
    const dateInput = document.getElementById('event-date');
    const modal = document.getElementById('success-modal');
    const button = form.querySelector('button[type="submit"]');
    const buttonLabel = button.querySelector('.catering-submit-label');
    const spinner = button.querySelector('.catering-spinner');
    const arrow = button.querySelector('.catering-submit-arrow');
    const status = document.getElementById('catering-status');
    const submitError = document.getElementById('catering-submit-error');
    const fields = [...form.querySelectorAll('.catering-field input, .catering-field select')];
    const orderFieldset = document.getElementById('catering-order');
    const orderSelector = window.SamosamanCateringOrder.create(orderFieldset, window.SamosamanCateringMenu);

    // Match the visitor's local calendar, including near midnight.
    const today = new Date();
    dateInput.min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    dateInput.max = '9999-12-31';

    const requiredMessages = {
        'full-name': 'Enter your full name.',
        phone: 'Enter your phone number.',
        email: 'Enter your email address.',
        'event-date': 'Select the date of your event.',
        'event-time': 'Select the time of your event.',
        guests: 'Enter the number of guests.'
    };

    function showFieldError(field) {
        const error = document.getElementById(`${field.id}-error`);
        let message = '';
        if (field.validity.valueMissing) message = requiredMessages[field.id] || 'Complete this field.';
        else if (field.validity.typeMismatch) message = 'Enter a valid email address.';
        else if (field.validity.rangeUnderflow && field === dateInput) message = 'Select today or a later date.';
        else if (field.id === 'guests' && !field.validity.valid) message = 'Enter a whole number of 1 or more.';
        else if (!field.validity.valid) message = field.validationMessage;
        error.textContent = message;
        error.hidden = !message;
        if (message) field.setAttribute('aria-invalid', 'true');
        else field.removeAttribute('aria-invalid');
        return !message;
    }

    // Keep native constraints and add persistent, linked error messages.
    form.noValidate = true;
    fields.forEach(field => {
        field.addEventListener('blur', () => showFieldError(field));
        for (const event of ['input', 'change']) {
            field.addEventListener(event, () => {
                if (field.hasAttribute('aria-invalid')) showFieldError(field);
            });
        }
    });

    function setSending(sending) {
        button.disabled = sending;
        form.querySelectorAll('input, select, textarea').forEach(control => {
            if (!orderFieldset.contains(control)) control.disabled = sending;
        });
        // A disabled fieldset preserves each item's own selected/disabled state.
        orderFieldset.disabled = sending;
        form.setAttribute('aria-busy', String(sending));
        buttonLabel.textContent = sending ? 'Sending…' : 'Send inquiry';
        spinner.hidden = !sending;
        arrow.hidden = sending;
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (button.disabled) return;

        submitError.hidden = true;
        const invalidFields = fields.filter(field => !showFieldError(field));
        const selection = orderSelector.read();
        if (selection.invalidField) invalidFields.push(selection.invalidField);
        if (invalidFields.length) {
            status.textContent = 'Check the marked fields before you send your inquiry.';
            invalidFields[0].focus();
            return;
        }

        const values = new FormData(form);
        const formData = {
            // Burlington is the only catering location.
            location: 'Burlington',
            fullName: values.get('full-name'),
            phone: values.get('phone'),
            email: values.get('email'),
            eventDate: values.get('event-date'),
            eventTime: values.get('event-time'),
            guests: values.get('guests'),
            serviceType: values.get('service-type'),
            address: values.get('address') || '',
            city: values.get('city') || '',
            state: values.get('state') || '',
            comments: values.get('comments') || '',
            orderItems: selection.items,
            uid: window.firebase?.auth().currentUser?.uid || null
        };

        setSending(true);
        status.textContent = 'Sending your inquiry.';

        try {
            const response = await fetch('https://us-central1-samosaman-6895e.cloudfunctions.net/submitCateringInquiry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error('Inquiry submission failed');

            document.getElementById('success-customer-name').textContent = formData.fullName.trim().split(/\s+/)[0] || 'there';
            form.reset();
            fields.forEach(field => {
                field.removeAttribute('aria-invalid');
                document.getElementById(`${field.id}-error`).hidden = true;
            });
            status.textContent = '';
            modal.showModal();
        } catch (error) {
            status.textContent = '';
            submitError.textContent = 'We could not send your inquiry. Your details are still here. Please try again.';
            submitError.hidden = false;
        } finally {
            setSending(false);
        }
    });

    document.getElementById('dismiss-success').addEventListener('click', () => modal.close());
    modal.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const controls = [...modal.querySelectorAll('button, a[href]')];
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });
    modal.addEventListener('close', () => button.focus());
})();
