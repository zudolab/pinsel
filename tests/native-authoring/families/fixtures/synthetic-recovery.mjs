/**
 * Synthetic operator-recovery evidence for the index 31 and index 33 validators. Nothing here is
 * historical evidence: every snapshot, event log, bundle and shutdown trace is generated in memory,
 * with obviously fake ids and digests, and served through the validators' injected read/json.
 */
import { OWNER_PROTOCOL } from '../continuation-core.mjs';

// Values the validators compare against verbatim. The host root is a recorded string, never a path read here.
export const SAVE_TIMEOUT = "locator.isEnabled: Timeout 30000ms exceeded.\nCall log:\n  - waiting for getByRole('button', { name: 'Save', exact: true })\n";
export const UNCERTAIN = 'Original request outcome uncertain; no further writes';
const RECORDED_HOST_ROOT = '/workspace/pinsel-baseline-publication/packages/pinsel-content';
const RECORDED_PORT = 4208;
const NONCE = '00000000-0000-4000-8000-000000000000';
export const SYNTHETIC_DESCRIPTOR = Object.freeze({ synthetic: true, proofPath: '/synthetic-evidence/continuation/proof.json' });

const tocRecord = () => ({
  id: 'synthetic-toc', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  document: { id: 'synthetic-toc', name: 'Synthetic TOC', root: [{ id: 'synthetic-node', componentId: 'pinsel.toc', componentVersion: 1, props: { number: 1, label: 'synthetic' }, slots: {} }] },
});
const otherComposition = () => ({ id: 'synthetic-zz-other', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', document: { id: 'synthetic-zz-other', name: 'Synthetic other', root: [] } });
const mappingRecord = () => ({
  id: 'synthetic-map', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  document: { schemaVersion: 2, id: 'synthetic-map', name: 'Synthetic mapping', contentModel: { providerId: 'content-filesystem', recordId: 'synthetic-model' }, composition: { providerId: 'files', recordId: 'synthetic-toc' }, mode: { kind: 'single' }, bindings: [{ id: 'synthetic-binding-0', sourceFieldId: 'synthetic-title', projection: { kind: 'value' }, target: { nodeId: 'synthetic-node', prop: 'title' }, transform: { kind: 'identity' } }] },
});

export function syntheticSnapshot(digest) {
  return {
    schemaVersion: 1, workspaceId: 'synthetic-workspace', digest,
    componentPack: { digest: 'synthetic-pack-digest' }, renderer: { digest: 'synthetic-renderer-digest' }, assets: [], publicFiles: ['synthetic.html'],
    tokens: { compositions: 7, mappings: 3, content: 5, workspace: 1 },
    project: {
      collectionAttachments: [],
      providers: {
        compositions: [{ id: 'files', records: [tocRecord(), otherComposition()] }],
        mappings: [{ id: 'mapping-filesystem', records: [mappingRecord()] }],
        content: [{ id: 'content-filesystem', models: [], entries: [] }],
      },
    },
  };
}

function shutdownPair() {
  const pid = 4242;
  const message = type => ({ protocol: OWNER_PROTOCOL, nonce: NONCE, pid, hostRoot: RECORDED_HOST_ROOT, port: RECORDED_PORT, type });
  const trace = [
    { event: 'message', at: '2026-01-02T00:00:00.000Z', message: message('ready') },
    { event: 'stop', at: '2026-01-02T00:00:01.000Z', message: message('stop') },
    { event: 'message', at: '2026-01-02T00:00:02.000Z', message: message('closed') },
    { event: 'close', code: 0, signal: null },
  ];
  return { shutdown: { code: 0, signal: null, lease: 'absent', port: 'free', protocol: OWNER_PROTOCOL, pid, trace: structuredClone(trace) }, trace };
}

const replaceRecord = (snapshot, domain, providerId, record) => {
  const provider = snapshot.project.providers[domain].find(p => p.id === providerId);
  provider.records = provider.records.map(item => item.id === record.id ? record : item);
};

function evidencePaths(phase) {
  const dir = `/synthetic-evidence/phase${phase}`;
  return {
    originalBefore: `${dir}/before.json`, originalAfter: `${dir}/after.json`, readbackCapture: `${dir}-readback/capture.json`,
    originalEvents: `${dir}/events.ndjson`, originalBundle: `${dir}/accepted-inputs.json`, originalShutdown: `${dir}/server-shutdown.json`, originalTrace: `${dir}/server-ipc-trace.json`,
  };
}

/** Serializes the parts after the caller's edit and derives the proof exactly as the operator's recovery would. */
function assemble(phase, parts, proofFields, pickRecord) {
  const evidence = evidencePaths(phase);
  const files = new Map([
    [evidence.originalBefore, JSON.stringify(parts.before)],
    [evidence.originalAfter, JSON.stringify(parts.after)],
    [evidence.readbackCapture, JSON.stringify(parts.readback)],
    [evidence.originalEvents, parts.events.map(event => JSON.stringify(event)).join('\n') + '\n'],
    [evidence.originalBundle, JSON.stringify(parts.bundle)],
    [evidence.originalShutdown, JSON.stringify(parts.shutdown)],
    [evidence.originalTrace, JSON.stringify(parts.trace)],
  ]);
  const read = async path => {
    if (!files.has(path)) throw Object.assign(new Error(`ENOENT synthetic ${path}`), { code: 'ENOENT' });
    return Buffer.from(files.get(path));
  };
  const json = async path => JSON.parse(await read(path));
  const proof = {
    ...proofFields,
    originalScenario: 'FAIL', originalProof: 'ABSENT', originalUiResult: 'ABSENT',
    beforeDigest: parts.before.digest, afterDigest: parts.readback.digest, afterCapture: evidence.readbackCapture,
    intent: structuredClone(parts.intent), result: { record: structuredClone(pickRecord(parts.events)) }, evidence,
  };
  const history = Array.from({ length: phase }, (_, index) => ({ afterDigest: `synthetic-history-digest-${index}` }));
  history[phase - 1] = { afterDigest: parts.before.digest };
  return { proof, previous: parts.before, history, loaded: { continuation: { descriptor: structuredClone(SYNTHETIC_DESCRIPTOR) } }, read, json, files, evidence };
}

/** Index 31: the TOC number was saved through a needs-output/continuation pair, then the UI held on Save. */
export function syntheticRecovery31(edit) {
  const before = syntheticSnapshot('synthetic-digest-before-31');
  const old = tocRecord();
  const document = structuredClone(old.document);
  document.root[0].props.number = 999;
  const intent = {
    family: 'results', domain: 'compositions', kind: 'record-edit', owner: { providerId: 'files', recordId: 'synthetic-toc' },
    sequence: { index: 31, step: 'toc-prop-number', total: 45 }, action: { kind: 'fill', label: '番号', value: 999, treeRoot: true },
    document, familyContinuation: structuredClone(SYNTHETIC_DESCRIPTOR), captureDigest: before.digest,
  };
  const record = { ...old, updatedAt: '2026-01-02T00:00:00.000Z', document: structuredClone(document) };
  const after = structuredClone(before);
  after.digest = 'synthetic-digest-after-31';
  after.tokens.compositions += 1;
  replaceRecord(after, 'compositions', 'files', structuredClone(record));
  const { shutdown, trace } = shutdownPair();
  const parts = {
    before, after, readback: structuredClone(after), intent, shutdown, trace,
    bundle: { snapshot: structuredClone(before), intent: structuredClone(intent) },
    events: [
      { phase: 'composition-put-before-dispatch', continuation: false, input: { record: structuredClone(record), outputsById: {} } },
      { phase: 'composition-put-response', status: 200, body: { ok: 'needs-output' } },
      { phase: 'composition-put-before-dispatch', continuation: true, input: { record: structuredClone(record), outputsById: { 'synthetic-output': 'synthetic' } } },
      { phase: 'composition-put-response', status: 200, body: { ok: true, result: { canonical: { status: 'saved' } } } },
      { phase: 'held', error: SAVE_TIMEOUT },
    ],
  };
  edit?.(parts);
  return assemble(31, parts, { status: 'COMPOSITION_PROP_FILL_RECOVERY_VERIFIED', originalFailure: SAVE_TIMEOUT, recoveryKind: 'saved-composition-fill-separate-public-capture', domain: 'compositions' },
    events => events.find(event => event.phase === 'composition-put-before-dispatch').input.record);
}

/** Index 33: one binding write returned 200; the following composition snapshot was held as uncertain. */
export function syntheticRecovery33(edit) {
  const before = syntheticSnapshot('synthetic-digest-before-33');
  const old = mappingRecord();
  const target = { nodeId: 'synthetic-node', prop: 'label' };
  const intent = {
    family: 'results', domain: 'mappings', kind: 'binding', owner: { providerId: 'mapping-filesystem', recordId: 'synthetic-map' },
    sequence: { index: 33, step: 'toc-bind-label', total: 45 }, fieldId: 'result-year-label', fieldLabel: '年度', title: 'TOC item', target,
    familyContinuation: structuredClone(SYNTHETIC_DESCRIPTOR), captureDigest: before.digest,
  };
  const binding = { id: 'synthetic-binding-1', sourceFieldId: 'result-year-label', projection: { kind: 'value' }, target: structuredClone(target), transform: { kind: 'identity' } };
  const record = { ...old, updatedAt: '2026-01-02T00:00:00.000Z', document: { ...old.document, bindings: [...old.document.bindings, binding] } };
  const after = structuredClone(before);
  after.digest = 'synthetic-digest-after-33';
  after.tokens.mappings += 1;
  replaceRecord(after, 'mappings', 'mapping-filesystem', structuredClone(record));
  const { shutdown, trace } = shutdownPair();
  const input = { operation: 'save', record: structuredClone(record) };
  const parts = {
    before, after, readback: structuredClone(after), intent, shutdown, trace,
    bundle: { snapshot: structuredClone(before), intent: structuredClone(intent) },
    events: [
      { phase: 'request-before-dispatch', endpoint: '/__zudo_composer_mapping_provider', input: structuredClone(input), wire: structuredClone(input) },
      { phase: 'request-response', status: 200, body: { ok: true, result: null }, input: structuredClone(input) },
      { phase: 'composition-held', error: UNCERTAIN, input: { operation: 'snapshot' } },
      { phase: 'held', error: UNCERTAIN },
    ],
  };
  edit?.(parts);
  return assemble(33, parts, { status: 'TOC_BINDING_SNAPSHOT_RECOVERY_VERIFIED', originalFailure: UNCERTAIN, recoveryKind: 'saved-binding-separate-public-capture', domain: 'mappings' },
    events => events.find(event => event.phase === 'request-before-dispatch').input.record);
}
