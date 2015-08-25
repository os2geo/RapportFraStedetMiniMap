(function (angular) {
    'use strict';
    angular.module('rfs.controllers', [])

    .controller('config', ['$scope', '$rootScope', '$http', '$stateParams', 'configuration', '$window',
        function ($scope, $rootScope, $http, $stateParams, configuration, $window) {
            $rootScope.configuration = configuration;
            $rootScope.stateParams = $stateParams;
            $rootScope.$emit('configuration');
            
            $http.get('/couchdb/' + $rootScope.appID + '-' + configuration.organization + '/' + $stateParams.id).
            success(function (data, status, headers, config) {
                $rootScope.configuration.name = data.name;
                $window.document.title = data.name;
            }).
            error(function (data, status, headers, config) {

            });
        }
    ])

    .controller('indberetninger', ['$scope', '$rootScope', '$http', '$stateParams',
        function ($scope, $rootScope, $http, $stateParams) {
            $scope.showSidebar = function () {
                $rootScope.hideSidebar = !$rootScope.hideSidebar;
                console.log("rune");
            };

            $rootScope.$on('overlay', function (e, layer) {
                if ($rootScope.configuration.database === layer.config.database) {
                    //console.log(layer);
                    $scope.layer = layer.data;
                }
            });
        }
    ])

    .controller('indberetning', ['$scope', '$rootScope', '$http', '$stateParams',
        function ($scope, $rootScope, $http, $stateParams) {
            $http.get('http://data.kosgis.dk/couchdb/' + $rootScope.configuration.database + '/' + $stateParams.indberetning).
            success(function (data, status, headers, config) {
                $scope.indberetning = data;
            }).
            error(function (data, status, headers, config) {
                $rootScope.error = data;
            });
        }
    ]);
})(this.angular);