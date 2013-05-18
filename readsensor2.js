var firmata = require('/usr/local/lib/node_modules/firmata');
var board = new firmata.Board('/dev/ttyUSB0', arduinoReady);
var path = require('path');
var fs = require('fs');
var socketio = require('/usr/local/lib/node_modules/socket.io');
var http = require('http');


fs.appendFile('log.txt', '#Server Restarted! ' + Date.now() + '\n', function (err) {
	if (err) throw err;
});


var tstat = 75;
var temp = tstat + 1;
var ledPin = 13;
var lampPin = 2;
var autotemp = 1;
var analogs = 0;
var uptime = 0;
var loop = 0;
var newtemp = tstat;
var updatetemp = newtemp;

function arduinoReady(err) {
	if (err) {
	console.log(err);
	return;
	}
	console.log('Firmware: ' + board.firmware.name
		+ '-' + board.firmware.version.major
		+ '.' + board.firmware.version.minor);

	varledOn = true;
	board.pinMode(ledPin, board.MODES.OUTPUT);
	board.pinMode(lampPin, board.MODES.OUTPUT);
	setInterval(updateServer,1000);
	
};



function updateServer()
{
	board.analogRead(0, function(val){temp=((val*500/1023-50)*9/5)+32;});
	fs.appendFile('log.txt', uptime + ', ' + temp + '\n', function (err) {
		if (err) throw err;
	});
	if (autotemp == 1) {
		if (loop < 3) {
			newtemp = newtemp + temp;
			loop++;
		}
		else {
			newtemp = newtemp/4;
			updatetemp = Math.round(newtemp*100)/100;
			loop = 0;
			
			if (newtemp <= tstat)
			{
				console.log(newtemp + " < " + tstat);
				board.digitalWrite(lampPin, board.HIGH);
				
			}
			if (newtemp > tstat + 1)
			{
				board.digitalWrite(lampPin, board.LOW);
				//socket.send("heat off");
			}
			newtemp = temp;
		}
	}
	else {
		updatetemp = Math.round(temp*100)/100;
	}
	uptime = uptime + 1;
}

/*var server = http.createServer(function(req, res) {
	res.writeHead(200, { 'Content-type': 'text/html'});
	res.end(fs.readFileSync(__dirname + '/index.html'));
}).listen(8080, function() {
	console.log('Listening at: http://localhost:8080');
});*/

var server = http.createServer(function (request, response) {
 
    console.log('request starting...');
     
    var filePath = '.' + request.url;
    if (filePath == './')
        filePath = './index.html';
         
    var extname = path.extname(filePath);
    var contentType = 'text/html';
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.gif':
			contentType = 'image/gif';
			break;
    }
     
    path.exists(filePath, function(exists) {
     
        if (exists) {
            fs.readFile(filePath, function(error, content) {
                if (error) {
                    response.writeHead(500);
                    response.end();
                }
                else {
                    response.writeHead(200, { 'Content-Type': contentType });
                    response.end(content, 'utf-8');
                }
            });
        }
        else {
            response.writeHead(404);
            response.end();
        }
    });
     
}).listen(8080);

socketio.listen(server).on('connection', function (socket) {
	console.log('Client Connected...');
	socket.emit('tstat', tstat);
	setInterval(function(){socket.emit('lamp_auto',autotemp);},4000);
	setInterval(function(){socket.emit('newtemp',updatetemp);},4000);
	socket.on('message', function (msg) {
	console.log('Message Received: ', msg);

	if (msg == 'Turn On') {
		board.digitalWrite(ledPin, board.HIGH);
		socket.send("+");
	}
	if (msg == 'Turn Off') {
		board.digitalWrite(ledPin, board.LOW);
		socket.send("-");
	}
	/*if(msg=="analogRead")
	{
		board.analogRead(0, function(val){analogs=val;});
		board.analogRead(1, function(val){analogs.A1=val;});
		board.analogRead(2, function(val){analogs.A2=val;});
		board.analogRead(3, function(val){analogs.A3=val;});
		board.analogRead(4, function(val){analogs.A4=val;});
		board.analogRead(5, function(val){analogs.A5=val;});
		socket.emit('analogRead', analogs);
	}*/
	if(msg== 'Lamp On') {
		board.digitalWrite(lampPin, board.HIGH);
	}
	if(msg== 'Lamp Off') {
		board.digitalWrite(lampPin, board.LOW);
	}
	if(msg== 'tempup') {
		if(tstat < 85) {
			tstat = tstat + 1;
		}
		socket.emit('tstat', tstat);
	}
	if(msg== 'tempdown') {
		if(tstat > 65) {
			tstat = tstat - 1;
		}
		socket.emit('tstat', tstat);
	}
	if(msg== 'On') {
		autotemp = 1;
	}
	if(msg== 'Off') {
		autotemp = 0;
		board.digitalWrite(lampPin, board.Low);
	}
	});
});
