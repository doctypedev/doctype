# Native-types.d

Auto-generated documentation via Sintesi.


## API Reference

### AnalysisResultJs

<!-- sintesi:start id="8e1df251-fb79-4132-a1de-021411ab3477" code_ref="packages/core/native-types.d.ts#AnalysisResultJs" -->
**AnalysisResultJs** - Documentation needs generation

Current signature:
```typescript
interface AnalysisResultJs{signatures: Array<CodeSignature>;  errors: Array<string>; }
```

*This content is a placeholder. Run 'sintesi generate' with a valid AI API key to generate full documentation.*
<!-- sintesi:end id="8e1df251-fb79-4132-a1de-021411ab3477" -->


### parseCodeRef

<!-- sintesi:start id="107fdaf5-4029-4ad6-87fc-502906c49378" code_ref="packages/core/native-types.d.ts#parseCodeRef" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="107fdaf5-4029-4ad6-87fc-502906c49378" -->


### CodeRefParts

<!-- sintesi:start id="b550cfae-f8d4-4060-b03d-d5aa517fb3c0" code_ref="packages/core/native-types.d.ts#CodeRefParts" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="b550cfae-f8d4-4060-b03d-d5aa517fb3c0" -->


### validateMarkdownAnchors

<!-- sintesi:start id="db771474-e384-43d6-a840-cff0f5afc1f6" code_ref="packages/core/native-types.d.ts#validateMarkdownAnchors" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="db771474-e384-43d6-a840-cff0f5afc1f6" -->


### extractAnchors

<!-- sintesi:start id="640293a7-a517-46d9-b80e-e9345cf3f4ad" code_ref="packages/core/native-types.d.ts#extractAnchors" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="640293a7-a517-46d9-b80e-e9345cf3f4ad" -->


### ExtractionResult

<!-- sintesi:start id="81f86c91-fc03-4aed-88c8-6dc0946d7363" code_ref="packages/core/native-types.d.ts#ExtractionResult" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="81f86c91-fc03-4aed-88c8-6dc0946d7363" -->


### SintesiAnchor

<!-- sintesi:start id="9dad6b20-53f2-44c2-884f-222986689fa2" code_ref="packages/core/native-types.d.ts#SintesiAnchor" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="9dad6b20-53f2-44c2-884f-222986689fa2" -->


### AstAnalyzer

<!-- sintesi:start id="1db1d9a7-f693-446f-a1b7-10b32e6df4b2" code_ref="packages/core/native-types.d.ts#AstAnalyzer" -->
**AstAnalyzer**

The `AstAnalyzer` class provides methods to analyze files and code snippets, returning structured data about the code's syntax and semantics.

**Constructor**  
- `constructor()`: Initializes an instance of the `AstAnalyzer`.

**Methods**  
- `analyzeFile(filePath: string): Array<CodeSignature>`  
  Analyzes a file specified by its path.  
  - **Parameters**:  
    - `filePath` (string): The path to the file to be analyzed.  
  - **Returns**:  
    - `Array<CodeSignature>`: An array of code signatures extracted from the analyzed file.

- `analyzeCode(code: string): Array<CodeSignature>`  
  Analyzes a string of code.  
  - **Parameters**:  
    - `code` (string): A string containing the code to be analyzed.  
  - **Returns**:  
    - `Array<CodeSignature>`: An array of code signatures extracted from the analyzed code.

- `analyzeWithErrors(code: string): AnalysisResultJs`  
  Analyzes a string of code and also detects any syntax or semantic errors.  
  - **Parameters**:  
    - `code` (string): A string containing the code to be analyzed along with error detection.  
  - **Returns**:  
    - `AnalysisResultJs`: An object containing the results of the analysis, including any errors found.

**Usage Example**  
```typescript
const analyzer = new AstAnalyzer();

// Analyzing a file
const fileSignatures = analyzer.analyzeFile('path/to/file.ts');

// Analyzing a code snippet directly
const codeSignatures = analyzer.analyzeCode('const a = 5;');

// Analyzing with error detection
const analysisResult = analyzer.analyzeWithErrors('const b = ;');  // [Syntax Error]
```
<!-- sintesi:end id="1db1d9a7-f693-446f-a1b7-10b32e6df4b2" -->


### discoverFiles

