var exec = require( 'child_process' ).exec;
var http = require( 'http' );
var url = require( 'url' );
var os = require( 'os' );
var process = require( 'process' );
var mysql = require( 'mysql' );

var db = mysql.createPool({
	connectionLimit: 4,
	host	: 'eu-cdbr-azure-west-d.cloudapp.net',
	user	: 'b4f65ef9810291',
	password: 'da5872fc',
	database: 'bam_perf'
});

var eth0 = os.networkInterfaces().eth0;
var myAddress;
Object.keys( eth0 ).forEach( function ( indx ){
        if ( eth0[ indx ].family != 'IPv4' ) return;

        myAddress = eth0[ indx].address;
});
var lastOct = myAddress.split( '.' )[3];

var iperfBase = '/usr/bin/iperf3 -J -P 10 -c ';

var testCases = {
	"0-directcheck": iperfBase + '10.3.1.'+lastOct,
	"1-fw": iperfBase + '10.5.1.'+lastOct,
	"10-udp-null-nohash": iperfBase + '10.5.10.'+lastOct,
	"11-udp-aes-nohash": iperfBase + '10.5.11.'+lastOct,
	"12-udp-aes-sha1": iperfBase + '10.5.12.'+lastOct,
	"13-udp-aes256-gcm": iperfBase + '10.5.13.'+lastOct,
	"14-tcp-aes-sha1": iperfBase + '10.5.14.'+lastOct
}

var lastSpeed = 0;
//db.connect();

var server = http.createServer( function( req, res ){
	reqUrl = url.parse( req.url, true );

	var iperfCmd = testCases[ reqUrl.query.testcase ];

	if ( reqUrl.query.time ) {
		iperfCmd = iperfCmd+ ' -t '+reqUrl.query.time+ ' -i '+reqUrl.query.time;
	} else {
		iperfCmd = iperfCmd+ ' -t 2';
	}

	if ( lastSpeed > 0 &&  reqUrl.query.testcase.includes( 'UDP' )) {
		iperfCmd = iperfCmd+' -b '+lastSpeed+'M';
	}

	var myBps = 0;
	var sqlInsert = '';

	//console.log( iperfCmd );
	process.stdout.write( reqUrl.query.testcase+',' );
	exec( iperfCmd, function ( error, stdout, stderr ) {
		try {
		iperfRes = JSON.parse( stdout );
		if ( reqUrl.query.testcase.includes( 'UDP' )) {
			myBps = iperfRes.end.sum.bits_per_second;
			console.log( Math.round( myBps / (1024*1024)) + ' Mbps, jitter:' + iperfRes.end.sum.jitter_ms+ ' ms, lost: '+ iperfRes.end.sum.lost_percent+'%' );
		} else {
			myBps = iperfRes.end.sum_received.bits_per_second;
			lastSpeed = Math.round( myBps / (1024*1024));
			console.log( Math.round( myBps / (1024*1024)) + ' Mbps' );
		}
		} catch( err ) {
                                console.log( 'NO DATA FOUND!' );
                                console.log( iperfCmd );
                                console.log( iperfRes.end );
                                console.log( stdout );
																res.writeHead( 404 );
																res.end( "ERROR: test \""+reqUrl.query.testcase+"\" not found" )
		}

		sqlInsert = "INSERT INTO perf (testset, testhost, testcase, throughput, dutsize) VALUES ( \
'" +reqUrl.query.testset+ "', \
'" +lastOct+ "', \
'" +reqUrl.query.testcase+ "', \
'" +myBps+ "', \
'" +reqUrl.query.dutsize+ "' \
)";
		//console.log( sqlInsert );
		/*
		// replacing with mysql pool
		db.connect( function( err ) {
			if ( err ) {
				console.log( 'error connecting: '+err );
			}
		});
		db.query( sqlInsert, function(err,rows,fields){
			if (err ) {
				console.log( err );
			}
		});
		db.end( function( err ) {
			console.log('error closing: '+err );
		});
		*/

		db.getConnection( function(err,connection) {
			connection.query( sqlInsert, function(err,rows,fields){
				if (err ) {
					console.log( err );
				} else {
					connection.release();
				}
			)
		})
	});



	res.writeHead(200);
	res.end( 'Yo!' );
});

server.listen( 8000 );
