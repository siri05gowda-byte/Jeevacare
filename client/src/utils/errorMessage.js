// The server reports errors in several shapes: { message }, { error: 'text' },
// { error: { message } } and validation lists { errors: [{ msg }] }.
// This turns any of them into one plain sentence, so a screen never renders an object.
export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data;
  const candidates = [
    data?.errors?.[0]?.msg,
    data?.message,
    data?.error?.message,
    data?.error,
    error?.message,
  ];
  const found = candidates.find((value) => typeof value === 'string' && value.trim());
  return found || fallback;
}
