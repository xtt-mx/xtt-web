import clsx, { type ClassValue } from 'clsx';

/**
 * Une clases de CSS Modules con las primitivas globales de `globals.css`.
 * Solo clsx: sin `tailwind-merge`, porque no escribimos utilidades de Tailwind
 * en el JSX y no hay conflictos que resolver.
 */
export const cn = (...inputs: ClassValue[]): string => clsx(inputs);
