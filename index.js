/*global require, console, __dirname*/

var http = require('http'),
    express = require('express'),
    request = require('request'),
    geojsonvt = require('geojson-vt'),
    cover = require('tile-cover'),
    inspect = require('util').inspect,
    fs = require('fs'),
    path = require('path');

/*fs.readFile('./skove.geojson', 'utf8', function (err, data) {
    if (err) {
        console.log('Error: ' + err);
        return;
    }

    data = JSON.parse(data);
    for (var i = 0; i < data.features.length; i++) {
        var geom = data.features[i].geometry;
        var limits = {
            min_zoom: 0,
            max_zoom: 22
        }

        var result = cover.geojson(geom, limits);

        result = cover.tiles(geom, limits);
        console.log(inspect(result, {
            depth: null,
            colors: true
        }));
        result = cover.indexes(geom, limits);

    }
});
*/
/*console.log(inspect(result, {
            depth: null,
            colors: true
        }));*/
/*var tileIndex = geojsonvt(data, {
    baseZoom: 22,
    maxZoom: 22
});

var key;
for (key in tileIndex.tiles) {
    var tile = tileIndex.tiles[key];
    console.log(tile.z + '/' + tile.x + '/' + tile.y + '   ' + key + '   ' + tile.source);
}*/
var app = express();
app.all('/couchdb*', function (req, res) {
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Origin', 'http://localhost:8100');
    res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, HEAD, DELETE');
    res.set('Access-Control-Allow-Headers', 'accept, authorization, content-type, origin, referer');
    //var url = "http://localhost:5984/" + req.url.substring(9);
    var url = "http://geo.os2geo.dk/couchdb/" + req.url.substring(9);
    if (req.method === 'PUT') {
        req.pipe(request.put(url)).pipe(res);
    } else if (req.method === 'POST') {
        req.pipe(request.post(url)).pipe(res);
    } else if (req.method === 'GET') {
        req.pipe(request.get(url)).pipe(res);
    } else if (req.method === 'DELETE') {
        req.pipe(request.del(url)).pipe(res);
    } else if (req.method === 'OPTIONS') {
        res.end();
    }

});
app.use('/tilestache', function (req, res) {
    var url = "http://127.0.0.1:8080" + req.url;
    console.log(url);
    if (req.method === 'PUT') {
        req.pipe(request.put(url)).pipe(res);
    } else if (req.method === 'POST') {
        req.pipe(request.post(url)).pipe(res);
    } else if (req.method === 'GET') {
        req.pipe(request.get(url)).pipe(res);
    }
});
app.use(express.static(__dirname)); //  "public" off of current is root
app.get('/kfticket', function (req, res) {
    // Replace the VisStedet login information with your own login
    // Fetch a ticket from Kortforsyningen, using your organization's login
    http.get('http://kortforsyningen.kms.dk/service?request=GetTicket&login=runetvilum&password=rutv2327', function (response) {
        var str = '';
        response.on('data', function (chunk) {
            str += chunk;
        });
        response.on('end', function () {
            res.cookie('kfticket', str, {
                maxAge: 86400000
            });
            res.send(str);
        });
    }).on('error', function (e) {
        console.log("Got error: " + e.message);
    });
});
app.listen(5000);
console.log('Listening on port 5000');
