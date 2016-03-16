# Accounts Refactor Requirements

The following describes why the accounts package is being refactored, 
and what will be done. Spelling out the explicit requirements.

## Background

Meteor as a platform is evolving to the requirements of very large
and complex projects, and users with major level of time and resource 
investments.

Some key requirements include:

* ability to use data sources beyond MongoDB, especially SQL 
* ability to use multiple dissimilar data sources in one application
* deployment of best-of-breed JavaScript technologies for the various
part of the application stack
* ability to highly customize the data sources for specific (often
legacy, existing) databases

The following two talks by Meteor founders (click to watch) contain in-depth information
on this directional shift, scheduled to occur throughout 2016.

[![Meteor 1.3 and Beyond - Matt DeBergalis, Feb 23, 2016](https://raw.githubusercontent.com/Sing-Li/bbug/master/images/matttalk.png)](https://www.youtube.com/watch?v=7d0xTR-eYh0)

[![Transmission - Future of Meteor with CEO Geoff Schmidt, March 2, 2016](https://raw.githubusercontent.com/Sing-Li/bbug/master/images/geofftalk.png)]( https://www.youtube.com/watch?v=wylWt-RxYiQ)

As indicated in the above talks, the transition will be occuring
**incrementally**; allowing exsiting applications to migrate one piece
at a time, **side-by-side**.

> "Change will be incremental, side-by-side."

## Architectural Shift

Traditionally, Meteor applications are tightly coupled with MongoDB and
its oplog for object data access and reactivity.  It is not possible to
separate object data access and/or reactivity from the MongoDB + oplog
dependency.   See Figure 1.

![Meteor app with fixed dependency on MongoDB + oplog](https://raw.githubusercontent.com/Sing-Li/bbug/master/images/fig1.png)

With the various ongoing refactoring efforts, the new Meteor will have:

* reactivity externalized and becoming optional
* object data access refactored
* adapters for SQL, NoSQL, REST, and other data sources

Figure 2 shows the results of these refactoring.   Object data access
is now separated and can be adapted to varied data sources, 
reactivity is optional, and the dependency on MongoDB can be 
optional removed.

![Meteor App with optional reactivity and multiple data sources](https://raw.githubusercontent.com/Sing-Li/bbug/master/images/fig2.png)

To learn more details regarding these ongoing refactoring efforts,
visit the [Apollo stack and discover its mission](https://github.com/apollostack/apollo)

## Project Scope:  Meteor Accounts Package

As a very important sub-project, the Accounts package of existing
Meteor must undergo the following transformation:

*  separation into repository independent of Meteor core
*  isolation and removal of any tightly coupled reactivity dependencies
*  adapt to alternate data sources including SQL

### Meteor Accounts Package - Backgrounder

The Accounts package in Meteor is the gateway to the `Meteor.users` 
collection, and is also instrumental in handling login (including
oauth with multiple external services) as well as 
maintaining login status.

For existing Meteor applications, the Accounts package is the
only mandatory Meteor dependency that enforces coupling to Meteor's
choice of object data access method (currently MongoDB).  

The scope of this refactoring is limited to only those fields in the
`users` collection that is part of the Meteor 1.3 Accounts Package,
and does not include any application specific fields.

_NOTE: Although most existing Meteor applications 
would have also used MongoDB for its own application data (to take 
advantage of reactivity, for example), it had never been a madatory 
requirement architecturally._  


See Figure 3.

![Accounts package operates on the Users collection](https://raw.githubusercontent.com/Sing-Li/bbug/master/images/fig3.png)

### Existing Dependency on MongoDB

In a similar vein to core, the Accounts package of Meteor is currently
tightly coupled to MongoDB and its oplog for operation.  See Figure 4.

![Current Accounts package tightly coupled to MongoDB](https://raw.githubusercontent.com/Sing-Li/bbug/master/images/fig4.png)

### Accounts Refactor Objectives

This Accounts Refactor project aims to maintain the exact higher level
APIs to applications while removing reactivity dependencies and 
adapting object data access to SQL (and other) data sources. See Figure
5.

![Refactored Account package can access users info from other data sources](https://raw.githubusercontent.com/Sing-Li/bbug/master/images/fig5.png)


## A.  External Requirements

### A.1 SQL Compatibility
The refactored Accounts package must work against Postgresql 9.5 
 for the reference SQL adapter.

### A.2 NoSQL Compatibility
The refactored Accounts pacakge must work against RethinkDB 2.2.5 for
the reference NoSQL adapter.

### A.3 MongoDB
MongoDB provider with full reactivity should remain the default
provider - unless explictly overriden.  The MongoDB provider should
remain fully functional as previously.

## B. Internal Requirements

### B.1 Compatibility with Accounts API
The current APIs to the Accounts package must be maintained, as much 
as possible - except in areas where there might be explicit or
implicit dependency on reactive behaviour or side-effect.  Compatibility
is to be defined and enforced by the Accounts unit test suite.

### B.2 Compatibility with Account Services
The existing oauth services, currently included as part of Meteor
 1.3 releases, must continue to work with the refactored Accounts
  package.  Compatibility is to be defined and enforced by
  associated unit test suite.

## C. Interfacing Considerations

### C.1 npm module Readiness
The Postgresql adapter and RethinkDB adapter must both be publishable 
as an npm module.  The module will be loaded via a mechinaism to
be discussed external to this project (see D.1)

## D. External Dependencies

### D.1 npm module loading
A mechanism for an application to register and load required npm 
data source provider modules (potentially multiple, simultaneous)
 will need to be defined. 
 
## E. Other Considerations

### E.1  Ease of onboarding
The adapter code and tooling should be relatively simple to learn and 
understand for someone who is already familiar with the database 
technology 
and nodejs development. It should not require Meteor mastery.

### E.2  Ease of customization
The adapter code should be simple and easy to modify for specific
situation.   The only pre-requsisite should be familiarity with
the database technology involved and nodejs development. It
should not require Meteor mastery.

### E.3 Consistent with Apollo
The work in Account Refactor should be consistent with the work 
being concurrently done in the Apollo stack.

##### Continue to [Account Refactor Design](account_design.md)












