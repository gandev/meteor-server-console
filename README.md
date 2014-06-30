meteor-server-console
=====================

is a tool which connects to a [meteor](http://www.meteor.com) server running the [meteor-server-eval](https://github.com/gandev-de/meteor-server-eval) smartpackage and provides a way to evaluate javascript in the server environment.

__With version 0.5 starts the evolution towards a terminal like development tool with helper functions and server log. Currently implemented helper functions support git, tinytest and package skeleton creation. Please feel free to request features, suggest improvements or even add your own helpers like [meteor-server-eval git helpers](https://github.com/gandev-de/meteor-server-eval/blob/master/git_helpers.js)__

I'm publishing meteor-server-console as a "Chrome DevTools" extension but its also possible to use it in other browsers
(just clone the repository and open meteor_console.html).

## Setup

*    OPTIONAL: install [extension](https://github.com/gandev/meteor-server-console/releases) in your chrome (open chrome://extensions and drag and drop the .crx file)
*    add smartpackage [meteor-server-eval](https://github.com/gandev-de/meteor-server-eval) to your app
*    start your app and open meteor-server-console (appears in "Chrome DevTools" as the new Tab "Meteor Console")

## Use

### Connection
*    automatically connects to localhost:3000 by default, to change the port see Input->client commands 
     ("ws://localhost:3000/websocket")
*    polls the server and connects automatically when server starts/restarts

### Evaluations
*    are executed as eval(expression) in meteor node.js container, optionally scoped to package context
*    REQUIREMENT: [meteor-server-eval](https://github.com/gandev-de/meteor-server-eval)

### Input

*    general:
     - type in a expression and hit ENTER to evaluate
     - type in an object name or part of it and press CTRL + SPACE to trigger autocomplete
     - select last evaluated expressions with the UP and DOWN keys

*    server commands (helpers):
     - type . and a popup with all supported server side helper functions shows up
         - __.clear__ clear console output
         - __.toggleLogging__ toggle interception of server side logs (default: ON)
         - __.updateMetadata__ mostly internal to update metadata like supported packages/helper
         - __.git__ basically calls git in the project repository (+ shortcut commands .gitStatus/.gitDiff/...)
         - __.create-package__ adds a skeleton smartpackage (requires package name as parameter)
         - __.test-package__ starts meteor test-packages in app or package scope on port 5000 (--port to change)
         - __.cancel-tests-xxx__ automatically added to stop test runner

*    client commands:
     - type : and a popup with the following commands shows up
         - __:scope=package_name__ sets the package in which evaluations should be scoped if supported
         - __:reset-scope__ resets scope to global
         - __:set-port=4000__ sets the port to switch app instance
         - __:port__ shows current port
         - __:set-host=localhost__ sets the host to switch app instance
         - __:host__ shows current host
         - __:watch=expr__ add/refresh expression to/in watch view and open if closed
         - __:watch-view__ toggle watch view open/closed
         - __:watch-view60__ change watch view width in percent (arbitrary)
         - __:reload__ reload the page, all results before last server start will disappear
         - __:max-log-entries=10__ sets the maximum number of non helper logs in output and deletes if reached
         - __:collapse-logs__ just collapses all expanded logs

### Output (not stored in app db)

*    internal messages/ autocomplete
     - Error=red, Info=orange, SUCCESS=green
     - autocomplete displays object keys in a table and/or sets the input value to matching key

*    evaluation results
     - expression in first line (leading #), result below and scope with evaluation time in milliseconds on the right side
     - Strings, Numbers, Booleans directly
     - Objects as tree
             - different colors for different types (Function=blue, Object=green, Array=orange, Circular=red)
             - Objects are shown with name (if available) of constructor Function
             - Circular References are marked and shown with path
             - Errors with stacktrace (special format with the attempt of highlighting more relevant lines)

*    server log (see server commands)
     - leading green (or Error=red) label with static text 'Log' + log message (expandable if multi line)
     - if the server log is intercepted, all log entries (up to the max) will get rendered in output window
     - the calls of helper functions can also produce log entries wich are always displayed

### Watch
*    watch view, refresh and remove watches
*    watches are persistent on the server and automatically refreshed if server restarts

## In action...

Video coming soon...

v0.2 Screenshot which shows Package scope functionality:

![ScreenShot](https://raw.github.com/gandev-de/meteor-server-console/screenshots/package-scope-functionality.png)

v0.1 Screenshot which shows common use:

![ScreenShot](https://raw.github.com/gandev-de/meteor-server-console/screenshots/meteor-console.png)
