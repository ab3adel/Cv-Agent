
export const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

export const once = (emitter, event) =>
  new Promise(resolve => emitter.once(event, resolve));

export function abortPromise(signal: AbortSignal) {
  return new Promise((_, reject) => {
    if (signal.aborted) reject();
    signal.addEventListener('abort', () => reject());
  });
}