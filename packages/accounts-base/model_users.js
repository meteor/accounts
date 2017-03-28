/**
 * Created by sing on 2/3/16.
 *
 * WORK IN PROGRESS
 */



export class ModelUsers {
    constructor(conn, options) {
        // Currently this is read directly by packages like accounts-password
        // and accounts-ui-unstyled.
        this._options = {};
        this.connection = conn
        this.users = new Mongo.Collection("users", {
            _preventAutopublish: true,
            connection: this.connection
        });
    }


    insertUser(fullUser) {
        var userId;

        try {
            userId = this.users.insert(fullUser);
        } catch (e) {
            // XXX string parsing sucks, maybe
            // https://jira.mongodb.org/browse/SERVER-3069 will get fixed one day
            if (e.name !== 'MongoError') throw e;
            if (e.code !== 11000) throw e;
            if (e.err.indexOf('emails.address') !== -1)
                throw new Meteor.Error(403, "Email already exists.");
            if (e.err.indexOf('username') !== -1)
                throw new Meteor.Error(403, "Username already exists.");
            // XXX better error reporting for services.facebook.id duplicate, etc
            throw e;
        }
        return userId;
    }
    expireTokens(oldestValidDate, userId) {

        var userFilter = userId ? {_id: userId} : {};


        // Backwards compatible with older versions of meteor that stored login token
        // timestamps as numbers.
        this.users.update(_.extend(userFilter, {
            $or: [
                {"services.resume.loginTokens.when": {$lt: oldestValidDate}},
                {"services.resume.loginTokens.when": {$lt: +oldestValidDate}}
            ]
        }), {
            $pull: {
                "services.resume.loginTokens": {
                    $or: [
                        {when: {$lt: oldestValidDate}},
                        {when: {$lt: +oldestValidDate}}
                    ]
                }
            }
        }, {multi: true});
        // The observe on Meteor.users will take care of closing connections for
        // expired tokens.
    }


   clearAllLoginTokens(userId) {
       this.users.update(userId, {
           $set: {
               'services.resume.loginTokens': []
           }
       });
   }

   insertHLoginToken(userId, hashedToken, qry) {
    // console.log("called insert login token " + userId + " --- " + JSON.stringify(hashedToken) + " query is " + JSON.stringify(qry));
       var query = qry ? _.clone(qry) : {};
       query._id = userId;
       this.users.update(query, {
           $addToSet: {
               "services.resume.loginTokens": hashedToken
           }
       });

   }
    findSingle(userid) {

        return this.users.findOne({_id: userid});
    }

   // user = Meteor.users.findOne({ _id: query.id });


    findCurrentUser(userId) {

        return this.users.find({
            _id: userId
        }, {
            fields: {
                profile: 1,
                username: 1,
                emails: 1
            }
        });
    }

    findUserWithNewtoken(hashedToken) {
      return  this.users.findOne(
            {"services.resume.loginTokens.hashedToken": hashedToken});
    }


    findUserWithNewOrOld(newToken, oldToken) {
      return  this.users.findOne({
            $or: [
                {"services.resume.loginTokens.hashedToken": newToken},
                {"services.resume.loginTokens.token": oldToken}
            ]
        });
    }
    deleteSavedTokens(userId, tokensToDelete) {

        if (tokensToDelete) {
            this.users.update(userId, {
                $unset: {
                    "services.resume.haveLoginTokensToDelete": 1,
                    "services.resume.loginTokensToDelete": 1
                },
                $pullAll: {
                    "services.resume.loginTokens": tokensToDelete
                }
            });
        }
    }
    deleteSavedTokensforAllUsers() {
        this.users.find({
            "services.resume.haveLoginTokensToDelete": true
        }, {
            "services.resume.loginTokensToDelete": 1
        }).forEach(function (user) {
            this.deleteSavedTokensForUser(
                user._id,
                user.services.resume.loginTokensToDelete
            );
        });
    }

    // eliminated accounts dependency
    removeOtherTokens(userId, curToken) {
        if (!userId) {
            throw new Meteor.Error("You are not logged in.");
        }
       // var currentToken = accounts._getLoginToken(connection.id);
        this.users.update(userId, {
            $pull: {
                "services.resume.loginTokens": {hashedToken: {$ne: curToken}}
            }
        });
    }

