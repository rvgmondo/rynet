/**
 * Document controls the Cars edit screen does without.
 *
 * Unpublish: it only changes Payload's own save state. A car leaves the site when its Listing
 * status changes, so a button that says "Unpublish" and leaves the car on the site is a trap.
 *
 * Save draft: on a new car, a draft save still writes the car itself, with whatever Listing status
 * was chosen, so "draft" would not mean hidden. There is one Save button; autosave still keeps a
 * draft of unsaved changes in the car's history.
 *
 * UI only: the API is unchanged.
 */
export function NoUnpublishButton() {
  return null;
}

export function NoSaveDraftButton() {
  return null;
}
