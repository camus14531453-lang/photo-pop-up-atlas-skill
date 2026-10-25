/* Pure state core: shared by browser and deterministic Node tests. */
(function (root) {
  'use strict';
  function initial() { return { started: false, picked: [], complete: false, message: '' }; }
  function step(state, action, game) {
    if (action.type === 'reset') return { ...initial(), started: state.started };
    if (action.type === 'start') return { ...state, started: true };
    if (action.type !== 'pick' || !state.started || state.complete || !game.targets.includes(action.id)) return state;
    if (state.picked.includes(action.id)) return state;
    if (game.mode === 'sequence' && action.id !== game.targets[state.picked.length]) {
      return { ...state, picked: [], message: game.retryText };
    }
    const picked = [...state.picked, action.id];
    const complete = picked.length === game.targets.length;
    return { ...state, picked, complete, message: complete ? game.winText : `${picked.length} / ${game.targets.length}` };
  }
  const api = { initial, step };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PopupState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
