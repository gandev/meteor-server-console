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
     - currently automatically connects to localhost:3000
       ("ws://localhost:3000/websocket")
     - polls the server and reconnects automatically when server restarts

*    Console
     - type in a expression and hit ENTER to evaluate
     - type in .clear to empty the list of last evaluations
     - select last evaluated expressions with the UP and DOWN keys
     - typing se: opens a popup with commands:
          se:use=package_name / sets the package in which evaluations should be scoped if supported
          se:reset / resets scope to global

*    Evaluations
     - are executed as eval(expression) in meteor node.js container, optionally scoped to package context
     - REQUIREMENT: [meteor-server-eval](https://github.com/gandev-de/meteor-server-eval)

## In action...

Package scope functionality:

![ScreenShot](https://raw.github.com/gandev-de/meteor-server-console/screenshots/package-scope-functionality.png)

v0.1 Screenshot which shows common use:

![ScreenShot](https://raw.github.com/gandev-de/meteor-server-console/screenshots/meteor-console.png)
