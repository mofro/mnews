// Minimal logger implementation
const noop = () => {};

export default {
  debug: console.debug || noop,
  info: console.info || noop,
  warn: console.warn || noop,
  error: console.error || noop,
};
