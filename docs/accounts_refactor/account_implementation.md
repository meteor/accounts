# Accounts Refactor Implementation

## Phase 1 

### Refactored Accounts code

See the [refactor_model_layer_v1](https://github.com/meteor/accounts/tree/refactor_model_layer_v1) branch of the the accounts repository 
project to see the separation.

### db.API

The db.API methods are defined in the [accounts-base/model_users.js file](https://github.com/meteor/accounts/blob/refactor_model_layer_v1/packages/accounts-base/model_users.js).

## Phase 2

#### Postgresql Data Access Provider

See the [Postgresql Data Access Provider Explorer's Kit](https://bitbucket.org/singli/accountsdb/src/822beef3642ce363dc68caa1b49a1201c85b591e/db.postgres/?at=master) 
for the tooling and provider implementation.  Complete Quick Start instruction is included.

Actual [code of the Postgresql provider](https://bitbucket.org/singli/accountsdb/src/822beef3642ce363dc68caa1b49a1201c85b591e/db.postgres/db/account-postgres.js?at=master&fileviewer=file-view-default).

####  The work in progress SQL Schema

```sql

    CREATE EXTENSION pgcrypto;  /* alternate "uuid-ossp" */
    CREATE TABLE accounts (
          id UUID primary key default gen_random_uuid(), /* alt. uuid_generate_v1mc */
          created_at timestamp default current_timestamp,
          username character varying,
          profile jsonb
        );
    CREATE INDEX accounts_username_idx ON accounts(username);
    CREATE TABLE accounts_email (
      address character varying primary key,
      created_at timestamp default current_timestamp,
      verified boolean default false,
      user_id UUID not null,
      verification_token character varying,
      vtoken_created_at timestamp,
      ordering serial   /* or other SEQUENCE based field, to preserve array order */
    );
    CREATE INDEX accounts_email_idx_user_id ON accounts_email (user_id);
    ALTER TABLE accounts_email ADD CONSTRAINT user_id FOREIGN KEY (user_id) REFERENCES accounts(id);
    
    /* support internal services */
    
    CREATE TABLE account_services_password (
      user_id UUID primary key,
      bcrypt character varying not null,
      resetpending boolean default false,
      reset_token character varying,
      reset_at timestamp
    );
    
    CREATE TABLE account_services_resume (
      user_id UUID primary key,
      haveLoginTokensToDelete boolean default false,
      loginTokensToDelete jsonb
    );
    
    CREATE TABLE account_login_tokens (
      token character varying primary key,
      created_at timestamp  default current_timestamp,
      user_id UUID not null,
      ordering serial   /* or other SEQUENCE based field, to preserve array order */
    );
    
    CREATE INDEX account_login_tokens_idx_user_id ON account_login_tokens (user_id);
    ALTER TABLE account_login_tokens ADD CONSTRAINT user_id FOREIGN KEY (user_id) REFERENCES accounts(id);
    
    /* external services */
    CREATE TABLE account_services_facebook (
      user_id UUID primary key,
      facebook_id varchar not null,
      access_token varchar not null
    );
    
    (more tables for each external service)
```
#### RethinkDB Data Access Provider

See the [RethinkDB Data Access Provider Explorer's Kit](https://bitbucket.org/singli/accountsdb/src/822beef3642ce363dc68caa1b49a1201c85b591e/db.rethink/?at=master) 
for the tooling and provider implementation.   Complete Quick Start instruction is included.

Actual [code of the RethinkDB provider](https://bitbucket.org/singli/accountsdb/src/822beef3642ce363dc68caa1b49a1201c85b591e/db.rethink/db/account-rethink.js?at=master&fileviewer=file-view-default).

#### Unit test suite for db.API

This [suite of unit tests](https://bitbucket.org/singli/accountsdb/src/822beef3642ce363dc68caa1b49a1201c85b591e/db.rethink/test/test.js?at=master&fileviewer=file-view-default) is applicable to all new data access providers.

### Implementation notes

*  investigated the use of ORM (bookshelfjs, sequelize, waterline/sailjs,
and others); opted for hand crafted SQL code instead to avoid the
additional complexity introduced (without a whole lot of gain) and their
general lack of support for ES6.  Handcrafted SQL code also serves
better as reference driver and easier to customize for other SQL
dialects

* in general, for a write method - the code must destructure the JavaScript
object supplied and store the fields into the relevant tables; care needs
to be taken to preserve array elements order, and set property, and so
on

* in general, for a read method - the code needs to fetch from relevant SQL
tables and assemble a JavaScript object that is of the expected 'shape' and
return it back to the caller; this 'shape' may not be precise, especially
as it pertains to NULL vs empty (previsiously filled, but now removed)
elements

* in general, for a mutate method - the code should perform specific (and
just enough) modification to the tables; to simulate the full richness
of MongoDB selector/operators is a futile exercise

