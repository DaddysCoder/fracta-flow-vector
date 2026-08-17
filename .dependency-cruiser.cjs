module.exports = {
  forbidden: [
    {
      name: 'core-is-pure',
      severity: 'error',
      comment: '@pbs/core must not depend on adapters, ui, or export. It is pure.',
      from: { path: '^packages/core' },
      to:   { path: '^packages/(adapters|ui|export)' }
    },
    {
      name: 'registry-is-data-only',
      severity: 'error',
      comment: '@pbs/registry is data + validator only.',
      from: { path: '^packages/registry' },
      to:   { path: '^packages/(core|adapters|ui|export)' }
    },
    {
      name: 'ui-not-adapters',
      severity: 'error',
      comment: 'UI talks to core, never to storage adapters directly.',
      from: { path: '^packages/ui' },
      to:   { path: '^packages/adapters' }
    }
  ],
  options: { doNotFollow: { path: 'node_modules' }, tsPreCompilationDeps: true }
};
