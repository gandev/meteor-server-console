## before v1.0

- solution for performance issues with very large objects
  + nprogress loading progress
- some kind of EJSON support
- show types on autocomplete
- syntax highlighting in input + allow multiple lines
- watches with update interval

current bugs/limitations:
- results returning false
- autocomplete shortcut
- styling on different platforms

maybe..
- basic console commands like cd, ls, touch, mkdir, ...
- insert package scope eval per command

## v0.5 - helpers and logging

- execute helper functions by executing .helper in console (supported helpers autocomplete)
- git command wrapper implemented with helper functions
- optionally showing server log entries
- minor usability improvements

## v0.4 - watch it

- new watch view to watch expressions
- basic autocomplete like feature for object properties

## v0.3 - more infos

- styling + usage optimizations
- show formatted stacktraces
- reorganize (patch in first appearance) and show circulars with path
- new port commands to switch connection on localhost to different apps

## v0.2 - package scoping

- new command system to switch package
- server-eval evaluates in package scope if supported

## v0.1 - first ever

- evaluate, browse results
