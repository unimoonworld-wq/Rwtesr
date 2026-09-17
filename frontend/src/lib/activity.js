// Translate stored activity by event type, including entries saved before
// the product-copy update, without rewriting historical workspace data.
export const activityMessage = event => {
  if (event.kind === 'deposit') return 'INC added to your balance';
  if (event.kind === 'burn') return '25% INC permanently removed from supply';
  return event.message;
};