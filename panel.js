chrome.devtools.panels.create(
  "Meteor Console",
  "meteor.png",
  "meteor_console.html",
  function(panel) {
    panel.onShown.addListener(function(win) {
      win.document.getElementById("run_eval").focus();

      win._getCrashMessage = function(origin, callback) {
        chrome.devtools.inspectedWindow.eval(
          '[document.location.origin, document.body.textContent]',
          function(result, isException) {
            if (!isException && result[0] === origin) {
              win._refreshApp(function() {
                callback(result[1]);
              });
            }
          }
        );
      };

      win._refreshApp = function(callback) {
        chrome.devtools.inspectedWindow.eval('window.location.reload();', function(_result, isException) {
          if (!isException && callback) {
            callback();
          }
        });
      };
    });
  }
);