<!-- sintesi:start id="70e7299a-4838-4f50-8bb7-e4e5d6661b3b" code_ref="packages/core/native-types.d.ts#discoverFiles" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="70e7299a-4838-4f50-8bb7-e4e5d6661b3b" -->


### FileDiscoveryOptions

<!-- sintesi:start id="1281db7f-990f-43e3-8a72-85aac8108db7" code_ref="packages/core/native-types.d.ts#FileDiscoveryOptions" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="1281db7f-990f-43e3-8a72-85aac8108db7" -->


### FileDiscoveryResult

<!-- sintesi:start id="e8cd0d98-a350-4158-a149-091bda7fe2bb" code_ref="packages/core/native-types.d.ts#FileDiscoveryResult" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="e8cd0d98-a350-4158-a149-091bda7fe2bb" -->


### getVersion

<!-- sintesi:start id="600a04ba-b9aa-4979-a1f6-8c1baeec0f21" code_ref="packages/core/native-types.d.ts#getVersion" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="600a04ba-b9aa-4979-a1f6-8c1baeec0f21" -->


### helloWorld

<!-- sintesi:start id="ce2af620-f6c2-44ce-9037-2cea0cde888f" code_ref="packages/core/native-types.d.ts#helloWorld" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="ce2af620-f6c2-44ce-9037-2cea0cde888f" -->


### SintesiMap

<!-- sintesi:start id="eec0c573-09dc-4052-abfe-0551d2c6be25" code_ref="packages/core/native-types.d.ts#SintesiMap" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="eec0c573-09dc-4052-abfe-0551d2c6be25" -->


### SintesiMapEntry

<!-- sintesi:start id="ffbf03bf-8220-42c2-a64a-e576072a7f51" code_ref="packages/core/native-types.d.ts#SintesiMapEntry" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="ffbf03bf-8220-42c2-a64a-e576072a7f51" -->


### DocRef

<!-- sintesi:start id="d920d10b-57ca-41b6-b0a8-62fc7bde590a" code_ref="packages/core/native-types.d.ts#DocRef" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="d920d10b-57ca-41b6-b0a8-62fc7bde590a" -->


### SignatureHash

<!-- sintesi:start id="7aa6c3f6-f428-45cb-8672-feb419fea9ab" code_ref="packages/core/native-types.d.ts#SignatureHash" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="7aa6c3f6-f428-45cb-8672-feb419fea9ab" -->


### SymbolType



### CodeSignature

<!-- sintesi:start id="f4a365a1-d9cb-4e08-b431-b7f22a38bf13" code_ref="packages/core/native-types.d.ts#CodeSignature" -->
**CodeSignature Interface**

The `CodeSignature` interface represents a signature for a code symbol, providing essential information about its identity and usage in the codebase.

**Properties:**

- **symbolName**: `string`  
  The name of the symbol. This should be a valid identifier string representing the symbol within the code.

- **symbolType**: `SymbolType`  
  The type of the symbol, represented by the `SymbolType` enumeration, which defines various categories of symbols (e.g., function, class, variable).

- **signatureText**: `string`  
  A textual representation of the signature, useful for documentation and understanding the parameters and return types of functions or methods.

- **isExported**: `boolean`  
  Indicates whether the symbol is exported and accessible from other modules. A value of `true` means the symbol can be imported; `false` means it cannot.

- **hash**?: `string`  
  An optional property that represents a hash of the symbol, used for versioning or change detection purposes.

**Return Type:**

The `CodeSignature` interface does not have a return type as it is used to define the structure of an object rather than a function or method.

**Usage Example:**

```typescript
const exampleSignature: CodeSignature = {
    symbolName: "myFunction",
    symbolType: SymbolType.Function,
    signatureText: "function myFunction(param1: string, param2: number): void",
    isExported: true,
    hash: "abc123xyz"
};
``` 

In this example, `exampleSignature` describes a function named `myFunction` that takes a string and a number as parameters and does not return a value. It is marked as exported, and a hash is provided for reference.
<!-- sintesi:end id="f4a365a1-d9cb-4e08-b431-b7f22a38bf13" -->



### CodeRef

<!-- sintesi:start id="a288cba2-1481-426b-8003-8548b27c16bc" code_ref="packages/core/native-types.d.ts#CodeRef" -->
TODO: Add documentation for this symbol
<!-- sintesi:end id="a288cba2-1481-426b-8003-8548b27c16bc" -->
