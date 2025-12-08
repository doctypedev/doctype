# Drift-detector

Auto-generated documentation via Doctype.


## API Reference

### oldSignature

<!-- doctype:start id="09ed9209-987c-46d5-b7dd-c71ec5193406" code_ref="packages/cli/src/services/drift-detector.ts#oldSignature" -->
TODO: Add documentation for this symbol
<!-- doctype:end id="09ed9209-987c-46d5-b7dd-c71ec5193406" -->


### currentHash

<!-- doctype:start id="fe9e7d6a-b817-4f2a-b669-04de8f49fc74" code_ref="packages/cli/src/services/drift-detector.ts#currentHash" -->
TODO: Add documentation for this symbol
<!-- doctype:end id="fe9e7d6a-b817-4f2a-b669-04de8f49fc74" -->


### currentSignature

<!-- doctype:start id="e09ccf26-1acb-4bbf-92af-80b80489b8c4" code_ref="packages/cli/src/services/drift-detector.ts#currentSignature" -->
TODO: Add documentation for this symbol
<!-- doctype:end id="e09ccf26-1acb-4bbf-92af-80b80489b8c4" -->


### signatures

<!-- doctype:start id="e8fdee41-1e83-4b69-980f-f0c392f27d7c" code_ref="packages/cli/src/services/drift-detector.ts#signatures" -->
TODO: Add documentation for this symbol
<!-- doctype:end id="e8fdee41-1e83-4b69-980f-f0c392f27d7c" -->


### codeFilePath

<!-- doctype:start id="9a7b3476-6855-4aed-8180-680243d58436" code_ref="packages/cli/src/services/drift-detector.ts#codeFilePath" -->
TODO: Add documentation for this symbol
<!-- doctype:end id="9a7b3476-6855-4aed-8180-680243d58436" -->


### entry

<!-- doctype:start id="20c02e1c-28ca-4960-bc11-3e7df384d8fd" code_ref="packages/cli/src/services/drift-detector.ts#entry" -->
TODO: Add documentation for this symbol
<!-- doctype:end id="20c02e1c-28ca-4960-bc11-3e7df384d8fd" -->


### drifts

<!-- doctype:start id="d3a256f4-d166-4edd-bf38-5641a33dc66b" code_ref="packages/cli/src/services/drift-detector.ts#drifts" -->
TODO: Add documentation for this symbol
<!-- doctype:end id="d3a256f4-d166-4edd-bf38-5641a33dc66b" -->


### entries

<!-- doctype:start id="0de3a4dd-17b4-4113-a2cc-b7fa973aeb2c" code_ref="packages/cli/src/services/drift-detector.ts#entries" -->
TODO: Add documentation for this symbol
<!-- doctype:end id="0de3a4dd-17b4-4113-a2cc-b7fa973aeb2c" -->


### detectDrift

<!-- doctype:start id="02e09b54-a3b7-4b54-9b36-3d0399c6ce45" code_ref="packages/cli/src/services/drift-detector.ts#detectDrift" -->
**Purpose:** The detectDrift function analyzes a given document structure and identifies discrepancies between its expected and actual state, which is crucial for maintaining data integrity.

**Parameters:**
- `mapManager` (`DoctypeMapManager`): An instance of DoctypeMapManager responsible for managing the document types and their maps.
- `analyzer` (`InstanceType<typeof AstAnalyzer>`): An instance of AstAnalyzer used to analyze the document's abstract syntax tree.
- `options` (optional) (`DriftDetectionOptions`): Configuration options for drift detection. Default: `{}`

**Returns:** `DriftResult` - An object containing the results of the drift detection, including any discrepancies found.

**Usage Example:**
```typescript
const driftResults = detectDrift(mapManagerInstance, astAnalyzerInstance, { threshold: 0.1 });
```

**Notes:**
- The options parameter can customize the sensitivity of the drift detection process.
<!-- doctype:end id="02e09b54-a3b7-4b54-9b36-3d0399c6ce45" -->


### DriftDetectionOptions

<!-- doctype:start id="632b7101-ac7e-4f6b-ac44-6ed8972791ae" code_ref="packages/cli/src/services/drift-detector.ts#DriftDetectionOptions" -->
TODO: Add documentation for this symbol
<!-- doctype:end id="632b7101-ac7e-4f6b-ac44-6ed8972791ae" -->



### DriftInfo

<!-- doctype:start id="346dc5a6-40f7-4cf7-b6ac-b2f220a2d65a" code_ref="packages/cli/src/services/drift-detector.ts#DriftInfo" -->
TODO: Add documentation for this symbol
<!-- doctype:end id="346dc5a6-40f7-4cf7-b6ac-b2f220a2d65a" -->
