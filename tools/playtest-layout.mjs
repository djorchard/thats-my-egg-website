export function playtest() {
  return `<div class="content-width playtest-page">
    <div class="playtest-intro"><p class="label">ORCHARD STUDIOS</p><h1>Become an early playtester</h1><p>Help us test That's my Egg! while it's in development. Add your Roblox username to the list and we'll invite players as testing opens.</p><p class="muted">This is a signup list, not immediate access to the game.</p></div>
    <section class="playtest-panel" aria-labelledby="signup-heading">
      <div id="signup-content"><h2 id="signup-heading">Join the list</h2>
        <form id="playtest-form" novalidate>
          <label for="roblox-username">Roblox username</label>
          <input id="roblox-username" name="username" type="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="20" required aria-describedby="username-help signup-status" placeholder="Your Roblox username">
          <p id="username-help" class="field-help">Use your username, not your display name. We don't need your password.</p>
          <div id="playtest-verification" class="playtest-verification"></div>
          <p class="signup-privacy">Orchard Studios will use your Roblox username to arrange early playtesting. Your username won't be shown publicly.</p>
          <button id="signup-submit" class="button" type="submit">Join the early playtest <span aria-hidden="true">→</span></button>
          <p id="signup-status" class="signup-status" role="status" aria-live="polite"></p>
        </form>
      </div>
      <div id="signup-success" class="signup-success" hidden tabindex="-1"><p class="label">EARLY PLAYTEST</p><h2>You're on the list.</h2><p>Look for a friend request from <strong>OrchardStudios</strong>.</p><p class="success-account" id="signup-account"></p><a class="text-link" href="../updates/index.html">Read the latest development news <span aria-hidden="true">→</span></a></div>
      <noscript><p class="signup-status">Please enable JavaScript to join the playtester list.</p></noscript>
    </section>
    <aside class="playtest-note"><h2>What to expect</h2><p>We're still building and testing the game. Features, creatures, and balance can change. Test invitations will come from the Roblox account <strong>OrchardStudios</strong>.</p></aside>
  </div><script type="module" src="../playtest.js"></script>`;
}
