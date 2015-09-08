/* globals beforeEach, afterEach, describe, it */
(function() {

  'use strict';

  var isNode = typeof window !== 'object';
  var expect, sinon, page;

  if (isNode) {
    // JSDOM be broke yo. Replace with phantomJS. Or figure out how to make it work.
    console.log(global.window);
    expect = require('unexpected').installPlugin(require('unexpected-sinon'));
    sinon = require('sinon');
    page =  process.env.PAGE_COV ? require('../index-cov') : require('../index');
  } else {
    expect = window.weknowhow.expect.installPlugin(window.weknowhow.unexpectedSinon);
    sinon = window.sinon;
    page = window.page;
  }
  var $ = document.querySelector.bind(document);

  function fireEvent(node, eventName) {
    var event;
    try {
      event = new MouseEvent(eventName, {
        view: window,
        bubbles: true,
        cancelable: true,
        button: 0
      });
    } catch (_) {
      // Old browser
      event = document.createEvent('MouseEvents');
      event.initEvent(eventName, true, true);
      event.button = 1;
      event.which = null;
    }
    node.dispatchEvent(event);
  }

  expect.addAssertion('string', 'to route to', function (expect, fromPath, toPath) {
    var handler = sinon.spy();
    this.errorMode = 'nested';
    return expect.promise(function (run) {
      page(toPath, run(handler));
      page.show(fromPath);
    }).then(function () {
      expect(handler, 'was called');
    });
  });

  var testStates = [
    {
      name: 'HTML5 history navigation',
      decodeURLparts: false,
      hashbang: false
    },
    {
      name: 'Hashbang navigation',
      decodeURLparts: false,
      hashbang: true
    },
    {
      name: 'Basepath set',
      decodeURLparts: false,
      hashbang: false,
      basePath: '/newBase'
    },
    {
      name: 'Automatic URL decoding disabled',
      decodeURLparts: true,
      hashbang: false
    }
  ];

  testStates.forEach(function (state) {
    describe(state.name, function () {
      var rootHandler;
      beforeEach(function () {
        rootHandler = sinon.spy();
        page('/', rootHandler);

        var pageOptions = {
          hashbang: state.hashbang,
          decodeURLComponents: state.decodeURLparts
        };

        if (state.basePath) {
          page.base(state.basePath);
        }

        page(pageOptions);
      });

      afterEach(function () {
        page.show('/');
        page.stop();
        page.callbacks = [];
        page.exits = [];
        page.base('');
      });

      describe('on startup', function () {
        it('should call root path', function () {
          expect(rootHandler, 'was called');
        });
      });

      describe('on redirect', function() {
        it('should load destination page', function() {
          page.redirect('/from', '/to');
          return expect('/from', 'to route to', '/to');
        });
        it('should work with short alias', function() {
          page('/one', '/two');
          return expect('/one', 'to route to', '/two');
        });
        it('should load done within redirect', function() {
          page('/redirect', function() {
            page.redirect('/done');
          });
          expect('/redirect', 'to route to', '/done');
        });
      });

      describe('on exit', function() {
        it('should run when exiting the page', function(done) {
          var visited = false;
          page('/exit', function() {
            visited = true;
          });

          page.exit('/exit', function() {
            expect(visited, 'to be true');
            done();
          });

          page('/exit');
          page('/');
        });

        it('should only run on matched routes', function(done) {
          page('/should-exit', function() {});
          page('/', function() {});

          page.exit('/should-not-exit', function() {
            throw new Error('This exit route should not have been called');
          });

          page.exit('/should-exit', function() {
            done();
          });

          page('/should-exit');
          page('/');
        });

        it('should use the previous context', function(done) {
          var unique;

          page('/', function() {});
          page('/bootstrap', function(ctx) {
            unique = ctx.unique = {};
          });

          page.exit('/bootstrap', function(ctx) {
            expect(ctx.unique, 'to be', unique);
            done();
          });

          page('/bootstrap');
          page('/');
        });
      });
    });
  });


}).call(this);
