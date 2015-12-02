
var port = 19333;
var http = require("http"),
	url = require("url"),
	fs = require("fs"),
	Blink1 = require('node-blink1'),
	Leds = require('./servercomponents/leds.js'),
	Patterns = require('./servercomponents/patterns.js'),
	Control = require('./servercomponents/control.js'),
	Gamma = require('./servercomponents/gamma.js');

var _blink = new Blink1();
var blink = function(serial){
	return _blink;
}

var leds = new Leds(blink);
var patterns = new Patterns(blink);
var control = new Control(blink);
var gamma = new Gamma(blink);

var hexconvert = function(num){
	var res = num.toString(16);
	if( num <= 0xf )
		return "0"+res;
	return res;
};

var parseRequest = function(request, callback){
	var queryData = "";
	request.on('data', function(data) {
		queryData += data;
		if(queryData.length > 1e4) {
			queryData = "";
			response.writeHead(413, {'Content-Type': 'text/plain'}).end();
			request.connection.destroy();
		}
	});
	request.on('end', function() {
		if( queryData === "" )
			callback( queryData );
		else
			callback( JSON.parse( queryData ) );
	});
};

var splitVerb = function(request,response,controller) {
	if( request.method === 'GET' ) {
		controller.get(response);
	}
	else if( request.method === 'POST' ) {
		parseRequest( request, function(data){
			controller.post(data,response);
		});
	}
};

var controlAction = function( request, response, action ) {
	if( request.method === 'POST' ) {
		parseRequest( request, function(p){
			control[action](p,response);
		});
	}
};

/*
* GET /api/status
* 
* returns { playing: [0/1], start:[0-31], end:[0-31], count: 0, position: 0-31 }
*/
var getStatus = function(req,response){
	blink().readPlayState(function(s){
	response.writeHead(200);
		response.write( JSON.stringify( {
			playing: s.playing,
			start: s.playstart,
			end: s.playend,
			count: s.playcount,
			position: s.playpos
		} ) );
		response.end();
	});
};

/*
* GET /api/version
* 
* returns {version:"versionstring"}
*/
var getVersion = function(req,response){
	blink().version(function(v){
		response.writeHead(200);
		response.write( JSON.stringify( {version:v} ) );
		response.end();
	});
};

// missing api calls:
// serverdown
// persist to flash
// setcolor w/o fade
var apiCallMap = {
	"/api/leds": function(req,resp){ splitVerb(req,resp,leds); }, 
	"/api/gamma": function(req,resp){ splitVerb(req,resp,gamma); },
	"/api/status": getStatus,
	"/api/version": getVersion,
	"/api/patterns": function(req,resp){ splitVerb(req,resp,patterns); },
	"/api/control/togl": function(req,resp) { controlAction( req,resp,"togl"); },
	"/api/control/slowtogl": function(req,resp) { controlAction( req,resp,"slowTogl"); },
	"/api/control/play": function(req,resp) { controlAction( req,resp,"play"); },
	"/api/control/pause": function(req,resp) { controlAction( req,resp,"pause"); },
};

var requesthandler = function( request, response ) {

	var pathname = url.parse( request.url ).pathname;
	
	if( pathname === '/' || pathname === '' )
		pathname = '/index.html';
	
	var approvedFiles = [
		'/raphael.js',
		'/knockout.js',
		'/colorpicker.js',
		'/api.js',
		'/index.html',
		'/patterns.html',
		'/presets.js',
		'/patterns.js'
	];
	
	if( pathname.length >= 5 && pathname.substr(0,5) === "/api/" )
	{
		if( typeof (apiCallMap[pathname]) === 'function' )
		{
			try
			{
				apiCallMap[pathname](request,response);
			}
			catch(e)
			{
				response.writeHead(500, {"Content-Type": "text/plain"});
				response.write( e.toString() );
				response.end();
			}
		}
		else
		{
			response.writeHead(404, {"Content-Type": "text/plain"});
			response.write("no endpoint available for path " + pathname );
			response.end();
		}
	}
	else if( approvedFiles.filter( function(f){ return f === pathname } ).length > 0 ) {

		fs.readFile(__dirname+'/web'+pathname, "binary", function(err, file) {
			if(err) {        
				console.log("500: "+pathname);
				response.writeHead(500, {"Content-Type": "text/plain"});
				response.write(err + "\n");
				response.end();
				return;
			}
			console.log("200: "+pathname);
			response.writeHead(200);
			response.write(file, "binary");
			response.end();
		});		
	}
	else
	{
		response.writeHead(404)
		response.end();
	}
};

http.createServer( requesthandler ).listen(parseInt(port, 10));

console.log("Static file server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");
