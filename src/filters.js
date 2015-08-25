(function (window, angular, console) {
    'use strict';
    angular.module('rfs.filters', [])

    .filter('objectpath', function () {
        return function (input, doc) {
            var path = input.split('/');
            var item = doc;
            for (var m = 1; m < path.length; m++) {
                var key = path[m];
                if (item.hasOwnProperty(key)) {
                    item = item[key];
                }
            }
            return item;
        };
    })

    .filter('bytes', function () {
        return function (bytes, precision) {
            if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
            if (typeof precision === 'undefined') precision = 1;
            var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
                number = Math.floor(Math.log(bytes) / Math.log(1024));
            return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) + ' ' + units[number];
        };
    });
})(this, this.angular, this.console);