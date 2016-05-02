'use strict'

var LunrServer = require('./lunrServer');
var Corpus = require('./corpus');
var lunr = require('lunr');
var config = require('./corpora-config.json');

var LunrServer = new LunrServer();

config['corpora'].forEach(function(corpusSpec) {

  var corpus = new Corpus(corpusSpec);
  corpus.load();
  LunrServer.addCorpus(corpus);

});

var serverPort = process.argv[2] || process.env.PORT || 5000;
LunrServer.run(serverPort);