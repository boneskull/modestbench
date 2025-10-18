# Specify Workflow - Create Feature Specification

**When to use**: Starting a new feature development. This workflow creates a structured specification from a natural language feature description.

**User input context**: The user will provide a feature description either in conversation or as part of the workflow invocation. This description should be treated as the primary input for specification generation.

## Execution Steps

1. Run the script `.specify/scripts/bash/create-new-feature.sh --json "$FEATURE_DESCRIPTION"` from repo root and parse its JSON output for BRANCH_NAME and SPEC_FILE. All file paths must be absolute.

   **IMPORTANT**: You must only ever run this script once. The JSON is provided in the terminal as output - always refer to it to get the actual content you're looking for.

2. Load `.specify/templates/spec-template.md` to understand required sections.

3. Write the specification to SPEC_FILE using the template structure, replacing placeholders with concrete details derived from the feature description while preserving section order and headings.

4. Report completion with branch name, spec file path, and readiness for the next phase.

## Important Notes

- The script creates and checks out the new branch and initializes the spec file before writing
- Use the feature description provided by the user as the basis for all specification content
- Maintain the template structure from `spec-template.md`
- All file paths must be absolute
- After completion, suggest running the clarify workflow if there are potential ambiguities

## Next Steps

After completing this workflow, recommend:

- Running the clarify workflow to resolve ambiguities
- Or proceeding directly to the plan workflow if the specification is clear
