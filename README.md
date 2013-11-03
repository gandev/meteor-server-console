meteor-server-console
=====================

is a "Chrome DevTools" extension which connects to a [meteor](http://www.meteor.com) server (DDP)
provides a virtual Server Console to evaluate expressions and
pretty prints the results in browser

## Setup

*    install extension in your chrome (see chrome://extensions)
*    add smartpackage [meteor-server-eval](https://github.com/gandev-de/meteor-server-eval) to your app
*    start your app and open "Meteor Console" tab in "Chrome DevTools"

## Use

*    Connection
     - automatically connects to localhost:3000, connection to other ports with special command
       ("ws://localhost:3000/websocket")
     - polls the server and connects automatically when server starts/restarts

*    Evaluations
     - are executed as eval(expression) in meteor node.js container, optionally scoped to package context
     - REQUIREMENT: [meteor-server-eval](https://github.com/gandev-de/meteor-server-eval)

*    Input
     - type in a expression and hit ENTER to evaluate
     - type in .clear to empty the list of last evaluations
     - select last evaluated expressions with the UP and DOWN keys
     - typing se: opens a popup with commands:
         - se:use=package_name / sets the package in which evaluations should be scoped if supported
         - se:reset / resets scope to global
         - se:set-port=4000 / sets the port on localhost to switch to another app
         - se:port / shows current port

*    Output
     - Entry:
         - expression in first line, result below + scope with milliseconds for evaluation on the right side
         - internal messages (Error=red, Info=orange, SUCCESS=green)
     - Results:
         - Strings, Numbers, Booleans directly
         - Objects as tree
             - different colors for different types (Function=blue, Object=green, Array=orange, Circular=red)
             - Objects are shown with name (if available) of constructor Function
             - Circular References are marked and shown with path
             - Errors with stacktrace (special format with the attempt of highlighting more relevant lines)

## In action...

v0.2 Screenshot which shows Package scope functionality:

![ScreenShot](https://raw.github.com/gandev-de/meteor-server-console/screenshots/package-scope-functionality.png)

v0.1 Screenshot which shows common use:

![ScreenShot](https://raw.github.com/gandev-de/meteor-server-console/screenshots/meteor-console.png)
