'use strict';

var request = require('request');
var lunr = require('lunr');

module.exports = class Corpus {
	
	constructor(corporaDef) {

      	this.name = corporaDef.name;
      	this.baseurl = corporaDef.baseurl;
      	this.indexPath = corporaDef.indexPath;
      	this.remote = corporaDef.remote;
      	this.refreshInterval = corporaDef.refreshInterval * 60 * 60 * 1000;
      	this.lastRefresh = null;

	}

	load() {

		var that = this;
		fetchRemoteCorpora(this.baseurl + this.indexPath).then(
			function(data) { 
				parseCorpus(that, data)
				if (that.lastRefresh == null) {
					that.lastRefresh = Date.now();
					setInterval(function() {
						that.load()
					}, that.refreshInterval);
				}
			});
	}
}

function fetchRemoteCorpora(path) {
	return new Promise(function(resolve, reject) {
		request(path, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				resolve(body);
	    	} else {
	    		reject(error);
	    	}
		})
	})
}

function parseCorpus(corpus, searchJSON) {
	return new Promise(function(resolve, reject) {
		try {
			var rawJson = JSON.parse(searchJSON);
			rawJson.index = lunr.Index.load(rawJson.index);
			Object.keys(rawJson).forEach(function(key) {
				corpus[key] = rawJson[key];
			});
			adjustCorpusSpecProperties(corpus);
			resolve();
		} catch (err) {
			reject(new Error('failed to parse ' + indexPath + ': ' + err));
		}
	});
}

function adjustCorpusSpecProperties(corpusSpec) {
	if (corpusSpec.url_to_doc) {
		corpusSpec.urlToDoc = corpusSpec.url_to_doc;
		delete corpusSpec.url_to_doc;
	}
}
