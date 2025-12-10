# API Reference

### MissingSymbolDetail

<!-- sintesi:start id="49f0e557-1c6f-4ea2-b9fc-c8f44efcd7d4" code_ref="packages/cli/src/types/index.ts#MissingSymbolDetail" -->
**MissingSymbolDetail** - Documentation needs generation

Current signature:
```typescript
interface MissingSymbolDetail{id: string;  symbolName: string;  codeFilePath: string;  docFilePath: string;  reason: 'file_not_found' | 'symbol_not_found'; }
```

*This content is a placeholder. Run 'sintesi generate' with a valid AI API key to generate full documentation.*
<!-- sintesi:end id="49f0e557-1c6f-4ea2-b9fc-c8f44efcd7d4" -->


### SintesiConfig

<!-- sintesi:start id="f784f178-4d6d-478e-b4c7-284f00991679" code_ref="packages/cli/src/types/index.ts#SintesiConfig" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="f784f178-4d6d-478e-b4c7-284f00991679" -->


### AIProvider

<!-- sintesi:start id="6a0bced8-e074-4326-9a8c-49d1106e57d5" code_ref="packages/cli/src/types/index.ts#AIProvider" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="6a0bced8-e074-4326-9a8c-49d1106e57d5" -->


### InitResult

<!-- sintesi:start id="2856fa79-7297-47cf-acbe-c4cfe5cae0cd" code_ref="packages/cli/src/types/index.ts#InitResult" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="2856fa79-7297-47cf-acbe-c4cfe5cae0cd" -->


### ChangesetResult

<!-- sintesi:start id="778771bb-a7a6-4af2-9773-63508bfd85f9" code_ref="packages/cli/src/types/index.ts#ChangesetResult" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="778771bb-a7a6-4af2-9773-63508bfd85f9" -->


### ChangesetOptions

<!-- sintesi:start id="5ac10660-3b8b-466d-b948-897eb308a4db" code_ref="packages/cli/src/types/index.ts#ChangesetOptions" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="5ac10660-3b8b-466d-b948-897eb308a4db" -->


### GenerateResult

<!-- sintesi:start id="31732ec2-c71a-4dd4-9f16-ac651fe9a20d" code_ref="packages/cli/src/types/index.ts#GenerateResult" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="31732ec2-c71a-4dd4-9f16-ac651fe9a20d" -->


### GenerateOptions

<!-- sintesi:start id="33735fdb-3ab0-4ee3-b7f7-c8bb70995cc9" code_ref="packages/cli/src/types/index.ts#GenerateOptions" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="33735fdb-3ab0-4ee3-b7f7-c8bb70995cc9" -->


### InitOptions

<!-- sintesi:start id="7a067762-58cf-4973-b3cf-cd5460e5c221" code_ref="packages/cli/src/types/index.ts#InitOptions" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="7a067762-58cf-4973-b3cf-cd5460e5c221" -->


### FixOptions

<!-- sintesi:start id="7884a1b8-094e-44c5-97e5-d18517139c62" code_ref="packages/cli/src/types/index.ts#FixOptions" -->
**FixOptions** - Documentation needs generation

Current signature:
```typescript
interface FixOptions{map?: string;  verbose?: boolean;  dryRun?: boolean;  autoCommit?: boolean;  interactive?: boolean;  noAI?: boolean;  prune?: boolean; }
```

*This content is a placeholder. Run 'sintesi generate' with a valid AI API key to generate full documentation.*
<!-- sintesi:end id="7884a1b8-094e-44c5-97e5-d18517139c62" -->


### CheckOptions

<!-- sintesi:start id="debe2be9-52bd-4b19-b479-c8002723af48" code_ref="packages/cli/src/types/index.ts#CheckOptions" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="debe2be9-52bd-4b19-b479-c8002723af48" -->


### CLIConfig

<!-- sintesi:start id="534443c8-74a9-4047-96ce-f0fc56208cba" code_ref="packages/cli/src/types/index.ts#CLIConfig" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="534443c8-74a9-4047-96ce-f0fc56208cba" -->


### FixDetail

<!-- sintesi:start id="9afc0e9f-8dc9-4139-a3bd-fab9367ae24d" code_ref="packages/cli/src/types/index.ts#FixDetail" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="9afc0e9f-8dc9-4139-a3bd-fab9367ae24d" -->


### FixResult

<!-- sintesi:start id="cb2934b8-4abb-4671-8c2c-39fa90cd8dff" code_ref="packages/cli/src/types/index.ts#FixResult" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="cb2934b8-4abb-4671-8c2c-39fa90cd8dff" -->


### DriftDetail

<!-- sintesi:start id="5be2d6d9-33ea-42de-b9af-b41853d67503" code_ref="packages/cli/src/types/index.ts#DriftDetail" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="5be2d6d9-33ea-42de-b9af-b41853d67503" -->


### CheckResult

<!-- sintesi:start id="2b3114ca-4363-4fbf-9ed7-cf7af9f82bdd" code_ref="packages/cli/src/types/index.ts#CheckResult" -->
**Purpose:** The CheckResult interface defines the structure of the results returned from a check operation, encapsulating relevant metrics about the entries processed.

**Parameters:**
- `totalEntries` (`number`): The total number of entries processed in the check operation.
- `driftedEntries` (`number`): The number of entries that have drifted from their expected state.
- `missingEntries` (`number`): The count of entries that are missing from the expected dataset.
- `untrackedEntries` (optional) (`number`): The number of entries that are present but not tracked in the expected dataset. Default: `undefined`
- `drifts` (`DriftDetail[]`): An array of details about the drifts found during the check.
- `missing` (`MissingSymbolDetail[]`): An array of details about the missing entries.
- `success` (`boolean`): Indicates whether the check operation was successful or not.
- `configError` (optional) (`string`): An optional string describing any configuration errors encountered during the check. Default: `undefined`

**Returns:** `void` - This interface does not have a return type as it is a definition for an object structure.

**Usage Example:**
```typescript
const result: CheckResult = { totalEntries: 100, driftedEntries: 5, missingEntries: 2, drifts: [], missing: [], success: true };
```
<!-- sintesi:end id="2b3114ca-4363-4fbf-9ed7-cf7af9f82bdd" -->


Auto-generated documentation via Sintesi.

