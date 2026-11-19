/** Persist the final drag state, not every intermediate mouse movement. */
export function shouldPersistColumnEvent(event: { finished?: boolean }): boolean {
  return event.finished !== false;
}