    // eliminated accounts dependency
    getNewToken(userId, curToken, newToken) {
        var user = this.users.findOne(userId, {
            fields: { "services.resume.loginTokens": 1 }
        });
        if (! userId || ! user) {
            throw new Meteor.Error("You are not logged in.");
        }
        // Be careful not to generate a new token that has a later
        // expiration than the curren token. Otherwise, a bad guy with a
        // stolen token could use this method to stop his stolen token from
        // ever expiring.
       //  var currentHashedToken = accounts._getLoginToken(connection.id);
        var currentStampedToken = _.find(
            user.services.resume.loginTokens,
            function (stampedToken) {
                return stampedToken.hashedToken === curToken;
            }
        );
        if (! currentStampedToken) { // safety belt: this should never happen
            throw new Meteor.Error("Invalid login token");
        }
        //var newStampedToken = accounts._generateStampedLoginToken();


        newToken.when = currentStampedToken.when;

        return newToken;

    }
  addNewHashedTokenIfOldUnhashedStillExists(userId, oldToken, newHashedToken, when) {
    //  console.log("called addNewHasedTokenIfOldUnhashedStillExists with userID " + userId + "oldToken= " + oldToken + "newToken =" + newHashedToken +  "when = " + when);
    this.users.update({_id: userId,
            "services.resume.loginTokens.token": oldToken},
    {
    $addToSet: {
        "services.resume.loginTokens":
        {
            "hashedToken":  newHashedToken,
                "when":when
        }
    }});
  }


   removeOldTokenAfterAddingNew(userid, oldToken) {
       // console.log("called removeOldTokenAfterAddingNew with userID " + userid + "oldToken= " + oldToken);

       this.users.update(userid, {
           $pull: {
               "services.resume.loginTokens": {"token": oldToken}
           }
       });
   }

    destroyToken(userId, loginToken) {

        this.users.update(userId, {
            $pull: {
                "services.resume.loginTokens": {
                    $or: [
                        {hashedToken: loginToken},
                        {token: loginToken}
                    ]
                }
            }
        });

    }

    findSingleLoggedIn(userId) {
       return this.users.findOne(userId, {
            fields: {
                "services.resume.loginTokens": true
            }
        });
    }

    saveTokenAndDeleteLater(userId, tokens, hashedStampedToken) {
        this.users.update(userId, {
            $set: {
                "services.resume.loginTokensToDelete": tokens,
                "services.resume.haveLoginTokensToDelete": true
            },
            $push: {"services.resume.loginTokens": hashedStampedToken}
        });

    }

    // password_server requirements

   findByResetToken(token) {
     return this.users.findOne({"services.password.reset.token": token});
   }

   findByVerificationTokens(token) {
       return this.users.findOne({"services.email.verificationTokens.token": token});
   }
    updateToBcrypt(userid, salted) {
     this.users.update(userid, {$unset: { 'services.password.srp': 1 }, $set: { 'services.password.bcrypt': salted }});
    }

    setUsername(userid, username) {
        this.users.update({_id: userid}, {$set: {username: username}});
    }

    replaceAllTokensOtherThanCurrentConnection(userId, hashed, currentToken) {
        this.users.update({ _id: userId },
        {
            $set: { 'services.password.bcrypt': hashed },
            $pull: {
                'services.resume.loginTokens': { hashedToken: { $ne: currentToken } }
                    },
            $unset: { 'services.password.reset': 1 }
        }
        );
    }

    changePasswordResetVerifyEmail(userid, email, token, hashed) {
       return this.users.update(
        {
            _id: userid,
            'emails.address': email,
            'services.password.reset.token': token
        },
        {$set: {'services.password.bcrypt': hashed,
            'emails.$.verified': true},
            $unset: {'services.password.reset': 1,
                'services.password.srp': 1}});
    }

    setVerificationTokens(userId, tokenRecord) {
        this.users.update(
            {_id: userId},
            {$push: {'services.email.verificationTokens': tokenRecord}});
    }

    setResetToken(userId, tokenRecord) {
        this.users.update(userId, {
            $set: {
                "services.password.reset": tokenRecord
            }
        });
    }

    setEmailVerified(userid, addr) {
        this.users.update({_id: userid, 'emails.address': addr},
            {
                $set: {'emails.$.verified': true},
                $pull: {'services.email.verificationTokens': {address: addr}}
            });
    }

    addEmailVerified(userId, email, verified) {
        this.users.update(
            {_id: userId},
            {$push: {emails: {address: email, verified: verified}}});
    }

    setNewEmailVerified(userid, email, newEmail, verified) {
        this.users.update({_id: userid, 'emails.address': email},
            {
                $set: {
                    'emails.$.address': newEmail,
                    'emails.$.verified': verified
                }
            });
    }


