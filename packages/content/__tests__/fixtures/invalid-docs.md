# Invalid Documentation

This file contains various invalid anchor formats for testing error handling.

## Missing End Anchor

<!-- sintesi:start id="missing-end" code_ref="src/test.ts#test" -->
This anchor is never closed.

## Duplicate IDs

<!-- sintesi:start id="duplicate" code_ref="src/test.ts#test1" -->
First anchor with this ID.
<!-- sintesi:end id="duplicate" -->

<!-- sintesi:start id="duplicate" code_ref="src/test.ts#test2" -->
Second anchor with the same ID - this should be caught.
<!-- sintesi:end id="duplicate" -->

## Invalid Code Ref Format

<!-- sintesi:start id="invalid-ref" code_ref="invalid-format-without-hash" -->
This code_ref is missing the # separator.
<!-- sintesi:end id="invalid-ref" -->
