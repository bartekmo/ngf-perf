var exec = require( 'child_process' ).exec;
var http = require( 'http' );
var url = require( 'url' );
var os = require( 'os' );
var process = require( 'process' );
var mysql = require( 'mysql' );

var db = mysql.createConnection({
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


var iperfBase = '/usr/bin/iperf3 -J -c ';

var testCases = {
	'Direct_TCP1': iperfBase + '10.3.1.'+lastOct + ' -P 1',
	'Direct_TCP100': iperfBase + '10.3.1.'+lastOct + ' -P 100',
	'Direct_UDP': iperfBase + '10.3.1.'+lastOct + ' -u -b 5G',
	'DirectRev_TCP1': iperfBase + '10.3.1.'+lastOct + ' -P 1 -R',
        'DirectRev_TCP100': iperfBase + '10.3.1.'+lastOct + ' -P 100 -R',
        'DirectRev_UDP': iperfBase + '10.3.1.'+lastOct + ' -u -b 5G -R',
	'FW_TCP1': iperfBase + '10.5.1.'+lastOct + ' -P 1',
	'FW_TCP100': iperfBase + '10.5.1.'+lastOct + ' -P 100',
	'FW_UDP': iperfBase + '10.5.1.'+lastOct + ' -u -b 5G',
	'FWRev_TCP1': iperfBase + '10.5.1.'+lastOct + ' -P 1 -R',
        'FWRev_TCP100': iperfBase + '10.5.1.'+lastOct + ' -P 100 -R',
        'FWRev_UDP': iperfBase + '10.5.1.'+lastOct + ' -u -b 5G -R',
	'VPN_TCP_AES128SHA_TCP1': iperfBase + '10.5.1.1'+lastOct +' -P 1',
	'VPN_TCP_AES128SHA_TCP100': iperfBase + '10.5.1.1'+lastOct +' -P 100',
	'VPN_udp_AES128SHA_TCP1': iperfBase + '10.5.1.2'+lastOct +' -P 1',
	'VPN_udp_AES128SHA_TCP100': iperfBase + '10.5.1.2'+lastOct +' -P 100',
	'VPN_hybrid_AES256GCM_TCP1': iperfBase + '10.5.1.3'+lastOct +' -P 1',
        'VPN_hybrid_AES256GCM_TCP100': iperfBase + '10.5.1.3'+lastOct +' -P 100',
	'VPN_hybrid_AES128SHA256_TCP1': iperfBase + '10.5.1.6'+lastOct +' -P 1',
        'VPN_hybrid_AES128SHA256_TCP100': iperfBase + '10.5.1.6'+lastOct +' -P 100',
	'VPN_hybrid_AES128SHA512_TCP1': iperfBase + '10.5.1.7'+lastOct +' -P 1',
        'VPN_hybrid_AES128SHA512_TCP100': iperfBase + '10.5.1.7'+lastOct +' -P 100',
	'VPN_TCP_AES256GCM_TCP1': iperfBase + '10.5.1.1'+lastOct +' -P 1',
        'VPN_TCP_AES256GCM_TCP100': iperfBase + '10.5.1.1'+lastOct +' -P 100',
	'VPN_hybrid_AES128nohash_TCP1': iperfBase + '10.5.1.8'+lastOct +' -P 1',
        'VPN_hybrid_AES128nohash_TCP100': iperfBase + '10.5.1.8'+lastOct +' -P 100',
	'VPN_hybrid_NullNohash_TCP1': iperfBase + '10.5.1.9'+lastOct +' -P 1',
        'VPN_hybrid_NullNohash_TCP100': iperfBase + '10.5.1.9'+lastOct +' -P 100',
        'VPN_hybrid_AES128GCM_TCP1': iperfBase + '10.5.1.4'+lastOct +' -P 1',
        'VPN_hybrid_AES128GCM_TCP100': iperfBase + '10.5.1.4'+lastOct +' -P 100'
}

var lastSpeed = 0;
db.connect();

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
		}

		sqlInsert = "INSERT INTO perf (testset, testhost, testcase, throughput, dutsize) VALUES ( \
'" +reqUrl.query.testset+ "', \
'" +lastOct+ "', \
'" +reqUrl.query.testcase+ "', \
'" +myBps+ "', \
'" +reqUrl.query.dutsize+ "' \
)";
		//console.log( sqlInsert );
		/*db.connect( function( err ) {
			if ( err ) {
				console.log( 'error connecting: '+err );
			}
		});*/
		db.query( sqlInsert, function(err,rows,fields){
			if (err ) {
				console.log( err );
			}
		});
		/*db.end( function( err ) {
			console.log('error closing: '+err );
		});*/
	});
	
		

	res.writeHead(200);
	res.end( 'Yo!' );
});

server.listen( 8000 );

