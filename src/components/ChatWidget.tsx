'use client';

import { MessageCircle, Send, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { MAX_MESSAGE_CHARS, trimHistory, type ChatTurn } from '@/lib/chat-schema';

import styles from './ChatWidget.module.css';

type Status = 'idle' | 'sending' | 'error';

interface Message extends ChatTurn {
  readonly id: string;
}

/** Debajo de este ancho el panel ocupa la pantalla y sí conviene bloquear el fondo. */
const FULLSCREEN_QUERY = '(max-width: 620px)';

const SESSION_KEY = 'xtt-chat-session';

export const ChatWidget = () => {
  const t = useTranslations('chat');
  const locale = useLocale();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<readonly Message[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const bubble = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);

  /**
   * Identificador de conversación. Se genera en un efecto y no en el
   * inicializador de estado porque `crypto.randomUUID()` es impuro y llamarlo
   * durante el render rompe la regla `react-hooks/purity` de React 19 — la misma
   * razón por la que el formulario asigna `startedAt` en un efecto.
   *
   * Vive en `sessionStorage` para que recargar la página no parta la
   * conversación en dos en el Data Table, y para que muera al cerrar la pestaña:
   * no es una cookie y no sigue a nadie entre visitas.
   */
  const sessionId = useRef('');

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      sessionId.current = stored;
      return;
    }

    const fresh = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, fresh);
    sessionId.current = fresh;
  }, []);

  /**
   * Escape cierra, y el scroll del fondo se bloquea SOLO cuando el panel ocupa
   * la pantalla. En escritorio el panel mide 380 px: congelar la página entera
   * detrás de él impediría leer justo lo que se está preguntando.
   */
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);

    const isFullscreen = window.matchMedia(FULLSCREEN_QUERY).matches;
    const previous = document.body.style.overflow;
    if (isFullscreen) document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (isFullscreen) document.body.style.overflow = previous;
    };
  }, [isOpen]);

  /**
   * Foco al abrir y de vuelta a la burbuja al cerrar. `hasOpened` evita que el
   * primer render robe el foco: sin él, entrar al sitio movería el cursor a una
   * burbuja de chat que nadie pidió.
   */
  const hasOpened = useRef(false);

  useEffect(() => {
    if (isOpen) {
      hasOpened.current = true;
      input.current?.focus();
    } else if (hasOpened.current) {
      bubble.current?.focus();
    }
  }, [isOpen]);

  // Mantener a la vista el último mensaje conforme crece la conversación.
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages, status]);

  const send = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = draft.trim();
    if (!text || status === 'sending') return;

    const question: Message = { id: crypto.randomUUID(), role: 'user', content: text };

    // El historial que viaja es el PREVIO a esta pregunta: el turno actual va
    // aparte en el cuerpo, y mandarlo en los dos sitios lo duplicaría en el prompt.
    const history = trimHistory(messages.map(({ role, content }) => ({ role, content })));

    setMessages((previous) => [...previous, question]);
    setDraft('');
    setErrorText(null);
    setStatus('sending');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-XTT-Locale': locale },
        body: JSON.stringify({
          message: text,
          history,
          sessionId: sessionId.current,
        }),
      });

      if (response.ok) {
        const body = (await response.json()) as { reply: string };
        setMessages((previous) => [
          ...previous,
          { id: crypto.randomUUID(), role: 'assistant', content: body.reply },
        ]);
        setStatus('idle');
        return;
      }

      /**
       * Nunca se pinta una burbuja del bot cuando la petición falló. Un mensaje
       * inventado —aunque diga "hubo un error"— dentro del hilo se lee como algo
       * que el bot dijo; el fallo va fuera del hilo y con `role="alert"`.
       */
      setErrorText(
        response.status === 429
          ? t('rateLimited')
          : response.status === 503
            ? t('unavailable')
            : t('error'),
      );
      setStatus('error');
    } catch {
      setErrorText(t('error'));
      setStatus('error');
    }
  };

  return (
    <div className={styles.root} data-open={isOpen ? 'true' : undefined}>
      {/* Siempre montado y solo oculto: el cambio de `hidden` se anuncia sin
          desmontar el foco, igual que el panel móvil del header. */}
      <div
        id="chat-panel"
        className={styles.panel}
        role="dialog"
        aria-labelledby="chat-title"
        hidden={!isOpen}
      >
        <div className={styles.head}>
          <p id="chat-title" className={styles.title}>
            {t('title')}
          </p>
          <button
            type="button"
            className={styles.close}
            onClick={() => setIsOpen(false)}
            aria-label={t('close')}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.log} ref={log} role="log" aria-live="polite">
          <p className={cn(styles.message, styles.fromBot)}>{t('greeting')}</p>

          {messages.map((message) => (
            <p
              key={message.id}
              className={cn(
                styles.message,
                message.role === 'user' ? styles.fromUser : styles.fromBot,
              )}
            >
              {message.content}
            </p>
          ))}

          {status === 'sending' && (
            <p className={cn(styles.message, styles.fromBot, styles.typing)}>
              {t('sending')}
            </p>
          )}
        </div>

        {errorText && (
          <p className={styles.error} role="alert">
            {errorText}
          </p>
        )}

        <form className={styles.composer} onSubmit={send}>
          <label htmlFor="chat-input" className={styles.srOnly}>
            {t('placeholder')}
          </label>
          <input
            id="chat-input"
            ref={input}
            className={styles.input}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t('placeholder')}
            maxLength={MAX_MESSAGE_CHARS}
            autoComplete="off"
          />
          <button
            type="submit"
            className={styles.send}
            disabled={status === 'sending' || draft.trim() === ''}
            aria-label={t('send')}
          >
            <Send size={16} aria-hidden="true" />
          </button>
        </form>

        <div className={styles.foot}>
          {/* El enlace está SIEMPRE, no aparece según lo que conteste el modelo.
              Decidir la UI parseando texto generado es lo primero que se rompe
              cuando el modelo cambia de humor. */}
          <Link
            href="/contacto"
            className={styles.footLink}
            onClick={() => setIsOpen(false)}
          >
            {t('contactCta')}
          </Link>
          <p className={styles.disclaimer}>{t('disclaimer')}</p>
        </div>
      </div>

      <button
        type="button"
        ref={bubble}
        className={styles.bubble}
        aria-expanded={isOpen}
        aria-controls="chat-panel"
        aria-label={isOpen ? t('close') : t('open')}
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? (
          <X size={22} aria-hidden="true" />
        ) : (
          <MessageCircle size={22} aria-hidden="true" />
        )}
      </button>
    </div>
  );
};
