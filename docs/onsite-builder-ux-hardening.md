# On-site builder dashboard integration

Branch: `codex/onsite-builder-ux-hardening`, based on `c8d78189fff568aec16b7eafd6ba605955179231` from `codex/onsite-builder-cell-composition`.

The SDK owns the floating editor and cell interaction refinements. Dashboard changes are deliberately small: describe the available block/cell authoring capability and label the compact editor-launch button “Edit.” Existing builder choice locking, launch/session handling and reviewed-revision publishing are preserved.

New integration tests verify that a failed pending-settings save closes the launch popup and does not create an editor session, and that Review & publish uses the latest revision saved by the live editor without overwriting its content with a stale dashboard draft.

Validation: dashboard production build passes; six focused integration tests pass. Full dashboard suite: 273 passed, 14 failed. The same 14 failures were reproduced before changes: older Guide/Survey controls and navigation expectations in Experiences, an invitation field, and a funnel metric assertion. Existing tests remain intact. The existing large-chunk build warning remains.

No dashboard redesign, framework addition, merge or deployment was performed. Use the corresponding SDK/backend branches together. The SDK's `docs/onsite-builder-ux-hardening.md` contains the full report, bundle comparison, browser coverage and remaining risks.
