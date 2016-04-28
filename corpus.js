'use strict';

var request = require('request');
var lunr = require('lunr');

function Corpora(name, baseurl, indexPath, remote) {
	
	this.name = name;
	this.baseurl = baseurl;
	this.indexPath = indexPath;
	this.remote = remote;
	this.key = name.toLowerCase().split(' ').join('-');
	this.lastUpdate = null;
}

Corpora.prototype.load = function() {

	var that = this;
	request(this.baseurl + this.indexPath, function (error, response, body) {
	    if (!error && response.statusCode == 200) {
	    	parseCorpus(that, body).then(function(result) {
	    		that.lastUpdate =  Date.now();
			}, function(err) {
				console.log(err); // Error: "It broke"
			});
	    } else {
	    	console.log(error);
	    }
	});3
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

module.exports = Corpora;