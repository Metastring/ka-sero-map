// ######################################
/* GLOBAL VARIABLES */

var globalGeo = {};
var globalQuintiles = [];

var districtsLayer = new L.geoJson(null);
// var wardsLayer = new L.geoJson(null);
// var centresLayer = new L.geoJson(null);
// var iudxLayer = new L.geoJson(null);
// var safarLayer = new L.geoJson(null);

// #################################
// TABULATOR

var tabulator1 = new Tabulator("#tabulator1", {
    height: 400,
    selectable: 1,
    clipboard: "copy",
    clipboardCopySelector: "active",
    tooltipsHeader: true, //enable header tooltips
    index: "district",
    layout:"fitColumns",
    columns: [
        { title: "District", field: "district", headerFilter: "input" },
        { title: "Samples", field: "Samples", headerFilter: "input" },
        { title: "% IgG against SARS-CoV2", field: "% IgG against SARS-CoV2", headerFilter: "input" },
        { title: "% prevalence of COVID-19", field: "% prevalence of COVID-19", headerFilter: "input" },
        { title: "Case to Infection Ratio", field: "CIR", headerFilter: "input" },
        { title: "Infection Fatality Ratio", field: "IFR", headerFilter: "input" }
    ],
    rowSelected: function (row) {
        var data = row.getData();
        populateInfo(data);
        map.flyTo([data.lat, data.lon], 9, {duration: 0.2});

  },
});

// #################################
/* MAP */

var cartoPositron = L.tileLayer.provider('CartoDB.Positron');
var OSM = L.tileLayer.provider('OpenStreetMap.Mapnik');
var esriWorld = L.tileLayer.provider('Esri.WorldImagery');
// var gStreets = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3']});
// var gHybrid = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',{maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3']});

var baseLayers = { "OpenStreetMap.org" : OSM, "Carto Positron": cartoPositron, "ESRI Satellite": esriWorld, 
    /*"Streets": gStreets, "Hybrid": gHybrid */ };

var map = new L.Map('map', {
    center: STARTLOCATION,
    zoom: STARTZOOM,
    layers: [cartoPositron],
    scrollWheelZoom: true,
    maxZoom: MAXZOOM,
    minZoom: MINZOOM,
    maxBounds: BOUNDS,
    maxBoundsViscosity: MAXBOUNDSVISCOSITY
});
$('.leaflet-container').css('cursor','crosshair'); // from https://stackoverflow.com/a/28724847/4355695 Changing mouse cursor to crosshairs
L.control.scale({metric:true, imperial:false}).addTo(map);

// SVG renderer
var myRenderer = L.canvas({ padding: 0.5 });

var overlays = {
    "districts": districtsLayer
};
var layerControl = L.control.layers(baseLayers, overlays, {collapsed: true, autoZIndex:false, position:'topright'}).addTo(map); 

// https://github.com/Leaflet/Leaflet.fullscreen
map.addControl(new L.Control.Fullscreen({position:'topright'}));

L.control.custom({
    position: 'bottomleft',
    content: `Metric: <br><select id="metric"></select>
    <br>Legend:
    <div class="legend" id="legendContent"></div>`,
    classes: 'divOnMap_left'
}).addTo(map);

// L.control.custom({
//     position: 'bottomleft',
//     content: `Choose a metric:
//     <div id="leftInfo"></div>`,
//     classes: 'divOnMap_left'
// }).addTo(map);

districtsLayer.addTo(map);


// ############################################
// RUN ON PAGE LOAD
$(document).ready(function () {
    populateDropdown();
    
    // load up the geojson
    $.ajax({
        url : `data/karnataka_districts_loaded.geojson`,
        type : 'GET',
        cache: false,
        // contentType: false,  // tell jQuery not to set contentType
        dataType : 'html',
        success : function(returndata) {
            globalGeo = JSON.parse(returndata);
            // processData(returnJ);
            calcQuintiles();
            loadMap(0);
            loadTable();
            makeChart(0);

        },
        error: function(jqXHR, exception) {
            console.log('error:',jqXHR.responseText);
            alert(jqXHR.responseText);
            // var data = JSON.parse(jqXHR.responseText);
            // $('#createUserStatus').html(data['message']);
        }
    });

});

// ############################################
// FUNCTIONS


function populateDropdown() {
    var content = '';
    var sel = '';
    for(let i=0; i<datacolumns.length; i++) {
        sel = '';
        if(i==0) sel = `selected="selected"`;
        content += `<option value="${i}" ${sel}>${datacolumns[i]}</option>`;
    }
    $('#metric').html(content);
    $('#metric').change(function () { 
        loadMap($(this).val());
        makeChart($(this).val());
    });

}




