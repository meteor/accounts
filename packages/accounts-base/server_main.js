import {AccountsServer} from "./accounts_server.js";
import "./accounts_rate_limit.js";
import "./url_server.js";
import {AccountsProvider} from "./accounts_provider";



/**
 * @namespace Accounts
 * @summary The namespace for all server-side accounts-related methods.
 */
Accounts = new AccountsServer(Meteor.server);

// TODO: determine how server-aware and backward compatible code should work
//       How does server-aware code get an instance of accountsProvider?
//       How does backward compatible code access accountsProvider through users?
//       Do we need to make Meteor.users abstract?
//       Do we need to add Meteor.dataProvider global?
//


// Users table. Don't use the normal autopublish, since we want to hide
// some fields. Code to autopublish this is in accounts_server.js.
// XXX Allow users to configure this collection name.

/**
 * @summary A [Mongo.Collection](#collections) containing user documents.
 * @locus Anywhere
 * @type {Mongo.Collection}
 * @importFromPackage meteor
*/
Meteor.users = Accounts.accountsProvider;  //Accounts.users;
Meteor.dataProvider = Accounts.accountsProvider;

export {
  // Since this file is the main module for the server version of the
  // accounts-base package, properties of non-entry-point modules need to
  // be re-exported in order to be accessible to modules that import the
  // accounts-base package.
  AccountsServer
};
