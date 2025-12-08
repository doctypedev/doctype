# Check

Auto-generated documentation via Doctype.


## API Reference

### result

<!-- doctype:start id="1d0d419c-5f3c-4aff-8f9a-412030c45bad" code_ref="packages/cli/src/commands/check.ts#result" -->
**Purpose:** The 'result' variable holds an object that summarizes the outcome of a check operation, indicating the counts of total, drifted, and missing entries, as well as the success status of the check.

**Returns:** `CheckResult` - An object containing the total number of entries checked, the number of drifted entries, the number of missing entries, arrays of drifted and missing entries, and a success flag.

**Usage Example:**
```typescript
const result: CheckResult = { totalEntries: entries.length, driftedEntries: drifts.length, missingEntries: missingDetails.length, drifts, missing: missingDetails, success: drifts.length === 0 && missingDetails.length === 0 };
```
<!-- doctype:end id="1d0d419c-5f3c-4aff-8f9a-412030c45bad" -->


### drift

<!-- doctype:start id="9fa23357-e6e3-432d-811e-e8b853bd393b" code_ref="packages/cli/src/commands/check.ts#drift" -->
TODO: Add documentation for this symbol
<!-- doctype:end id="9fa23357-e6e3-432d-811e-e8b853bd393b" -->


### drifts

<!-- doctype:start id="fc49cdc2-9223-44d6-970e-a7015344f50c" code_ref="packages/cli/src/commands/check.ts#drifts" -->
TODO: Add documentation for this symbol
<!-- doctype:end id="fc49cdc2-9223-44d6-970e-a7015344f50c" -->


### detectedDrifts

<!-- doctype:start id="2ae8ddcd-9105-4369-ab50-1c670feddd81" code_ref="packages/cli/src/commands/check.ts#detectedDrifts" -->
TODO: Add documentation for this symbol
<!-- doctype:end id="2ae8ddcd-9105-4369-ab50-1c670feddd81" -->


### analyzer

<!-- doctype:start id="2bbe2e02-e521-4a61-b449-504b08c54819" code_ref="packages/cli/src/commands/check.ts#analyzer" -->
TODO: Add documentation for this symbol
<!-- doctype:end id="2bbe2e02-e521-4a61-b449-504b08c54819" -->


### codeRoot

<!-- doctype:start id="06e6ccfe-9be0-4ef2-8861-7197a73f12d8" code_ref="packages/cli/src/commands/check.ts#codeRoot" -->
TODO: Add documentation for this symbol
<!-- doctype:end id="06e6ccfe-9be0-4ef2-8861-7197a73f12d8" -->


### entries

<!-- doctype:start id="c3271a77-c0cb-42eb-9335-edbbe8b4da8b" code_ref="packages/cli/src/commands/check.ts#entries" -->
TODO: Add documentation for this symbol
<!-- doctype:end id="c3271a77-c0cb-42eb-9335-edbbe8b4da8b" -->


### mapManager

<!-- doctype:start id="4cfdbda4-e083-4c7c-9f3e-23c7abdec0d9" code_ref="packages/cli/src/commands/check.ts#mapManager" -->
TODO: Add documentation for this symbol
<!-- doctype:end id="4cfdbda4-e083-4c7c-9f3e-23c7abdec0d9" -->


### mapPath

<!-- doctype:start id="78914c6a-b03a-4a71-8ac4-6aa396e22690" code_ref="packages/cli/src/commands/check.ts#mapPath" -->
TODO: Add documentation for this symbol
<!-- doctype:end id="78914c6a-b03a-4a71-8ac4-6aa396e22690" -->


### config

<!-- doctype:start id="de7976f7-b477-43bd-a6b0-32b48f30061c" code_ref="packages/cli/src/commands/check.ts#config" -->
TODO: Add documentation for this symbol
<!-- doctype:end id="de7976f7-b477-43bd-a6b0-32b48f30061c" -->


### logger

<!-- doctype:start id="f4451f82-5603-4a7d-bbbe-0518a3637c00" code_ref="packages/cli/src/commands/check.ts#logger" -->
TODO: Add documentation for this symbol
<!-- doctype:end id="f4451f82-5603-4a7d-bbbe-0518a3637c00" -->



### checkCommand

<!-- doctype:start id="a7be3032-531c-47e2-9233-504c4e7a8305" code_ref="packages/cli/src/commands/check.ts#checkCommand" -->
TODO: Add documentation for this symbol
<!-- doctype:end id="a7be3032-531c-47e2-9233-504c4e7a8305" -->
