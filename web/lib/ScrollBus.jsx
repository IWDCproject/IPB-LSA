const listeners = new Set();
 
export const scrollBus = {
  on:   (fn) => listeners.add(fn),
  off:  (fn) => listeners.delete(fn),
  emit: (e)  => listeners.forEach((fn) => fn(e)),
};
 