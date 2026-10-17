/** Each Enfield app's own front door and sign-in page. */
export const LANDING_PATH = {
  forge: '/',
  world: '/world-creator',
  paths: '/shadow-paths',
} as const;
export const SIGN_IN_PATH = {
  forge: '/sign-in',
  world: '/world-creator/sign-in',
  paths: '/shadow-paths/sign-in',
} as const;