    addEmailAddressVerified(userid, newEmail, verified) {
        this.users.update({_id: userid},
            {
                $addToSet: {
                    emails: {
                        address: newEmail,
                        verified: verified
                    }
                }
            });
    }
    forceChangePassword(userid, hashedPassword, loggedout) {
        var update = {
            $unset: {
                'services.password.srp': 1, // XXX COMPAT WITH 0.8.1.3
                'services.password.reset': 1
            },
            $set: {'services.password.bcrypt': hashedPassword }
        };

        if (loggedout) {
            update.$unset['services.resume.loginTokens'] = 1;
        }

        this.users.update({_id: userid}, update);
    }

    undoEmailAddressUpdate(userid, newEmail) {
        this.users.update({_id: userid}, {$pull: {emails: {address: newEmail}}});
    }

    setSRP(userId, identity, salt, verifier) {
        this.users.update(
            userId,
            {
                '$set': {
                    'services.password.srp': {
                        "identity": identity,
                        "salt": salt,
                        "verifier": verifier
                    }
                }
            });
    }

    //  The following are mostly used in setup of package tests  - via TinyTest
    findByUsername(username) {
     return this.users.findOne({username: username});
    }
    removeByUsername(username) {
     return this.users.remove({username: username});
    }

    unsetProfile(userId) {
        this.users.update(userId,
        {$unset: {profile: 1, username: 1}});
    }

    findById(userId) {
       return this.users.findOne(userId);
    }
    findByService(selector) {
      return this.users.findOne(selector);
    }
    // this needs to be tighten up
    findOneBySelector(selector) {
        return this.users.findOne(selector);
    }
    findBySelector(selector) {
        return this.users.find(selector);
    }
    updateAttributes(userid,attrs ) {
        this.users.update(userid, {
            $set: attrs
        });
    }

    setResumeTokens(userId, tokens) {
        this.users.update(userId,
            {  $set: {"services.resume.loginTokens": tokens }});
    }


    removeById(userId) {
        this.users.remove(userId);
    }

    insertLoginToken(userId, stampedToken) {
        // console.log("INSERT normal login token - userid is " + userId + " token is " + JSON.stringify(stampedToken));
        this.users.update(
            userId,
            {$push: {'services.resume.loginTokens': stampedToken}}
        );
    }

    findUsersByService(servicehash) {
        return this.users.find(servicehash).fetch();
    }
    findUsersInServices(serviceIdsArray) {
        return this.users.find({"services.weibo.id": {$in: serviceIdsArray}});
    }
    getMongoUsersForReactiveWork() {
        // only hook available to support reactivity when backed by mongo
        // alternative data providers will return null
        return this.users;
    }

    // and methods required in account-password package tests
    updateEmail(userId, newEmail) {
        this.users.update(userId, {$set: {"emails.0.address": newEmail}});
    }
    updateDisallowedAndProfile(userId, disallowed, profile , func) {
        this.users.update(userId, {$set: {disallowed: disallowed, 'profile.updated': profile}}, func);
    }

    updateProfile(userId, profile, func ) {
        this.users.update(userId, {$set: {'profile.updated': profile}}, func);
    }
    updateProfileByUsername(uname, profile) {
        this.users.update({username: uname}, {$set: {'profile.updated': profile}});
    }

    setupUsersCollection() {
        this.users.allow({
            // clients can modify the profile field of their own document, and
            // nothing else.
            update: function (userId, user, fields, modifier) {
                // make sure it is our record
                if (user._id !== userId)
                    return false;

                // user can only modify the 'profile' field. sets to multiple
                // sub-keys (eg profile.foo and profile.bar) are merged into entry
                // in the fields list.
                if (fields.length !== 1 || fields[0] !== 'profile')
                    return false;

                return true;
            },
            fetch: ['_id'] // we only look at _id.
        });

        /// DEFAULT INDEXES ON USERS
        this.users._ensureIndex('username', {unique: 1, sparse: 1});
        this.users._ensureIndex('emails.address', {unique: 1, sparse: 1});
        this.users._ensureIndex('services.resume.loginTokens.hashedToken',
            {unique: 1, sparse: 1});
        this.users._ensureIndex('services.resume.loginTokens.token',
            {unique: 1, sparse: 1});
        // For taking care of logoutOtherClients calls that crashed before the
        // tokens were deleted.
        this.users._ensureIndex('services.resume.haveLoginTokensToDelete',
            {sparse: 1});
        // For expiring login tokens
        this.users._ensureIndex("services.resume.loginTokens.when", {sparse: 1});
    }
    ensurePasswordIndex() {
        this.users._ensureIndex('services.email.verificationTokens.token',
            {unique: 1, sparse: 1});
        this.users._ensureIndex('services.password.reset.token',
            {unique: 1, sparse: 1});
    }
}