function loadMap(i) {
    console.log(datacolumns[i]);
    districtsLayer.clearLayers();

    function district_style(feature) {
        let val = feature.properties[datacolumns[i]];
        if(datacolumns[i] == 'CIR') {
            val = val.split(':')[1]; 
        }
        let color = getColor(i,val);
        return {
            weight: 1,
            opacity: 1,
            color: 'black',
            // dashArray: '3',
            fillOpacity: 0.6,
            fillColor: color
        };
    }

    function district_onEachFeature(feature, layer) {
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: activateDistrict
        });
        layer.bindTooltip(`${feature.properties.district}: ${feature.properties[datacolumns[i]]}`);
    }

    function highlightFeature(e) {
        var layer = e.target;
        layer.setStyle({
            weight: 3,
            color: '#666',
            // dashArray: '',
            fillOpacity: 0.2
        });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
    }

    function resetHighlight(e) {
        // wardsLayer.resetStyle(e.target);
        // e.resetStyle();
        var layer = e.target;
        layer.setStyle({
            weight: 1,
            color: 'black',
            // dashArray: '',
            fillOpacity: 0.6
        });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
    }
    function activateDistrict(e) {
        map.fitBounds(e.target.getBounds());
        populateInfo(e.target.feature.properties);
        tabulator1.deselectRow();
        tabulator1.selectRow(e.target.feature.properties.district); 
        // this does not trigger rowSelected handler in tabulator
    }

    var shapes = new L.geoJson(globalGeo, {
        style: district_style,
        onEachFeature: district_onEachFeature
    }).addTo(districtsLayer);

    populateLegend(i);
}

function populateInfo(p) {
    var content = `<div class="row">
    <div class="col-md-3">
        District<br><span class="info_district">${p.district}</span>
    </div>
    <div class="col-md-3">
        Samples<br><span class="info_value">${p['Samples']}</span>
    </div>
    <div class="col-md-3">
        % IgG against SARS-CoV2<br><span class="info_value">${p['% IgG against SARS-CoV2']}</span>
    </div>
    <div class="col-md-3">
        % active infection<br><span class="info_value">${p['% active infection']}</span>
    </div>
    </div>

    <div class="row">
    <div class="col-md-3">
        % prevalence of COVID-19<br><span class="info_value">${p['% prevalence of COVID-19']}</span>
    </div>
    <div class="col-md-3">
        CIR<br><span class="info_value">${p['CIR']}</span>
    </div>
    <div class="col-md-3">
        IFR<br><span class="info_value">${p['IFR']}</span>
    </div>
    <div class="col-md-3">
        IFR-CIR quadrant<br><span class="info_value">${p['IFR-CIR quadrant'] || "N/A"}</span>
    </div>
    </div>`;
    
    $('#districtInfo').html(content);
}


function loadTable() {
    // globalGeo
    var collector = [];
    globalGeo.features.forEach(r => {
        collector.push(r.properties);
    });
    tabulator1.setData(collector);
}

// #############
// legend, quintile etc

function calcQuintiles() {
    // globalGeo
    var values, len, per20, per40, per60, per80, val ;
    for(metric in datacolumns) {
        console.log(datacolumns[metric]);
        values = [];
        
        for(i in globalGeo.features) {
            val = globalGeo.features[i].properties[datacolumns[metric]];
            if (datacolumns[metric] == 'CIR') {
                let x = val.split(':');
                values.push(parseFloat(x[1]));
            }
            else {
                values.push(parseFloat(val));

            }
        }

        // Quintile buckets calculation. From https://stackoverflow.com/a/31572826/4355695
        values.sort(function(a, b){return a-b});
        // console.log(values);
        len =  values.length;
        per20 = Math.floor(len*.2) - 1;
        per40 = Math.floor(len*.4) - 1;
        per60 = Math.floor(len*.6) - 1;
        per80 = Math.floor(len*.8) - 1;

        globalQuintiles[metric] = [ values[0], values[per20], values[per40],
            values[per60], values[per80], values[len-1] ];
        console.log(globalQuintiles[metric]);
    }
}


// get color depending on value
function getColor(i, val, legend=false) {
    let color = val > globalQuintiles[i][4] ? quinColors[4] :
        val > globalQuintiles[i][3] ? quinColors[3] :
        val > globalQuintiles[i][2] ? quinColors[2] :
        val > globalQuintiles[i][1] ? quinColors[1] :
        quinColors[0];
    if (legend) console.log(`Color for ${val}: ${color}`);
    return color;

}

function populateLegend(i) {
    console.log(`Populating legend for ${datacolumns[i]}`)
    var legendContent = '';
    var labels = [], from, to;
    for (var x = 0; x < globalQuintiles[i].length-1; x++) {
        from = globalQuintiles[i][x];
        to = globalQuintiles[i][x + 1];
        labels.push(`<i style="background: ${getColor(i,to, legend=true)}"></i>${from} &ndash; ${to}`);
    }
    $('#legendContent').html(labels.join('<br>'));
}

