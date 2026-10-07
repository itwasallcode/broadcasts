import { execFileSync } from 'node:child_process';

export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'trailer-empty': (parsed) => {
          const trailers = execFileSync('git', ['interpret-trailers', '--parse'], {
            input: parsed.raw,
            encoding: 'utf8',
          });
          return [trailers.trim() === '', 'Git trailers are not allowed.'];
        },
      },
    },
  ],
  rules: {
    'header-max-length': [2, 'always', 64],
    'scope-empty': [2, 'always'],
    'footer-empty': [2, 'always'],
    'trailer-empty': [2, 'always'],
  },
};
