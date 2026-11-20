/** Composition edits commit through the Composer save queue. Mapping and Content expose a Save button. */
export function explicitSaveControl(domain) {
  return domain !== 'compositions';
}
