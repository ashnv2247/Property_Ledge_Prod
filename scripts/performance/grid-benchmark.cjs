/* eslint-disable @typescript-eslint/no-require-imports -- Node CLI without a transpiler. */
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
  const exports = {};
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, { exports, require, Date });
  return exports;
}
const { useGridStateStore } = load('lib/stores/useGridStateStore.ts');
const { shouldPersistColumnEvent } = load('lib/grid/persistence.ts');
function run(optimized) {
  const samples = [];
  let notifications;
  for (let pass = 0; pass < 51; pass++) {
    useGridStateStore.getState().clearAllGridStates();
    notifications = 0;
    const unsubscribe = useGridStateStore.subscribe(() => notifications++);
    const start = performance.now();
    for (let i = 0; i < 300; i++) {
      if (!optimized || shouldPersistColumnEvent({ finished: i === 299 })) {
        useGridStateStore.getState().saveGridState('benchmark', {
          columnState: Array.from({ length: 30 }, (_, col) => ({ colId: `col-${col}`, width: 120 + i })),
        });
      }
    }
    samples.push(performance.now() - start);
    unsubscribe();
  }
  samples.shift(); // discard warmup
  samples.sort((a, b) => a - b);
  return { stateWrites: notifications, medianMs: samples[25], p95Ms: samples[47] };
}
const result = {
  scenario: 'Synthetic 300-event column drag, 30 columns, 50 measured runs; real Zustand store. No browser, storage I/O, network, or rendering measured.',
  before: run(false), after: run(true),
};
fs.writeFileSync('docs/performance/grid-benchmark.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
