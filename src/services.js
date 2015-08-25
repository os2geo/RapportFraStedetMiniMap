(function (window, angular, URL) {
    'use strict';

    angular.module('rfs.services', [])

    .factory('kfticket', ['$q', '$http', '$rootScope', '$browser', '$timeout',
        function ($q, $http, $rootScope, $browser, $timeout) {
            var ticket;
            var time = 0;
            return {
                getTicket: function () {
                    var deferred = $q.defer();
                    if (Date.now() - time < 86400000) {
                        $timeout(function () {
                            deferred.resolve(ticket);
                        });
                    } else {
                        $http.get($rootScope.kfticket).
                        success(function (data, status, headers, config) {
                            time = Date.now();
                            ticket = data;
                            deferred.resolve(ticket);
                        }).
                        error(function (data, status, headers, config) {
                            deferred.reject();
                        });
                    }
                    /*
                    var cookies = $browser.cookies();
                    if (cookies.kfticket) {
                        window.setTimeout(function () {
                            deferred.resolve(cookies.kfticket);
                        }, 0);
                    } else {
                        $http.get($rootScope.kfticket).
                        success(function (data, status, headers, config) {
                            cookies = $browser.cookies();
                            deferred.resolve(cookies.kfticket);
                        }).
                        error(function (data, status, headers, config) {
                            deferred.reject();
                        });
                    }*/
                    return deferred.promise;
                }
            };
        }
    ])

    .factory('tilestream', ['$location',
        function ($location) {
            if ($location.$$host === 'localhost') {
                return 'http://localhost:8888/v2/';
            }
            return 'http://{s}.' + $location.$$host + '/tilestream/v2/';
    }])

    .factory('jsonpInterceptor', ['$timeout', '$window',
        function ($timeout, $window) {
            return {
                'request': function (config) {
                    if (config.method === 'JSONP') {
                        var callbackId = angular.callbacks.counter.toString(36);
                        config.callbackName = 'angular_callbacks_' + callbackId;
                        config.params.callback = config.callbackName;
                        //config.url = config.url.replace('JSON_CALLBACK', config.callbackName);

                        $timeout(function () {
                            $window[config.callbackName] = angular.callbacks['_' + callbackId];
                        }, 0, false);
                    }

                    return config;
                },

                'response': function (response) {
                    var config = response.config;
                    if (config.method === 'JSONP') {
                        delete $window[config.callbackName]; // cleanup
                    }

                    return response;
                },

                'responseError': function (rejection) {
                    var config = rejection.config;
                    if (config.method === 'JSONP') {
                        delete $window[config.callbackName]; // cleanup
                    }

                    return rejection;
                }
            };
        }
    ]);

})(this, this.angular, this.URL);