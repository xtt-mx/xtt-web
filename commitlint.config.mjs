/**
 * Conventional Commits con scope, al estilo `feat(hero): ...`.
 * Los scopes son abiertos a propósito: el repo es chico y una lista cerrada se
 * vuelve fricción antes que ayuda.
 */
const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [2, 'never', ['pascal-case', 'start-case']],
    'header-max-length': [2, 'always', 100],
  },
};

export default config;
