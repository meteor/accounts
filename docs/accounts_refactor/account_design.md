# Accounts Refactor Design

The following describes the approach to refactor the Accounts package.

It describes the solution at a high level and explains how the
 requirements are satisfied.   Each component of the design
is  described in detail.

## Separating the Accounts Repository

This is pre-requisite for the project, enabling all code modifications
to be made independent of Meteor core; and to decouple the project's
progress, as much as possible, from the Meteor release schedules.


## Extracting a Model Layer

The existing Accounts code makes direct calls to MongoDB APIs for
object data access.

First step in the design is to separate out a "model layer" from the
existing Accounts code. 

###  Model Layer and db.API

The model layer consists of a set of methods that wraps calls to 
MongoDB APIs.  This set of methods will have names that are descriptive 
of the objects and fields (data elements) that are being mutated.  

For example, the following method will remove a user record from
the users collection by the supplied user name:

`users.removeByUsername(username)`

The set of methods together forms the db.API, an interface that 
Accounts code will be calling for object data access.  

The db.API includes methods required by:

* the Accounts code proper
* the unit test suite used to test the Accounts code

After separation, the set of methods wrapping the MongoDB will implement
 the db.API, and become the _default MongoDB data source provider_.
 Accounts code will only access data trough the db.API as 
  implemented by the _default
MongoDB data source provider_.  See Figure 6.

![Factoring out model layer with db.API](https://raw.githubusercontent.com/Sing-Li/bbug/master/images/fig6.png)

In the future, any data source provider implementing the db.API should 
work with the Accounts code. See Figure 7.

![All data access providers implements the db.API methods](https://raw.githubusercontent.com/Sing-Li/bbug/master/images/fig7.png)

_NOTE: It is foreseeable that there might be common logic across
different data source providers that can be abstracted.  This is
outside of the scope of the current project; and will result in a
data.provider.API in a follow up project - once the team has
gained enough experience creating data source providers._

#### Externalize Reactivity

Each data source provider must implement an `isReactive()` method.

Only the _default MongoDB data source provider_  should return `true`
for this method.  All data source providers should return `false`
for this method.

Implementation of reactivity should be separated
from the data source provider (except for the existing legacy MongoDB 
provider).  See [Apollo Stack](https://github.com/apollostack/apollo) 
for information on possible reactivity implementation.


#### Avoid Data Format Compatibility Conversion

Existing Account code and unit tests anticipate the existence of
certain legacy data assoicated with old Meteor releases.  Some
examples include:

* use of string vs numeric ids
* SRP vs bcrypt passwords
* legacy tokens vs hashed tokens

Since no data from an old Meteor version can get into an SQL (or any 
other non-MongoDB) store  without explicit import, there is no need to
 implement any db.API methods that deals only with format conversion.  
 Those methods should throw exception when called.

## Postgresql (SQL) Data Access Provider

The Postgresql Data Access Provider is an alternative data access 
provider that implements the methods of the db.API but uses
calls to a Postgresql database exclusively (instead of Mongo).

The design of the provider purposedly made use of generic SQL
constructs (instead of better performing but less portabl Postgresql 
extensions) as much as possible,
and can serve as a reference for others crafting SQL data access providers.


## RethinkDB (noSQL) Data Access provider

The RethinkDB Data Access Provider is an alternative data access 
provider that implements the methods of the db.API but uses
calls to a RethinkDB cluster exclusively (instead of Mongo).

This provider can serve as a reference for implementation of other
NoSQL data access providers.

## Phases and Deliverables

The project is divided up into two sequential phases, each with its 
own set of devliverables.  

### Phase 1
In this phase, a model layer is extracted from the Accounts code, and
the db.API is defined. 

#### deliverables

db.API methods and  default MongoDB data access
provider; implementation should pass all existing Accounts unit tests 

### Phase 2

In this phase, two new providers will be created from scratch to
implement the db.API:

* Postgresql (SQL) data access provider
* RethinkDB (NoSQL) data access provider

A suite of unit tests designed to test the db.APi (decoupled from
Accounts code)  will be  created - and both data access provider (or 
any future data access provider) must pass these tests.

#### deliverables

Postgresql data access provider,  RethinkDB data access provider,
db.API unit test suite, tooling for independent provider tuning
and testing

_NOTE:  A future phase may re-visit the stack to refactor the 
db.API for GraphQL (when the apollo stack becomes more mature)._

_NOTE 2: For those waiting for Accounts refactor in order to migrate
their existing Meteor applications to SQL - they will become
unblocked
upon the availability of the SQL Data Access Provider for Accounts._


# Design vs Requirements

## A.  External Requirements

### A.1 SQL Compatibility
The Postgresql data access provider delivered in Phase 2  
supports Postgresql 9.5 for Accounts operation.

### A.2 NoSQL Compatibility
The RethinkDB data access provider delivered in Phase 2 will 
supports RethinkDB 2.2.5 for Accounts operation.

### A.3 Mongo
The default MongoDB data access provider delievered in Phase 1 
continue to support MongoDB operations with full reactivity.

## B. Internal Requirements

### B.1 Compatibility with Accounts API
The new data access providers are tested against db.API unit
test suite during development.  The providers are tested 
against the Accounts unit test suite upon completion.

### B.2 Compatibility with Account Services
The new data access providers are tested against unit test
suites for oauth Account services wherever they exist.

## C. Interfacing Considerations

### C.1 npm module Readiness
Both the Postgresql and RethinkDB providers are ready for 
npm module publish.

## D. External Dependencies

### D.1 npm module loading
TBD pending external discussion.
 
## E. Other Considerations

### E.1  Ease of onboarding

For each data access provider, an Exploration Kit toolset is provided.

All the developer will need is an instance of Postgresql 9.5 (or 
RethinkDB 2.2.5) with write permission to start development
and testing immediately.

The development stack uses technologies that all modern
nodejs devs are familiar with:

* [mocha](https://mochajs.org/) for unit testing
* All ES6 code ([Babel](https://babeljs.io/))
* [bluebird](http://bluebirdjs.com/docs/getting-started.html) promise

The Postgresql data access provider uses the  [pg-promise](https://www.npmjs.com/package/pg-promise) driver.

The RethinkDB data access provider uses the [rethinkdb](https://www.npmjs.com/package/rethinkdb) driver, and code
makes use of promise (instead of callbacks) extensively.

Each exploration kit runs independent of one another, and without 
requiring the installation of Meteor.

### E.2  Ease of customization

Both the Postgresql and RethinkDB data access provider can be 
easily customized and adapted to specific client scenarios. 

The Exploration Kit format enable clients to modify just the methods
that need to be changed, and leave the rest of the tested method
as is.  This minimizes the footprint-of-interaction and facilitates
rapid customization.

### E.3 Consistent with Apollo

The work in Account Refactor is consistent with the current thinking 
of the Apollo stack.

##### Continue to [Accounts Refactor Implementation](account_implementation.md)





