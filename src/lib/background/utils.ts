export const debugLog = (
  debugMode: boolean,
  ...args: Parameters<typeof console.log>
) => {
  if (debugMode) {
    console.log(...args);
  }
};
