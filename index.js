var fs = require('fs');
var path = require('path');

var excludes = ['node_modules'];

var win32 = process.platform === 'win32';
function unixifyPath(filepath) {
  if (win32) {
    return filepath.replace(/\\/g, '/');
  } else {
    return filepath;
  }
}

function walk(rootdir, callback, subdir) {
  var abspath = subdir ? path.join(rootdir, subdir) : rootdir;
  fs.readdirSync(abspath).forEach(function(filename) {
    var filepath = path.join(abspath, filename);
    if (fs.statSync(filepath).isDirectory()) {
        if(excludes.indexOf(filepath) === -1 && filepath.indexOf('.') !== 0) {
            walk(rootdir, callback, unixifyPath(path.join(subdir || '', filename || '')));
        }
    } else {
      callback(process.cwd() + '/' + unixifyPath(filepath), fs.readFileSync(filepath, {
        encoding: 'utf-8'
      }));
    }
  });
}

var map = {};

walk('.', function(filepath, content) {
    var matches = content.match(/@package ([0-9a-z\/]+)/i);
    if(matches) {
        if(typeof map[matches[1]] === 'undefined') {
            map[matches[1]] = filepath;
        } else {
            throw new Error(matches[1] + ' already defined: ' + map[matches[1]] + ' -- attempt: ' + filepath);
        }
    }
});

module.exports = function() {
    return {
        'visitor': {
            ImportDeclaration(path, state) {
                const value = path.node.source.value;
                if(Object.keys(map).indexOf(value) !== -1) {
                    var mapValue = map[value];
                    try {
                      var from = state.opts.from;
                      var to = state.opts.to;
                      if (from && to) {
                          mapValue = mapValue.replace(from, to);
                      }
                    } catch (ex) {}
                    path.node.source.value = mapValue;
                }
            }
        }
    };
};
