import coreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/**
 * eslint-config-next 16 ya publica flat config, así que no usamos el puente
 * `FlatCompat` de eslintrc: con estos presets revienta al validar el schema
 * (intenta serializar los plugins y encuentra una referencia circular).
 *
 * Los subpaths son CommonJS y exportan el array directo, por eso se importan
 * como default y no con named imports.
 */
const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'e2e/.report/**',
      'e2e/.results/**',
    ],
  },
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Los `_` marcan un descarte intencional (params de firma que no usamos).
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // La copy en español lleva comillas y acentos; escaparlos a entidades HTML
      // haría los JSON de mensajes ilegibles.
      'react/no-unescaped-entities': 'off',
      // `import type` explícito: deja claro qué desaparece en el build.
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
];

export default eslintConfig;
