// Guest credentials are created on the player's device, never shared with other players.
// Hash the full 256-bit secret before using it as a database ID.
export async function playerIdentity(request) {
  const account = request.headers.get('oai-authenticated-user-id');
  if (account) return account;
  const match = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('Authorization') || '');
  if (!match) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(match[1]));
  return 'guest_' + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
