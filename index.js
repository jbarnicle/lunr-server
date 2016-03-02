'use strict';

var http = require('http');
var lunr = require('lunr');
var fs = require('fs');
var path = require('path');
var packageInfo = require('./package.json');
var querystring = require('querystring');
var url = require('url');
const EventEmitter = require('events');


module.exports = LunrServer;

function LunrServer(config, logger) {
  var server = this;

  this.logger = logger;
  Object.keys(config).forEach(function(key) {
    server[key] = config[key];
  });
}

LunrServer.versionString = function() {
  return packageInfo.name + ' v' + packageInfo.version;
};

LunrServer.prototype.prepare = function() {
  var lunrServer = this;

  return Promise.all(this.corpora.map(function(corpusSpec) {
    return corpusSpecIfIndexPathExists(corpusSpec);
  }))
  .then(function(corpusSpecs) {
    lunrServer.watchers = corpusSpecs.filter(function(corpusSpec) {
      return corpusSpec !== undefined;
    })
    .map(function(corpusSpec) {
      // reload an index when child corpus changes it
      return fs.watch(corpusSpec.indexPath, () => {
        loadIndex(lunrServer, corpusSpec);
      });
    });

    return Promise.all(lunrServer.corpora.map(function(corpusSpec) {
      corpusSpec.eventEmitter = new EventEmitter();
      return loadIndex(lunrServer, corpusSpec);
    }));
  });
};

LunrServer.prototype.launch = function() {
  var lunrServer = this;

  this.prepare().then(function() {
    return new Promise(function(resolve, reject) {
      launchServer(lunrServer, reject);
    });
  });
};

LunrServer.prototype.close = function() {
  var lunrServer = this;

  return new Promise(function(resolve, reject) {
    var finish = function(err) {
      err ? reject(err) : resolve();
    };

    lunrServer.watchers.forEach(function(watcher) {
      watcher.close();
    });
    if (lunrServer.httpServer) {
      lunrServer.httpServer.close(finish);
    } else {
      finish();
    }
  });
};

function corpusSpecIfIndexPathExists(corpusSpec) {
  return new Promise(function(resolve, reject) {
    fs.stat(corpusSpec.indexPath, function(err, stats) {
      if (err) {
        // Corpus doesn't exist yet, or went away. May want to do a directory
        // watch at some point if we expect indices to appear.
        removeCorpusSpecProperties(corpusSpec);
        return resolve();
      }
      stats.isFile() ?
        resolve(corpusSpec) :
        reject(new Error('not an index file: ' + corpusSpec.indexPath));
    });
  });
}

function loadIndex(server, corpusSpec) {
  var indexPath = path.join(corpusSpec.indexPath);

  return corpusSpecIfIndexPathExists(corpusSpec)
    .then(function(corpusSpec) {
      if (!corpusSpec) {
        return Promise.resolve();
      }
      return new Promise(function(resolve, reject) {
        fs.readFile(indexPath, 'utf8', function(err, data) {
          if (err) {
            return reject(new Error('failed to load ' + indexPath +
              ': ' + err));
          }
          resolve(data);
        });
      });
    })
    .then(function(corpus) {
      return corpus ? parseCorpus(corpusSpec, corpus) : Promise.resolve();
    });
}

function removeCorpusSpecProperties(corpusSpec) {
  delete corpusSpec.index;
  delete corpusSpec.urlToDoc;
}

function parseCorpus(corpusSpec, corpus) {
  return new Promise(function(resolve, reject) {
    var rawJson;
    try {
      rawJson = JSON.parse(corpus);
      rawJson.index = lunr.Index.load(rawJson.index);
      Object.keys(rawJson).forEach(function(key) {
        corpusSpec[key] = rawJson[key];
      });
      corpusSpec.eventEmitter.emit('refreshed');
      resolve();
    } catch (err) {
      reject(new Error('failed to parse ' + corpusSpec.indexPath + ': ' + err));
    }
  });
}

function launchServer(lunrServer, reject) {
  lunrServer.httpServer = new http.Server(function(req, res) {
    handleRequest(lunrServer, req, res);
  });

  lunrServer.httpServer.on('error', function(err) {
    reject(err);
  });

  lunrServer.logger.log(
    packageInfo.name + ': listening on port', lunrServer.port);
  lunrServer.httpServer.listen(lunrServer.port);
}

function handleRequest(lunrServer, req, res) {
  var queryParams,
      results = { results: [] },
      response;

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.end(http.STATUS_CODES[res.statusCode]);
  }

  queryParams = querystring.parse(url.parse(req.url).query).q;

  Object.keys(lunrServer.corpora).forEach(function(corpus) {
    var corpusSpec = lunrServer.corpora[corpus],
        corpusResults = corpusSpec.index.search(queryParams);

    corpusResults = corpusResults.map(function(result) {
      var urlAndTitle = corpusSpec.url_to_doc[result.ref];
      Object.keys(urlAndTitle).forEach(function(key) {
        result[key] = urlAndTitle[key];
      });
      result.url = corpusSpec.baseurl + result.url;
      delete result.ref;
      return result;
    });

    if (corpusResults.length !== 0) {
      results.results.push({
        corpus: corpusSpec.name,
        baseurl: corpusSpec.baseurl,
        results: corpusResults
      });
    }
  });
  response = JSON.stringify(results);
  console.log('q:', queryParams);
  res.end(response);
}
