﻿angular.module('cgBusy', []);

//loosely modeled after angular-promise-tracker
angular.module('cgBusy').factory('_cgBusyTrackerFactory', ['$timeout', '$q', function ($timeout, $q) {

    return function () {

        var tracker = {};
        tracker.promises = [];
        tracker.delayPromise = null;
        tracker.durationPromise = null;

        tracker.reset = function (options) {
            tracker.minDuration = options.minDuration;

            tracker.promises = [];
            angular.forEach(options.promises, function (p) {
                if (!p || p.$cgBusyFulfilled) {
                    return;
                }
                addPromiseLikeThing(p);
            });

            if (tracker.promises.length === 0) {
                //if we have no promises then dont do the delay or duration stuff
                return;
            }

            if (options.delay) {
                tracker.delayPromise = $timeout(function () {
                    tracker.delayPromise = null;
                }, options.delay);
            }
            if (options.minDuration) {
                tracker.durationPromise = $timeout(function () {
                    tracker.durationPromise = null;
                }, options.minDuration);
            }
        };

        tracker.getThen = function (promise) {
            var then = promise && (promise.then || promise.$then ||
	        	(promise.$promise && promise.$promise.then));

            if (promise.denodeify) {
                return $q.when(promise).then;
            }

            return then;
        };

        var addPromiseLikeThing = function (promise) {
            var then = tracker.getThen(promise);

            if (!then) {
                throw new Error('cgBusy expects a promise (or something that has a .promise or .$promise');
            }

            if (tracker.promises.indexOf(promise) !== -1) {
                return;
            }
            tracker.promises.push(promise);

            then(function () {
                promise.$cgBusyFulfilled = true;
                if (tracker.promises.indexOf(promise) === -1) {
                    return;
                }
                tracker.promises.splice(tracker.promises.indexOf(promise), 1);
            }, function () {
                promise.$cgBusyFulfilled = true;
                if (tracker.promises.indexOf(promise) === -1) {
                    return;
                }
                tracker.promises.splice(tracker.promises.indexOf(promise), 1);
            });
        };

        tracker.active = function () {
            if (tracker.delayPromise) {
                return false;
            }
            if (tracker.durationPromise) {
                return true;
            }
            return tracker.promises.length > 0;
        };

        return tracker;

    };
}]);

angular.module('cgBusy').value('cgBusyDefaults', {});

angular.module('cgBusy').directive('cgBusy', ['$compile', '$templateCache', 'cgBusyDefaults', '$http', '_cgBusyTrackerFactory',
	function ($compile, $templateCache, cgBusyDefaults, $http, _cgBusyTrackerFactory) {
	    return {
	        restrict: 'A',
	        link: function (scope, element, attrs, fn) {

	            //Apply position:relative to parent element if necessary
	            var position = element.css('position');
	            if (position === 'static' || position === '' || typeof position === 'undefined') {
	                element.css('position', 'relative');
	            }

	            var templateElement;
	            var currentTemplate;
	            var templateScope;
	            var backdrop;
	            var tracker = _cgBusyTrackerFactory();

	            var defaults = {
	                templateUrl: 'angular-busy.html',
	                delay: 0,
	                minDuration: 0,
	                backdrop: true,
	                message: 'Please Wait...'
	            };

	            angular.extend(defaults, cgBusyDefaults);

	            scope.$watchCollection(attrs.cgBusy, function (options) {

	                if (!options) {
	                    options = { promise: null };
	                }

	                if (angular.isString(options)) {
	                    throw new Error('Invalid value for cg-busy.  cgBusy no longer accepts string ids to represent promises/trackers.');
	                }

	                //is it an array (of promises) or one promise
	                if (angular.isArray(options) || tracker.getThen(options)) {
	                    options = { promise: options };
	                }

	                options = angular.extend(angular.copy(defaults), options);

	                if (!options.templateUrl) {
	                    options.templateUrl = defaults.templateUrl;
	                }

	                if (!angular.isArray(options.promise)) {
	                    options.promise = [options.promise];
	                }

	                // options.promise = angular.isArray(options.promise) ? options.promise : [options.promise];
	                // options.message = options.message ? options.message : 'Please Wait...';
	                // options.template = options.template ? options.template : cgBusyTemplateName;
	                // options.minDuration = options.minDuration ? options.minDuration : 0;
	                // options.delay = options.delay ? options.delay : 0;

	                if (!templateScope) {
	                    templateScope = scope.$new();
	                }

	                templateScope.$message = options.message;

	                if (!angular.equals(tracker.promises, options.promise)) {
	                    tracker.reset({
	                        promises: options.promise,
	                        delay: options.delay,
	                        minDuration: options.minDuration
	                    });
	                }

	                templateScope.$cgBusyIsActive = function () {
	                    return tracker.active();
	                };


	                if (!templateElement || currentTemplate !== options.templateUrl || backdrop !== options.backdrop) {

	                    if (templateElement) {
	                        templateElement.remove();
	                    }

	                    currentTemplate = options.templateUrl;
	                    backdrop = options.backdrop;

	                    $http.get(currentTemplate, { cache: $templateCache }).success(function (indicatorTemplate) {

	                        options.backdrop = typeof options.backdrop === 'undefined' ? true : options.backdrop;
	                        var backdrop = options.backdrop ? '<div class="cg-busy cg-busy-backdrop"></div>' : '';

	                        var template = '<div class="cg-busy cg-busy-animation ng-hide" ng-show="$cgBusyIsActive()">' + backdrop + indicatorTemplate + '</div>';
	                        templateElement = $compile(template)(templateScope);

	                        angular.element(templateElement.children()[options.backdrop ? 1 : 0])
								.css('position', 'absolute')
								.css('top', 0)
								.css('left', 0)
								.css('right', 0)
								.css('bottom', 0);
	                        element.append(templateElement);

	                    }).error(function (data) {
	                        throw new Error('Template specified for cgBusy (' + options.templateUrl + ') could not be loaded. ' + data);
	                    });
	                }

	            }, true);
	        }
	    };
	}
]);


angular.module('cgBusy').run(['$templateCache', function ($templateCache) {
    'use strict';

    $templateCache.put('angular-busy.html',
      "<div class=\"cg-busy-default-wrapper\">\n" +
      "\n" +
      "   <div class=\"cg-busy-default-sign\">\n" +
      "\n" +
      "      <div class=\"cg-busy-default-spinner\">\n" +
      "         <div class=\"bar1\"></div>\n" +
      "         <div class=\"bar2\"></div>\n" +
      "         <div class=\"bar3\"></div>\n" +
      "         <div class=\"bar4\"></div>\n" +
      "         <div class=\"bar5\"></div>\n" +
      "         <div class=\"bar6\"></div>\n" +
      "         <div class=\"bar7\"></div>\n" +
      "         <div class=\"bar8\"></div>\n" +
      "         <div class=\"bar9\"></div>\n" +
      "         <div class=\"bar10\"></div>\n" +
      "         <div class=\"bar11\"></div>\n" +
      "         <div class=\"bar12\"></div>\n" +
      "      </div>\n" +
      "\n" +
      "      <div class=\"cg-busy-default-text\">{{$message}}</div>\n" +
      "\n" +
      "   </div>\n" +
      "\n" +
      "</div>"
    );

}]);