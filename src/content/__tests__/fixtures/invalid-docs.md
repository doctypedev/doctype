# Invalid Documentation

This file contains various invalid anchor formats for testing error handling.

## Missing End Anchor

<!-- doctype:start id="missing-end" code_ref="src/test.ts#test" -->
This anchor is never closed.

## Duplicate IDs

<!-- doctype:start id="duplicate" code_ref="src/test.ts#test1" -->
First anchor with this ID.
<!-- doctype:end id="duplicate" -->

<!-- doctype:start id="duplicate" code_ref="src/test.ts#test2" -->
Second anchor with the same ID - this should be caught.
<!-- doctype:end id="duplicate" -->

## Invalid Code Ref Format

<!-- doctype:start id="invalid-ref" code_ref="invalid-format-without-hash" -->
This code_ref is missing the # separator.
<!-- doctype:end id="invalid-ref" -->
