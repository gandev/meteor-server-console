chrome.devtools.panels.create(
  "Meteor Console",
  "meteor.png",
  "meteor_console.html",
  function(panel) {
    panel.onShown.addListener(function(win) {
      win.document.getElementById("run_eval").focus();

      win.MeteorConsole_getOrigin = function(callback) {
        chrome.devtools.inspectedWindow.eval('document.location.origin', function(result, isException) {
          callback(result);
        });
      };

      var _checkOrigin = function(origin, callback) {
        chrome.devtools.inspectedWindow.eval('document.location.origin', function(result, isException) {
          if (!isException && result === origin && callback) {
            callback(true);
          } else if (callback) {
            callback();
          }
        });
      };

      var checkCrashText;

      win.MeteorConsole_getCrashMessage = function(origin, callback) {
        clearInterval(checkCrashText);

        _checkOrigin(origin, function(ok) {
          if (!ok) return callback();

          chrome.devtools.inspectedWindow.eval('var xhr = new XMLHttpRequest();' +
            'xhr.onload = function() {' +
            'MeteorConsole_CrashText = this.responseText;' +
            '};' +
            'xhr.open("post", "", true);' +
            'xhr.timeout = 1000;' +
            'xhr.send();'
          );
        });

        checkCrashText = setInterval(function() {
          chrome.devtools.inspectedWindow.eval('MeteorConsole_CrashText', function(result, isException) {
            if (!isException && callback && result.match(/^Your app is crashing/)) {
              clearInterval(checkCrashText);
              callback(result);
            }
          });
        }, 100);
      };
    });
  }
);