'use strict'
var LunrServer = require('./lunrServer');
var Corpus = require('./corpus');
var lunr = require('lunr');
var config = require('./corpora-config.json');

var corpora = {};

var LunrServer = new LunrServer(corpora);

config['corpora'].forEach(function(corpusSpec) {

  var corpus = new Corpus(corpusSpec.name, corpusSpec.baseurl, corpusSpec.indexPath, corpusSpec.remote);
  corpus.load();
  LunrServer.addCorpus(corpus);

});

console.log(LunrServer);
LunrServer.run();