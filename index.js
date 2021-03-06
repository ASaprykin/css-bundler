var fs = require('fs');
var crypto = require('crypto');
var path = require('path');
var Batch = require('batch');
var mkdirp = require('mkdirp');
var utils = require('./lib/utils');
var Emitter = require('events').EventEmitter;
var inherit = require('util').inherits;

function Bundler(options) {
  this.options = options;
}

inherit(Bundler, Emitter);

Bundler.prototype.use = function(fn) {
  fn(this);
};

Bundler.prototype.build = function(input, dest, callback) {
  var self = this;
  var options = this.options;
  var dir = path.dirname(dest);
  mkdirp(dir, function(){
    var inputDir = path.dirname(input);
    fs.readFile(input, function(err, buffer) {
      var str = buffer.toString();
      var batch = new Batch();

      var css = str.replace(/\burl\s*\(([^)]+)\)/g, function(_, url) {
        url = utils.stripQuotes(url);
        if( utils.isAbsolute(url) || utils.isData(url) ) return 'url("' + url + '")';
        var filename = path.basename(url);
        var name = crypto.createHash('md5').update(url).digest("hex") + path.extname(filename);
        batch.push(function(done){
          var asset = path.join(inputDir, url);
          utils.copy(asset, path.join(dir, name), done);
        });
        return 'url("' + (options.prefix || '') + name + '")';
      });

      batch.push(function(done){
        fs.writeFile(dest, css, done);
      });

      batch.end(function(err){
        callback(err, css);
      });
    });
  });
};

module.exports = Bundler;