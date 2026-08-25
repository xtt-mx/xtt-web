'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';

import { brand } from '@/config/brand';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { contactSchema, VISIBLE_FIELDS, type VisibleField } from '@/lib/contact-schema';

import styles from './contacto.module.css';

type Status = 'idle' | 'sending' | 'sent' | 'error';

type FieldErrors = Partial<Record<VisibleField, string>>;

const LONG_FIELD: VisibleField = 'message';
const OPTIONAL_FIELDS: readonly VisibleField[] = ['company', 'country'];

export const ContactFormClient = () => {
  const t = useTranslations('contact.form');
  const locale = useLocale();
  const fieldId = useId();

  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  /**
   * Contador de intentos fallidos. Dispara el efecto que mueve el foco al
   * resumen incluso cuando los errores son idénticos al intento anterior: sin
   * él, reenviar el formulario sin corregir nada no anunciaría nada.
   */
  const [failedAttempts, setFailedAttempts] = useState(0);

  /**
   * Momento en que se montó el formulario; el servidor lo usa para descartar
   * envíos instantáneos.
   *
   * Va en un ref y no en estado porque no se pinta nada con él. Y se asigna en
   * un efecto y no en el inicializador porque `Date.now()` es impuro: llamarlo
   * durante el render rompe la regla `react-hooks/purity` de React 19. No hay
   * riesgo de que llegue sin valor — no se puede enviar un formulario que aún
   * no montó.
   */
  const startedAt = useRef(0);
  const errorSummary = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  /**
   * Mueve el foco al resumen de errores. Va en un efecto y no justo después de
   * `setErrors` porque el resumen está en `display: none` mientras no hay
   * errores, y un elemento oculto no se puede enfocar: al intentarlo dentro del
   * handler —o en un `requestAnimationFrame`— React todavía no repintó y la
   * llamada se pierde en silencio.
   */
  useEffect(() => {
    if (failedAttempts > 0) errorSummary.current?.focus();
  }, [failedAttempts]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'sending') return;

    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form));

    const payload = { ...raw, startedAt: startedAt.current };
    const parsed = contactSchema.safeParse(payload);

    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string' && VISIBLE_FIELDS.includes(field as VisibleField)) {
          next[field as VisibleField] ??= issue.message;
        }
      }
      setErrors(next);
      setFormError(null);
      setStatus('idle');
      setFailedAttempts((n) => n + 1);
      return;
    }

    setErrors({});
    setFormError(null);
    setStatus('sending');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-XTT-Locale': locale },
        body: JSON.stringify(parsed.data),
      });

      if (response.ok) {
        setStatus('sent');
        form.reset();
        startedAt.current = Date.now();
        return;
      }

      const body = (await response.json().catch(() => null)) as {
        error?: string;
        fields?: FieldErrors;
      } | null;

      if (response.status === 400 && body?.fields) {
        setErrors(body.fields);
        setStatus('idle');
        setFailedAttempts((n) => n + 1);
        return;
      }

      setFormError(
        response.status === 429
          ? t('rateLimited')
          : response.status === 503
            ? t('unavailable', { email: brand.contact.email })
            : t('error', { email: brand.contact.email }),
      );
      setStatus('error');
    } catch {
      setFormError(t('error', { email: brand.contact.email }));
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <p className={styles.success} role="status">
        {t('success')}
      </p>
    );
  }

  const errorEntries = Object.entries(errors) as [VisibleField, string][];

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {/* `tabIndex={-1}` lo hace enfocable por código pero no por tabulación. */}
      <div
        ref={errorSummary}
        tabIndex={-1}
        role="alert"
        className={cn(styles.summary, errorEntries.length === 0 && styles.hidden)}
      >
        {errorEntries.length > 0 && (
          <>
            <p className={styles.summaryTitle}>{t('errorsTitle')}</p>
            <ul className={styles.summaryList}>
              {errorEntries.map(([field, key]) => (
                <li key={field}>
                  <a href={`#${fieldId}-${field}`}>
                    {t(field)}: {t(key)}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {VISIBLE_FIELDS.map((field) => {
        const id = `${fieldId}-${field}`;
        const error = errors[field];
        const isOptional = OPTIONAL_FIELDS.includes(field);

        return (
          <div
            key={field}
            className={cn(styles.field, field === LONG_FIELD && styles.fieldWide)}
          >
            <label htmlFor={id} className={styles.label}>
              {t(field)}
              {isOptional && <span className={styles.optional}> ({t('optional')})</span>}
            </label>

            {field === LONG_FIELD ? (
              <textarea
                id={id}
                name={field}
                rows={6}
                className={cn(styles.input, styles.textarea, error && styles.inputError)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
              />
            ) : (
              <input
                id={id}
                name={field}
                type={field === 'email' ? 'email' : 'text'}
                autoComplete={
                  field === 'email'
                    ? 'email'
                    : field === 'name'
                      ? 'name'
                      : field === 'company'
                        ? 'organization'
                        : field === 'country'
                          ? 'country-name'
                          : 'off'
                }
                className={cn(styles.input, error && styles.inputError)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
              />
            )}

            {error && (
              <p id={`${id}-error`} className={styles.fieldError}>
                {t(error)}
              </p>
            )}
          </div>
        );
      })}

      {/* Honeypot: oculto por CSS, no con `hidden` ni `type="hidden"`, porque un
          bot ignora los estilos y rellena lo que ve en el marcado. `aria-hidden`
          y `tabIndex={-1}` lo sacan del camino de teclado y lectores. */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor={`${fieldId}-website`}>{t('honeypotLabel')}</label>
        <input
          id={`${fieldId}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className={styles.actions}>
        <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
          {status === 'sending' ? t('sending') : t('submit')}
        </button>

        <p className={cn('muted', styles.privacy)}>
          {t.rich('privacyNote', {
            privacy: (chunks) => (
              <Link href="/privacidad" className={styles.privacyLink}>
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>

      {formError && (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      )}
    </form>
  );
};
