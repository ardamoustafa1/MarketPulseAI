if (typeof globalThis.SharedArrayBuffer === 'undefined') {
  // Some transitive deps assume SharedArrayBuffer exists on Hermes.
  globalThis.SharedArrayBuffer = ArrayBuffer;
}

const { registerRootComponent } = require('expo');
const App = require('./App').default;

registerRootComponent(App);
