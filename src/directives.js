/*jslint evil: true */
/*jslint nomen: true*/
(function (angular, L, console) {
    "use strict";
    angular.module('rfs.directives', []).directive('leafletSearch', ['$http', '$rootScope', '$q', '$timeout', 'kfticket', '$sce',
        function ($http, $rootScope, $q, $timeout, kfticket, $sce) {
            return {
                restrict: "E",
                templateUrl: 'templates/search.html',
                scope: {
                    widget: '='
                },
                controller: ['$scope',
                    function ($scope) {
                        var awsConfig = {},
                            overlaySearch = L.featureGroup().addTo($rootScope.map),
                            n,
                            awskeyvalue = $scope.widget.options.split('='),
                            awsOptions = {
                                baseUrl: 'http://dawa.aws.dk',
                                adgangsadresserOnly: true
                            },
                            caches = [{}, {}, {}, {}],
                            paths = ['/vejnavne/autocomplete', '/adgangsadresser/autocomplete', '/adresser/autocomplete'],
                            prevSearch = "",
                            prevResultType = 0,
                            constrainedToAdgangsAdresseId,
                            awsResponse = function (data) {
                                $scope.search.result = data;
                                $scope.search.isopen = true;
                            },
                            showAdressInMap = function (item) {
                                if (item.length > 0) {

                                    overlaySearch.clearLayers();
                                    var point = [item[0].adgangspunkt.koordinater[1], item[0].adgangspunkt.koordinater[0]],
                                        marker = L.marker(point);

                                    overlaySearch.addLayer(marker);
                                    marker.bindPopup($scope.search.input).openPopup();

                                    $timeout(function () {
                                        $scope.search.isopen = false;
                                        $rootScope.map.setView(point, $rootScope.baselayer.selectZoom || Infinity, {
                                            animate: true
                                        });
                                    }, 500);
                                }
                            },
                            get = function (path, params, cache, cb) {
                                var stringifiedParams = JSON.stringify(params),
                                    httpopt = {
                                        method: 'JSONP',
                                        url: awsOptions.baseUrl + path,
                                        params: angular.extend({
                                            callback: 'JSON_CALLBACK'
                                        }, params, awsConfig)
                                    };
                                if (cache && cache[stringifiedParams]) {
                                    return cb(cache[stringifiedParams]);
                                }

                                $http(httpopt)
                                    .then(function (res) {
                                        if (cache) {
                                            cache[stringifiedParams] = res.data;
                                        }
                                        cb(res.data);
                                    });
                            },
                            invokeSource = function (typeIdx, q, cb) {
                                var maxTypeIdx = awsOptions.adgangsadresserOnly ? 1 : 2,
                                    params = {
                                        q: q
                                    };
                                if (constrainedToAdgangsAdresseId) {
                                    params = {
                                        adgangsadresseid: constrainedToAdgangsAdresseId
                                    };
                                    typeIdx = 2;

                                    // the constraint to search for adresser for a specific adgangsadresse is a one-off, so reset it
                                    constrainedToAdgangsAdresseId = undefined;
                                }

                                get(paths[typeIdx], params, caches[typeIdx], function (data) {
                                    if (data.length <= 1 && typeIdx < maxTypeIdx) {
                                        invokeSource(typeIdx + 1, q, cb);
                                    } else {
                                        prevResultType = typeIdx;
                                        prevSearch = q;
                                        cb(data);
                                    }
                                });
                            };
                        $scope.selectAddr = function (item) {

                            if (item.vejnavn) {
                                $scope.search.input = (item.tekst + ' ');
                                invokeSource(1, $scope.search.input, awsResponse);
                            } else if (item.adgangsadresse) {
                                if (awsOptions.adgangsadresserOnly) {
                                    $scope.search.input = item.tekst;
                                    get('/adgangsadresser', {
                                        id: item.adgangsadresse.id
                                    }, caches[3], showAdressInMap);
                                    return;
                                }
                                var adgAdr = item.adgangsadresse,
                                    getopt = {
                                        adgangsadresseid: adgAdr.id
                                    };
                                // We need to check if there is more than one
                                // adresse associated with the adgangsadresse.
                                get('/adresser/autocomplete', getopt, null,
                                    function (data) {
                                        if (data.length > 1) {
                                            // We'll prepare a text query and let the user enter more details (etage/dør)
                                            // before triggering a new search

                                            // We'll try to help the user by setting the caret at the appropriate position for
                                            // entering etage and dør
                                            var textBefore = adgAdr.vejnavn + ' ' + adgAdr.husnr + ', ',
                                                textAfter = ' ',
                                                element = L.DomUtil.get("awsInput");
                                            if (adgAdr.supplerendebynavn) {
                                                textAfter += ', ' + adgAdr.supplerendebynavn;
                                            }
                                            if (adgAdr.postnr) {
                                                textAfter += ', ' + adgAdr.postnr;
                                            }
                                            if (adgAdr.postnrnavn) {
                                                textAfter += ' ' + adgAdr.postnrnavn;
                                            }
                                            $scope.search.input = textBefore + textAfter;
                                            //var element = $document.find("#awsInput");
                                            element.focus();
                                            element.selectionStart = element.selectionEnd = textBefore.length;

                                            // in addition to constructing a prebuilt query for the user to enter etage and dør,
                                            // we let the autocomplete widget perform a one-off query for adresser matching the
                                            // selected adgangsadresse
                                            constrainedToAdgangsAdresseId = adgAdr.id;
                                            invokeSource(2, $scope.search.input, awsResponse);

                                        } else if (data.length === 1) {
                                            $scope.search.input = data[0].tekst;
                                            get('/adgangsadresser', {
                                                id: adgAdr.id
                                            }, caches[3], showAdressInMap);
                                        }
                                    });
                            } else {
                                $scope.search.input = item.tekst;
                                get('/adresser', {
                                    id: item.adresse.id
                                }, caches[3], showAdressInMap);
                            }
                        };
                        for (n = 0; n < awskeyvalue.length; null) {
                            awsConfig[awskeyvalue[n]] = awskeyvalue[n + 1];
                            n = n + 2;
                        }



                        $scope.search = {
                            isopen: false,
                            input: "",
                            result: []
                        };
                        $scope.keyup = function ($event) {
                            $scope.search.lastKey = $event.keyCode;
                            //$event.preventDefault();
                            var item, i, q, sourceTypeIdx,
                                fundet = false;
                            if ($event.keyCode === 40) {
                                //down
                                if ($scope.search.result.length > 0) {
                                    if ($scope.selected) {

                                        for (i = 0; i < $scope.search.result.length; i += 1) {
                                            item = $scope.search.result[i];
                                            if (item === $scope.selected) {
                                                fundet = true;
                                                if (i < $scope.search.result.length - 1) {
                                                    $scope.selected = $scope.search.result[i + 1];
                                                    $scope.search.input = $scope.selected.tekst;
                                                }
                                                break;
                                            }
                                        }
                                        if (!fundet) {
                                            $scope.selected = $scope.search.result[0];
                                        }
                                    } else {
                                        $scope.selected = $scope.search.result[0];
                                    }
                                }
                            } else if ($event.keyCode === 38) {
                                /*$event.preventDefault();
                                $event.stopPropagation();
                                $event.stopImmediatePropagation();
                                */
                                //up
                                if ($scope.search.result.length > 0) {
                                    if ($scope.selected) {
                                        for (i = 0; i < $scope.search.result.length; i += 1) {
                                            item = $scope.search.result[i];
                                            if (item === $scope.selected) {

                                                if (i > 0) {
                                                    $scope.selected = $scope.search.result[i - 1];
                                                    $scope.search.input = $scope.selected.tekst;
                                                }
                                                break;
                                            }
                                        }
                                    }
                                }
                            } else {
                                if ($scope.search.input.length > 1) {
                                    q = $scope.search.input;

                                    // we start over searching in vejnavne (index 0) if the current query is not a prefix of
                                    // the previous one.
                                    sourceTypeIdx = q.indexOf(prevSearch) !== 0 ? 0 : prevResultType;

                                    invokeSource(sourceTypeIdx, q, awsResponse);
                                    //search();
                                }
                            }
                        };
                        $scope.keydown = function ($event) {
                            if ($event.keyCode === 13) {
                                $event.preventDefault();
                                $scope.selectAddr($scope.selected);
                                $scope.search.lastKey = $event.keyCode;
                            }
                        };



                    }]
            };
        }]).directive('widgetKortkontrol', ['$http', '$rootScope', '$q', '$timeout', 'kfticket', '$sce',
        function ($http, $rootScope, $q, $timeout, kfticket, $sce) {
            return {
                restrict: "E",
                scope: {
                    widget: '='
                },
                templateUrl: 'templates/widget_kortkontrol.html',
                controller: ['$scope',
                    function ($scope) {
                        $rootScope.showRight = $scope.widget.visible;
                        $scope.showSidebar = function () {
                            $scope.widget.visible = !$scope.widget.visible;
                            $rootScope.showRight = !$rootScope.showRight;
                            $scope.$parent.$parent.$parent.isCollapsed = true;
                            $timeout(function () {
                                $scope.$parent.$parent.$parent.map.invalidateSize();
                            }, 100);

                        };
                    }]
            };
        }]).directive('leafletNavbar', ['$http', '$rootScope', '$q', '$timeout', 'kfticket', '$sce',
        function ($http, $rootScope, $q, $timeout, kfticket, $sce) {
            return {
                restrict: "E",
                templateUrl: 'templates/navbar.html',
                controller: ['$scope',
                    function ($scope) {
                        /*$scope.showSidebar = function () {
                            $rootScope.hideSidebar = !$rootScope.hideSidebar;
                            $scope.isCollapsed = true;
                        };*/
                        $scope.isCollapsed = true;
                    }]
            };
        }]).directive('leafletSidebar', ['$http', '$rootScope', '$q', '$timeout', 'kfticket', '$sce',
        function ($http, $rootScope, $q, $timeout, kfticket, $sce) {
            return {
                restrict: "E",
                templateUrl: 'templates/sidebar.html',
                controller: ['$scope',
                    function ($scope) {
                        $scope.showSidebar = function () {
                            $rootScope.hideSidebar = !$rootScope.hideSidebar;
                        };
                        $rootScope.$on('configuration', function () {
                            console.log($rootScope.configuration);
                        });
                        $rootScope.$on('overlay', function (e, layer) {
                            if ($rootScope.configuration.database === layer.config.database) {
                                console.log(layer);
                                $scope.layer = layer.data;
                            }
                        });
                    }]
            };
        }]).directive('leafletLegend', ['$http', '$rootScope', '$q', '$timeout', 'kfticket', '$sce', 'tilestream',
        function ($http, $rootScope, $q, $timeout, kfticket, $sce, tilestream) {
            return {
                restrict: "E",
                replace: true,
                templateUrl: 'templates/widget_legend.html',
                controller: ['$scope', '$rootScope',
                    function ($scope, $rootScope) {
                        $scope.trustAsHtml = function (html) {
                            $sce.trustAsHtml(html);
                        };
                        $scope.isBaselayersCollapsed = false;
                        $scope.isOverlaysCollapsed = false;
                        $scope.oneAtATime = true;
                        $rootScope.overlays = [];
                        var createMap = function (epsg) {
                                if (epsg === "25832") {
                                    $scope.map.options.crs = new L.Proj.CRS.TMS('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs', [120000, 5900000, 1000000, 6500000], {
                                        resolutions: [1638.4, 819.2, 409.6, 204.8, 102.4, 51.2, 25.6, 12.8, 6.4, 3.2, 1.6, 0.8, 0.4, 0.2, 0.1, 0.05, 0.025, 0.0125, 0.00625]
                                    });
                                } else {
                                    $scope.map.options.crs = L.CRS.EPSG3857;
                                }
                            },
                            createLayer = function (value) {
                                var deferred = $q.defer();
                                $timeout(function () {
                                    var jsonTransformed = {},
                                        theme = {},
                                        i,
                                        style,
                                        fundet,
                                        item;
                                    if (value.options) {
                                        jsonTransformed = JSON.parse(value.options, function (key, value) {
                                            if (value && (typeof value === 'string') && value.indexOf("function") === 0) {
                                                var jsFunc = new Function('return ' + value)();
                                                return jsFunc;
                                            }
                                            return value;
                                        });
                                    }
                                    if (typeof (value.minZoom) !== 'undefined' && value.minZoom !== null) {
                                        jsonTransformed.minZoom = value.minZoom;
                                    }
                                    if (typeof (value.maxZoom) !== 'undefined' && value.maxZoom !== null) {
                                        jsonTransformed.maxZoom = value.maxZoom;
                                    }
                                    if (typeof (value.maxNativeZoom) !== 'undefined' && value.maxNativeZoom !== null) {
                                        jsonTransformed.maxNativeZoom = value.maxNativeZoom;
                                    }
                                    if (typeof (value.disableClusteringAtZoom) !== 'undefined' && value.disableClusteringAtZoom !== null) {
                                        jsonTransformed.disableClusteringAtZoom = value.disableClusteringAtZoom;
                                    }

                                    if (value.attribution) {
                                        jsonTransformed.attribution = value.attribution;
                                    }
                                    if (value.type === 'xyz' && value.url && value.url !== "") {
                                        if (value.ticket) {
                                            kfticket.getTicket().then(function (ticket) {
                                                jsonTransformed.ticket = ticket;
                                                value.leaflet = L.tileLayer(value.url, jsonTransformed);
                                                deferred.resolve(value);
                                            });
                                        } else {
                                            value.leaflet = L.tileLayer(value.url, jsonTransformed);
                                            deferred.resolve(value);
                                        }
                                    } else if (value.type === 'wms') {
                                        jsonTransformed = angular.extend(jsonTransformed, value.wms);
                                        if (value.ticket) {
                                            kfticket.getTicket().then(function (ticket) {
                                                jsonTransformed.ticket = ticket;
                                                value.leaflet = L.tileLayer.wms(value.url, jsonTransformed);
                                                deferred.resolve(value);
                                            });
                                        } else {
                                            value.leaflet = L.tileLayer.wms(value.url, jsonTransformed);
                                            deferred.resolve(value);
                                        }
                                    } else if (value.type === 'geojson' || value.type === 'database' || value.type === 'straks' || value.type === 'indberetninger' || value.type === 'opgaver') {

                                        if (value.styles) {
                                            for (i = 0; i < value.styles.length; i += 1) {
                                                style = value.styles[i];
                                                theme[style.id] = style;
                                            }
                                        }
                                        if (value.style) {
                                            jsonTransformed.style = JSON.parse(value.style, function (key, value) {
                                                if (value && (typeof value === 'string') && value.indexOf("function") !== -1) {
                                                    var jsFunc = new Function("theme", 'return ' + value)(theme);
                                                    return jsFunc;
                                                }
                                                return value;
                                            });
                                        }
                                        if (value.onEachFeature) {
                                            jsonTransformed.onEachFeature = JSON.parse(value.onEachFeature, function (key, value) {
                                                if (value && (typeof value === 'string') && value.indexOf("function") !== -1) {
                                                    var jsFunc = new Function('return ' + value)();
                                                    return jsFunc;
                                                }
                                                return value;
                                            });
                                        }
                                        if (value.pointToLayer) {
                                            jsonTransformed.pointToLayer = JSON.parse(value.pointToLayer, function (key, value) {
                                                if (value && (typeof value === 'string') && value.indexOf("function") !== -1) {
                                                    var jsFunc = new Function("theme", "L", 'return ' + value)(theme, L);
                                                    return jsFunc;
                                                }
                                                return value;
                                            });
                                        }
                                        if (value.type === 'database') {
                                            $http.get('/couchdb/db-' + value.database + '/_design/views/_view/data?include_docs=true').success(function (data, status, headers, config) {
                                                var geoJsonLayer = L.geoJson(null, jsonTransformed),
                                                    doc;
                                                for (i = 0; i < data.rows.length; i += 1) {
                                                    doc = data.rows[i].doc;
                                                    //if (doc._id.substring(0, 7) !== "_design") {
                                                    geoJsonLayer.addData(doc);
                                                    //}
                                                }
                                                if (value.markercluster) {

                                                    value.leaflet = new L.MarkerClusterGroup(jsonTransformed);
                                                    value.leaflet.addLayer(geoJsonLayer);
                                                } else {
                                                    value.leaflet = geoJsonLayer;
                                                }
                                                if (value.mouseover) {
                                                    value.leaflet.on('mouseover', function (e) {
                                                        e.layer.openPopup();
                                                    });
                                                    value.leaflet.on('mouseout', function (e) {
                                                        e.layer.closePopup();
                                                    });
                                                }
                                                deferred.resolve(value);
                                            }).error(function (data, status, headers, config) {
                                                deferred.reject(data);
                                            });
                                        } else if (value.type === 'geojson') {
                                            if (value.tile) {
                                                value.leaflet = new L.TileLayer.GeoJSON2('/couchdb/' + $rootScope.appID + '/' + $rootScope.configuration._id + '/' + value.id + '/{id}', {
                                                    clipTiles: true
                                                        /*,
                                                        unique: function (feature) {
                                                            return feature.id;
                                                        }*/
                                                }, jsonTransformed);
                                                deferred.resolve(value);
                                                /*value.leaflet = new L.TileLayer.GeoJSON('http://localhost:4000/couchdb/app-3495ccf8aafcb1541a0ef7cc2d01178e/' + $rootScope.configuration._id + '/' + value.id + '/{z}/{x}/{y}', {
                                                    clipTiles: true,
                                                    unique: function (feature) {
                                                        return feature.FID;
                                                    }
                                                }, jsonTransformed);*/
                                                /*value.leaflet = new L.TileLayer.GeoJSON('http://localhost:5000/tilestache/' + value.id + '/{z}/{x}/{y}.geojson', {
                                                    clipTiles: true,
                                                    unique: function (feature) {
                                                        return feature.FID;
                                                    }
                                                }, jsonTransformed);*/
                                            } else {
                                                if (value.geojson) {
                                                    value.leaflet = L.geoJson(value.geojson, jsonTransformed);
                                                    deferred.resolve(value);
                                                } else {
                                                    $http.get('/couchdb/' + $rootScope.appID + '/' + $rootScope.configuration._id + '/' + value.id + '.geojson').success(function (data, status, headers, config) {
                                                        if (value.markercluster) {
                                                            var geoJsonLayer = L.geoJson(data, jsonTransformed);
                                                            value.leaflet = new L.MarkerClusterGroup(jsonTransformed);
                                                            value.leaflet.addLayer(geoJsonLayer);
                                                        } else {
                                                            value.leaflet = L.geoJson(data, jsonTransformed);
                                                        }
                                                        if (value.mouseover) {
                                                            value.leaflet.on('mouseover', function (e) {
                                                                e.layer.openPopup();
                                                            });
                                                            value.leaflet.on('mouseout', function (e) {
                                                                e.layer.closePopup();
                                                            });
                                                        }
                                                        deferred.resolve(value);

                                                    }).error(function (data, status, headers, config) {
                                                        deferred.reject(data);
                                                    });
                                                }
                                            }
                                        } else if (value.type === 'straks') {
                                            $http.get('/api/' + value.database + '/straks/' + value.straks).success(function (data, status, headers, config) {
                                                if (data.geojson) {
                                                    value.leaflet = L.geoJson(data.geojson, jsonTransformed);
                                                    if (value.mouseover) {
                                                        value.leaflet.on('mouseover', function (e) {
                                                            e.layer.openPopup();
                                                        });
                                                        value.leaflet.on('mouseout', function (e) {
                                                            e.layer.closePopup();
                                                        });
                                                    }
                                                    deferred.resolve(value);
                                                } else {
                                                    deferred.reject(data);
                                                }
                                            }).error(function (data, status, headers, config) {
                                                deferred.reject(data);
                                            });
                                        }
                                    } else if (value.type === 'mbtiles' && value.mbtile && value.bounds) {
                                        if (typeof (value.minZoom) !== 'undefined') {
                                            jsonTransformed.minZoom = value.minZoom;
                                        }
                                        if (typeof (value.maxZoom) !== 'undefined') {
                                            jsonTransformed.maxZoom = value.maxZoom;
                                        }
                                        value.leaflet = L.tileLayer(tilestream + value.mbtile + '/{z}/{x}/{y}.' + value.format, jsonTransformed);
                                        deferred.resolve(value);
                                    }
                                });
                                return deferred.promise;
                            },
                            selectedBaselayer,
                            selectedBaselayerLeaflet,
                            addLayer = function (layer) {
                                if (layer.selected) {
                                    if ($scope.map.hasLayer(layer.leaflet)) {
                                        $scope.map.removeLayer(layer.leaflet);
                                    }
                                    $scope.map.addLayer(layer.leaflet);
                                    if (layer.leaflet.setZIndex) {
                                        layer.leaflet.setZIndex(layer.index);
                                    }
                                }
                            },
                            removeOverlays = function () {
                                var i,
                                    overlay;
                                for (i = 0; i < $rootScope.overlays.length; i += 1) {
                                    overlay = $rootScope.overlays[i];
                                    if ($scope.map.hasLayer(overlay.leaflet)) {
                                        $scope.map.removeLayer(overlay.leaflet);
                                    }
                                }
                                $rootScope.overlays = [];
                                if ($scope.map.hasLayer($scope.crosshairLayer)) {
                                    $scope.map.removeLayer($scope.crosshairLayer);
                                }
                            },
                            createOverlays = function () {
                                var i, overlay;
                                for (i = 0; i < $rootScope.configuration.map.overlays.length; i += 1) {
                                    overlay = $rootScope.configuration.map.overlays[i];
                                    overlay.index = i + 1;
                                    $rootScope.overlays.push(overlay);
                                    createLayer(overlay).then(addLayer);
                                }
                                $scope.map.addLayer($scope.crosshairLayer);
                                if ($scope.crosshairLayer.setZIndex) {
                                    $scope.crosshairLayer.setZIndex(i + 1);
                                }
                            };

                        $scope.overlayChange = function (overlay) {
                            if ($scope.map.hasLayer(overlay.leaflet)) {
                                $scope.map.removeLayer(overlay.leaflet);
                            }
                            addLayer(overlay);
                        };
                        $rootScope.baselayerChange = function (layer) {
                            if (layer !== $rootScope.baselayer) {
                                createLayer(layer).then(function (layer) {
                                    var bounds = $scope.map.getBounds(),
                                        redoOverlays = layer.epsg !== $rootScope.baselayer.epsg;
                                    if ($scope.map.hasLayer($rootScope.baselayer.leaflet)) {
                                        $scope.map.removeLayer($rootScope.baselayer.leaflet);
                                    }
                                    if (redoOverlays) {
                                        removeOverlays();
                                        createMap(layer.epsg);
                                    }
                                    $scope.map.addLayer(layer.leaflet);
                                    if (layer.leaflet.setZIndex) {
                                        layer.leaflet.setZIndex(0);
                                    }
                                    $rootScope.baselayer = layer;
                                    if (redoOverlays) {
                                        $scope.map.fitBounds(bounds);
                                        createOverlays();
                                    }
                                });
                            }
                        };
                        $rootScope.overlays = [];
                        $scope.map = $rootScope.map;
                        $scope.crosshairLayer = L.layerGroup();
                        $scope.layer = L.geoJson();
                        $rootScope.$on('configuration', function () {
                            if ($rootScope.baselayer) {
                                if ($rootScope.stateParams.x && $rootScope.stateParams.y && $rootScope.stateParams.z) {
                                    $scope.map.setView([$rootScope.stateParams.y, $rootScope.stateParams.x], $rootScope.stateParams.z);
                                } else if ($rootScope.stateParams.aws) {
                                    $http({
                                        method: 'JSONP',
                                        url: 'http://dawa.aws.dk/adgangsadresser',
                                        params: angular.extend({
                                            callback: 'JSON_CALLBACK'
                                        }, {
                                            q: $rootScope.stateParams.aws
                                        })
                                    }).then(function (res) {
                                        if (res.data && res.data.length > 0) {
                                            $scope.map.setView([res.data[0].adgangspunkt.koordinater[1], res.data[0].adgangspunkt.koordinater[0]], $rootScope.stateParams.z || $rootScope.baselayer.selectZoom || Infinity);
                                        }
                                    });
                                }
                            } else {
                                if (typeof $rootScope.configuration.isBaselayersCollapsed === 'undefined') {
                                    $scope.isBaselayersCollapsed = false;
                                } else {
                                    $scope.isBaselayersCollapsed = $rootScope.configuration.isBaselayersCollapsed;
                                }
                                if (typeof $rootScope.configuration.isOverlaysCollapsed === 'undefined') {
                                    $scope.isOverlaysCollapsed = false;
                                } else {
                                    $scope.isOverlaysCollapsed = $rootScope.configuration.isOverlaysCollapsed;
                                }
                                var i, baselayer;

                                for (i = 0; i < $rootScope.configuration.map.baselayers.length; i += 1) {
                                    baselayer = $rootScope.configuration.map.baselayers[i];
                                    if (baselayer.selected) {
                                        $rootScope.baselayer = baselayer;
                                        $scope.selectedBaselayer = i;
                                        break;
                                    }
                                }
                                if ($rootScope.baselayer) {
                                    createMap($rootScope.baselayer.epsg);
                                    createLayer($rootScope.baselayer).then(function (layer) {
                                        $scope.map.addLayer(layer.leaflet);
                                        if (layer.leaflet.setZIndex) {
                                            layer.leaflet.setZIndex(0);
                                        }
                                        if ($rootScope.stateParams.x && $rootScope.stateParams.y && $rootScope.stateParams.z) {
                                            $scope.map.setView([$rootScope.stateParams.y, $rootScope.stateParams.x], $rootScope.stateParams.z);
                                        } else if ($rootScope.stateParams.aws) {
                                            $http({
                                                method: 'JSONP',
                                                url: 'http://dawa.aws.dk/adgangsadresser',
                                                params: angular.extend({
                                                    callback: 'JSON_CALLBACK'
                                                }, {
                                                    q: $rootScope.stateParams.aws
                                                })
                                            }).then(function (res) {
                                                if (res.data && res.data.length > 0) {
                                                    $scope.map.setView([res.data[0].adgangspunkt.koordinater[1], res.data[0].adgangspunkt.koordinater[0]], $rootScope.stateParams.z || $rootScope.baselayer.selectZoom || Infinity);
                                                }
                                            });
                                        } else {
                                            $scope.map.fitBounds(layer.bounds);
                                        }
                                        createOverlays();
                                    });
                                }
                            }

                        });
                    }]
            };
        }]);
}(this.angular, this.L, this.console));
