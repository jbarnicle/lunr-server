'use strict';

var http = require('http');
var lunr = require('lunr');
var packageInfo = require('./package.json');
var querystring = require('querystring');
var url = require('url');
// var cfenv = require("cfenv");
// var appEnv = cfenv.getAppEnv();

function LunrServer(corpora) {

	this.corpora = corpora;
  var server = this;

  this.httpServer = new http.Server(function(req, res) {
        handleRequest(server, req, res);
  });
	
}

LunrServer.prototype.addCorpus = function (corpus) {
    
    this.corpora[corpus.key] = corpus;

}

LunrServer.prototype.run = function () {

//    this.httpServer.listen(appEnv.port);
    this.httpServer.listen(5000);
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

module.exports = LunrServer;
