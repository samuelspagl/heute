// Target destination: server/routes/auth/github.get.ts
// IMPORTANT: The database mapping below is intentionally a placeholder.
import { sendRedirect } from 'nuxt/server'

export default defineOAuthGitHubEventHandler({
  async onSuccess(event, { user }) {
    // TODO: Look up or create the INTERNAL app user for GitHub provider ID:
    // const appUser = await users.findOrCreateFromProvider('github', String(user.id))
    // Do not treat the remote provider ID as an app-wide authorization decision.
    const appUser = await resolveInternalUserFromGitHub(String(user.id)) // implement this server-side

    await setUserSession(event, {
      user: { id: appUser.id, name: appUser.name },
      loggedInAt: new Date().toISOString()
    })
    return sendRedirect(event, '/')
  },
  onError(event, error) {
    // Log a redacted error in real code; avoid exposing OAuth secrets.
    console.error('GitHub OAuth failed:', error.message)
    return sendRedirect(event, '/login?error=oauth')
  }
})

// EXAMPLE ONLY: `resolveInternalUserFromGitHub` must be implemented in your app.
// Configure NUXT_OAUTH_GITHUB_CLIENT_ID and NUXT_OAUTH_GITHUB_CLIENT_SECRET.
// Register https://your-domain.example/auth/github with GitHub.
