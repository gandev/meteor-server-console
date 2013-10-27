chrome.devtools.panels.create(
  "Meteor Console",
  "meteor.png",
  "server_eval.html",
  function(panel) {
    panel.onShown.addListener(function(win) {
      win.document.getElementById("run_eval").focus();
    });
  }
);