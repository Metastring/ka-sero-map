// common.js

// CONSTANTS
const APIpath = 'https://server2.nikhilvj.co.in/airdata_api/API';
const STARTLOCATION = [14.5410, 75.9155]; //Pune
const STARTZOOM = 6;
const STARTLOCATIONjson = {lat: STARTLOCATION[0], lng: STARTLOCATION[1]};
const BOUNDS = [[10.3582,71.3672], [20.3652,80.0024]];
const MINZOOM = 6;
const MAXZOOM = 20;
const MAXBOUNDSVISCOSITY = 0.9;

const datacolumns = ["% prevalence of COVID-19", "Samples", "% IgG against SARS-CoV2", "% active infection", "CIR", "IFR"];

const quinColors = ["#d9f0a3","#addd8e","#78c679","#31a354","#006837"]
// from https://colorbrewer2.org/#type=sequential&scheme=YlGn&n=6

// map crosshair size etc:
const crosshairPath = 'lib/focus-black.svg';
const crosshairSize = 30;

var globalChartReadyFlag = false;

// hiding and showing elements, including their screen real estate. from https://stackoverflow.com/a/51113691/4355695
function hide(el) {
    el.style.visibility = 'hidden';	
  return el;
}

function show(el) {
  el.style.visibility = 'visible';	
  return el;
}

function checklatlng(lat,lon) {
	if ( typeof lat == 'number' && 
		typeof lon == 'number' &&
		!isNaN(lat) &&
		!isNaN(lon) ) {
		//console.log(lat,lon,'is valid');
		return true;
	}
	else {
		//console.log(lat,lon,'is not valid');
		return false;
	}
}


function getTodayDate(offset = 0) {
	var d = new Date();
	d.setDate(d.getDate() + offset);
	let thisMonth = String(d.getMonth() + 1); // getMonth returns Jan=0, Feb=1 etc
	var date1 = `${d.getFullYear()}-${("0" + thisMonth).slice(-2)}-${("0" + d.getDate()).slice(-2)}`;
	return date1;
}

