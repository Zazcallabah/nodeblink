
var port = 19333;
var http = require("http"),
    url = require("url"),
    fs = require("fs"),
	sys = require('sys'),
	Blink1 = require('node-blink1');

var blink = new Blink1();

var requesthandler = function( request, response ) {

	var pathname = url.parse( request.url ).pathname;

	if(pathname === "/api" && request.method == 'POST')
	{
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
			var instruction = JSON.parse( queryData );
			var ledn = instruction.ledn || 0;
			var time = instruction.time || 0;
			var hexcolor = instruction.color || "#000000";
			//check hexcolor valid data
			var r = parseInt(hexcolor.substr(1,2),16);
			var g = parseInt(hexcolor.substr(3,2),16);
			var b = parseInt(hexcolor.substr(5,2),16);
			
			blink.fadeToRGB( time, r, g, b, ledn );

			response.writeHead(200);
			response.write( "set led "+ledn+" to "+hexcolor+ " over "+time+"ms");
			response.end();
		});    
	}
	else if(pathname === "/api" && request.method == 'GET')
	{
		var hexconvert = function(num){
			var res = num.toString(16);
			if( num <= 0xf )
				return "0"+res;
			return res;
		};
		blink.readCurrentColor( 1, function(c1){
			blink.readCurrentColor( 2, function(c2){
				var l1 = "#" + 
					hexconvert(c1.r) + 
					hexconvert(c1.g) + 
					hexconvert(c1.b);
				var l2 = "#" + 
					hexconvert(c2.r) + 
					hexconvert(c2.g) + 
					hexconvert(c2.b);

				response.writeHead(200);
				response.write( JSON.stringify( {ledA:l1,ledB:l2} ) );
				response.end();
			});
		});
	}
	else if( pathname === "/index.html" || pathname === "/" || pathname === "" ) {
			fs.readFile("./index.html", "binary", function(err, file) {
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
	else if( pathname === "/colorpicker.js" || pathname === "/raphael.js" ) {
			fs.readFile("."+pathname, "binary", function(err, file) {
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
