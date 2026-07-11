/* Backstage auth module (B0).
   All token handling goes through msal-browser (vendored, v3.30.0).
   No hand-rolled OAuth anywhere in this app — that rule is load-bearing. */
(function () {
  'use strict';

  var MS_CLIENT_ID = '10cb66fb-13a0-4999-a9fa-dbfa245d0247'; // "Larry Tools" app registration
  var MS_TENANT_ID = 'c12a9d4f-9d34-44de-a16b-3ebae0474c37';
  var SCOPES = ['Files.ReadWrite', 'User.Read'];

  var msalApp = new msal.PublicClientApplication({
    auth: {
      clientId: MS_CLIENT_ID,
      authority: 'https://login.microsoftonline.com/' + MS_TENANT_ID,
      // Dynamic so the same file works on Pages prod and any future URL,
      // as long as that URL is registered as an SPA redirect in Azure.
      redirectUri: window.location.origin + window.location.pathname,
      postLogoutRedirectUri: window.location.origin + window.location.pathname
    },
    cache: {
      // localStorage so the installed PWA stays signed in across launches
      cacheLocation: 'localStorage'
    }
  });

  var BackstageAuth = {
    account: null,

    /* Resolves with the signed-in account or null. Call once on load. */
    init: function () {
      return msalApp.initialize()
        .then(function () { return msalApp.handleRedirectPromise(); })
        .then(function (result) {
          if (result && result.account) {
            msalApp.setActiveAccount(result.account);
          } else {
            var accounts = msalApp.getAllAccounts();
            if (accounts.length > 0) msalApp.setActiveAccount(accounts[0]);
          }
          BackstageAuth.account = msalApp.getActiveAccount();
          return BackstageAuth.account;
        });
    },

    signIn: function () {
      return msalApp.loginRedirect({ scopes: SCOPES });
    },

    signOut: function () {
      return msalApp.logoutRedirect({ account: msalApp.getActiveAccount() });
    },

    /* Silent first; interactive redirect only when MSAL says it must. */
    getToken: function () {
      var account = msalApp.getActiveAccount();
      if (!account) return Promise.reject(new Error('not-signed-in'));
      return msalApp.acquireTokenSilent({ scopes: SCOPES, account: account })
        .then(function (result) { return result.accessToken; })
        .catch(function (err) {
          if (err instanceof msal.InteractionRequiredAuthError) {
            return msalApp.acquireTokenRedirect({ scopes: SCOPES });
          }
          throw err;
        });
    }
  };

  window.BackstageAuth = BackstageAuth;
})();
