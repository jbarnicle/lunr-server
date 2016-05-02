'use strict';

var http = require('http');
var lunr = require('lunr');
var querystring = require('querystring');
var url = require('url');

module.exports = class LunrServer {
  
  constructor() {
    
    this.corpora = {};
    var server = this;
    this.httpServer = new http.Server(function(req, res) {
        handleRequest(server, req, res);
      });
  }

  addCorpus(corpus) {
    this.corpora[corpus.name] = corpus;
  }

  run(port) {
    this.httpServer.listen(port);
  }

}

function handleRequest(server, req, res) {
	var queryParams, results = { results: [] },	response;

    if (req.method !== 'GET') {
    	res.statusCode = 405;
    	res.setHeader('Allow', 'GET');
    	res.end(http.STATUS_CODES[res.statusCode]);
    }

    queryParams = querystring.parse(url.parse(req.url).query).q;

  	Object.keys(server.corpora).forEach(function(corpus_key) {
      var corpus = server.corpora[corpus_key];
  		var corpusResults = corpus.index.search(queryParams);
  		corpusResults = corpusResults.map(function(result) {
  			var urlAndTitle = corpus.urlToDoc[result.ref];
  			Object.keys(urlAndTitle).forEach(function(key) {
  				result[key] = urlAndTitle[key];
  			});
  			result.url = corpus.baseurl + result.url;
  			delete result.ref;
  			return result;
  		});
  		if (corpusResults.length !== 0) {
  			results.results.push({
  				corpus: corpus.name,
  				baseurl: corpus.baseurl,results: corpusResults
  			});
  		}
	});
	response = JSON.stringify(results);
	res.end(response);
}
