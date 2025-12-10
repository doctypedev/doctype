# Drift-detector

Auto-generated documentation via Sintesi.


## API Reference

### key



### sig



### relativePath



### file



### discoveryResult



### absProjectRoot



### tracked



### untracked



### missing



### DriftResult

<!-- sintesi:start id="9518cb68-d0b8-497e-9f02-59c76fc8fa2e" code_ref="packages/cli/src/services/drift-detector.ts#DriftResult" -->
**DriftResult** - Documentation needs generation

Current signature:
```typescript
interface DriftResult{drifts: DriftInfo[];  missing: MissingSymbolInfo[];  untracked: UntrackedSymbolInfo[]; }
```

*This content is a placeholder. Run 'sintesi generate' with a valid AI API key to generate full documentation.*
<!-- sintesi:end id="9518cb68-d0b8-497e-9f02-59c76fc8fa2e" -->


### UntrackedSymbolInfo

<!-- sintesi:start id="a1fe33e9-904b-45a5-b02f-44b9cb6bdfa6" code_ref="packages/cli/src/services/drift-detector.ts#UntrackedSymbolInfo" -->
**UntrackedSymbolInfo** - Documentation needs generation

Current signature:
```typescript
interface UntrackedSymbolInfo{symbolName: string;  filePath: string;  signature: CodeSignature; }
```

*This content is a placeholder. Run 'sintesi generate' with a valid AI API key to generate full documentation.*
<!-- sintesi:end id="a1fe33e9-904b-45a5-b02f-44b9cb6bdfa6" -->


### MissingSymbolInfo

<!-- sintesi:start id="3da63fd2-8010-4847-98c5-a172cacdb99d" code_ref="packages/cli/src/services/drift-detector.ts#MissingSymbolInfo" -->
**MissingSymbolInfo** - Documentation needs generation

Current signature:
```typescript
interface MissingSymbolInfo{entry: SintesiMapEntry;  reason: 'file_not_found' | 'symbol_not_found';  codeFilePath: string; }
```

*This content is a placeholder. Run 'sintesi generate' with a valid AI API key to generate full documentation.*
<!-- sintesi:end id="3da63fd2-8010-4847-98c5-a172cacdb99d" -->


### oldSignature



### currentHash



### currentSignature



### signatures



### codeFilePath



### entry



### drifts



### entries



### detectDrift

<!-- sintesi:start id="02e09b54-a3b7-4b54-9b36-3d0399c6ce45" code_ref="packages/cli/src/services/drift-detector.ts#detectDrift" -->
**Purpose:** The detectDrift function analyzes a given document structure and identifies discrepancies between its expected and actual state, which is crucial for maintaining data integrity.

**Parameters:**
- `mapManager` (`SintesiMapManager`): An instance of SintesiMapManager responsible for managing the document types and their maps.
- `analyzer` (`InstanceType<typeof AstAnalyzer>`): An instance of AstAnalyzer used to analyze the document's abstract syntax tree.
- `options` (optional) (`DriftDetectionOptions`): Configuration options for drift detection. Default: `{}`

**Returns:** `DriftResult` - An object containing the results of the drift detection, including any discrepancies found.

**Usage Example:**
```typescript
const driftResults = detectDrift(mapManagerInstance, astAnalyzerInstance, { threshold: 0.1 });
```

**Notes:**
- The options parameter can customize the sensitivity of the drift detection process.
<!-- sintesi:end id="02e09b54-a3b7-4b54-9b36-3d0399c6ce45" -->


### DriftDetectionOptions

<!-- sintesi:start id="632b7101-ac7e-4f6b-ac44-6ed8972791ae" code_ref="packages/cli/src/services/drift-detector.ts#DriftDetectionOptions" -->
**Purpose:** This interface defines configuration options for drift detection, allowing users to customize the detection process based on specific requirements.

**Parameters:**
- `basePath` (optional) (`string`): The base directory for drift detection operations. Default: `undefined`
- `logger` (optional) (`Logger`): An instance of a logging utility for tracking drift detection events. Default: `undefined`
- `discoverUntracked` (optional) (`boolean`): A flag indicating whether to discover untracked files that may cause drift. Default: `false`
- `projectRoot` (optional) (`string`): The root directory of the project for context in drift detection. Default: `undefined`

**Returns:** `void` - This interface does not have a return type as it is used for configuration.

**Usage Example:**
```typescript
const options: DriftDetectionOptions = { basePath: '/src', discoverUntracked: true };
```
<!-- sintesi:end id="632b7101-ac7e-4f6b-ac44-6ed8972791ae" -->



### DriftInfo

<!-- sintesi:start id="346dc5a6-40f7-4cf7-b6ac-b2f220a2d65a" code_ref="packages/cli/src/services/drift-detector.ts#DriftInfo" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="346dc5a6-40f7-4cf7-b6ac-b2f220a2d65a" -->
