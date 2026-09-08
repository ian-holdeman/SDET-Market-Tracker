// Called only after confirmed sign-out or account deletion. Scope cleanup to this app's Auth keys.
export function clearLocalAuthState(local: Storage = localStorage, session: Storage = sessionStorage): void {
  const prefix = 'imt_supabase_auth';
  for (const key of Object.keys(local)) {
    if (key === prefix || key === `${prefix}-user` || key === `${prefix}-code-verifier` ||
        key === `${prefix}-flows-code-verifier` || /^imt_supabase_auth-flow-[a-f0-9]+-code-verifier$/.test(key) || key === 'imt_active_user_session') {
      local.removeItem(key);
    }
  }
  session.removeItem('imt_oauth_return');
}
