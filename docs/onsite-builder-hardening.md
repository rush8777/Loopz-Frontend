# On-site builder dashboard hardening

Feature baseline `ca2ee9b`; isolated branch `codex/onsite-builder-phases-0-2-hardening`.

- Clean flush returns the last acknowledged draft and awaits pending saves without another PATCH. No-op mutations are skipped.
- Save snapshots are immutable and deduplicated. The revision advances only on acknowledgement. SDK-owned on-site content is never included in dashboard writes; only targeting is sent.
- Focus refresh checks dirty/pending/review state before issuing GET and again before accepting its result. Failed refresh retains the current draft.
- Failed/conflicting saves retain local state, show recovery controls, support export, and require confirmation to reload. Beforeunload protects pending/dirty drafts.
- Review fetches the latest saved draft. Publish sends its exact draftVersionId/revision. The backend atomically refuses a newer or replaced draft. Dashboard-owned changes made in the review update the acknowledged reviewed revision; remote changes require renewed review.
- List Publish actions enter the editor for review instead of directly publishing an unseen draft.
- Link/image URL control-character checks match SDK and backend contracts.

Production build passes. Focused dashboard save/authoring tests: 6/6; builder sanitizer/compatibility tests: 11/11. The full dashboard run before the final conflict-export regression had 269 pass and the same 13 known failures (InvitationPage 1, FunnelDetailPage 1, legacy Experiences 11). The additional conflict-export regression passes separately. These broader failures were not removed or weakened.

No database migration is needed. Backend publish contract must be rolled out together with the dashboard: old clients without reviewed-version information receive a validation error. No deployment/merge was performed. The unrelated local hero-video edit was excluded.

The SDK report `docs/onsite-builder-hardening.md` on the same branch documents root causes, all three repositories, bundle/performance measurements, positioning protection and browser limitations. Playwright scenarios were added; Cloud browser installation failed, so real-browser/Android/GrapesJS smoke checks remain pending.
