# lunr-server [WORK IN PROGRESS]

This is a Node.js server that responds to queries for Lunr.js indexes.

**Note: This server is still in its early stages and subject to change
drastically. Don't use it yet.**

## Running locally

This is a refactor of the existing 18f/lunr-server it is forking from.  I've left the original
files in place for comparison purposes. T


### Todos:

- make listen port configurable
- unit tests
- more robust logging / error handling
- figure out how to accommodate running both local and on cloud
- add refresh mechanism to


### Install

    sudo npm install gulp gulp-util gulp-mocha --save-dev

### Run

    node server

### Query

    curl localhost:5000/?q=my+search+terms
