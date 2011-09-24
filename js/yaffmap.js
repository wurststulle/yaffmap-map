var map;
var selectControl;
var nodesLayer, linksLayer;
var f;
var url = "../../soap.php";
var node;
var debug;
var styleGreen;

function yaffmap(response, target, isDebug) {
  var zoom = 16;
  map = new OpenLayers.Map('yaffmap', 
                           { maxExtent: new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34),
                             numZoomLevels: 19,
                             maxResolution: 156543.0399,
                             units: 'm',
                             projection: new OpenLayers.Projection("EPSG:900913"),
                             displayProjection: new OpenLayers.Projection("EPSG:4326")
                           });

                           var osm = new OpenLayers.Layer.OSM();
                           nodesLayer = new OpenLayers.Layer.Vector("Nodes", {
                             styleMap: new OpenLayers.StyleMap({
                               strokeColor : '#33EE66',
                               strokeWidth : 1.0,
                               pointRadius: "5px",
                               fillColor: "#11CC44",
                               fillOpacity : 0.70
                             })
                           });
                           linksLayer = new OpenLayers.Layer.Vector('rpLinks',{
                             styleMap: new OpenLayers.StyleMap({
                               strokeColor : '${color}',
                               strokeWidth : '${width}',
                               strokeOpacity : 1,
                               fillColor : '${color}',
                               fillOpacity : 0.5
                             })
                           });

                           map.addLayers([osm, linksLayer, nodesLayer]);

                           selectControl = new OpenLayers.Control.SelectFeature([nodesLayer, linksLayer], { title: "Nodes + Links", select: onSelect });
                           map.addControl(selectControl);
                           selectControl.activate();
                           if (navigator.geolocation) {
                             navigator.geolocation.getCurrentPosition(function (position) {
                               lat = position.coords.latitude;
                               lon =  position.coords.longitude;
                               var lonLat = new OpenLayers.LonLat(lon, lat).transform(map.displayProjection,  map.projection);
                               map.setCenter(lonLat, zoom);
                             });
                           }else{
                        	   var lonLat = new OpenLayers.LonLat(13.483937263488770,52.562709808349609).transform(map.displayProjection,map.projection);
                        	   map.setCenter(lonLat, zoom);
                           }
                           
}


function onSelect(feature) {
  f = feature;
  if (feature.name == 'node') {
    var pl = new SOAPClientParameters();
    pl.add("id", feature.attributes.id);
    SOAPClient.invoke(url, "getFfNode", pl, true, cbNode); 
  } else {
    setPaneContent("Link Information", array2json(feature.attributes));
  }
}

function loadNodes() {
  var pl = new SOAPClientParameters();
  pl.add("ul", "0");
  pl.add("lr", "0");
  SOAPClient.invoke(url, "getFfNodes", pl, true, cbNodes);
}

function loadLinks() {
  var pl = new SOAPClientParameters();
  pl.add("ul", "0");
  pl.add("lr", "0");
  SOAPClient.invoke(url, "getRpLinks", pl, true, cbLinks);
}

var res, soap, ret, n;
function cbNode(r, soapResponse)
{
  res = r;
  soap = soapResponse;
  var data;
  if(soapResponse.xml)
    data = soapResponse.xml;
  else
    data = new XMLSerializer().serializeToString(soapResponse);

  var rv = soap.getElementsByTagName("returnValue")[0].childNodes;
  var content = "";
  ret = rv;
  for (var i = 0; i < rv.length; ++i)
  {
    node = rv[i];
    content += node.nodeName.split(":")[1] + ": " + node.textContent + "<br />";
  }



  setPaneContent(rv[7].textContent, content);
}

function cbNodes(r, soapResponse)
{
  res = r;
  soap = soapResponse;
  var data;
  if(soapResponse.xml)
    data = soapResponse.xml;
  else
    data = new XMLSerializer().serializeToString(soapResponse);
  var rv = soap.getElementsByTagName("returnValue")[0].childNodes;
  var content = "";
  node = rv;
  for(var i = 0; i < node.length; i++){
    var feature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(
      node[i].childNodes[2].textContent,
      node[i].childNodes[1].textContent).transform(new OpenLayers.Projection("EPSG:4326"),new OpenLayers.Projection("EPSG:900913")),
      { style: styleGreen });
      feature.attributes.id = node[i].childNodes[0].textContent
      feature.name = 'node';
      nodesLayer.addFeatures(feature);
  }



}
function cbLinks(r, soapResponse)
{
  res = r;
  soap = soapResponse;
  var data;
  if(soapResponse.xml)
    data = soapResponse.xml;
  else
    data = new XMLSerializer().serializeToString(soapResponse);
  var rv = soap.getElementsByTagName("returnValue")[0].childNodes;
  var content = "";
  link = rv;
  debug = link;
  for(var i = 0; i < link.length; i++) {
    aLineStringGeometry = new OpenLayers.Geometry.LineString([
                                                             new OpenLayers.Geometry.Point(
                                                               link[i].childNodes[7].textContent,
                                                               link[i].childNodes[6].textContent).transform(new OpenLayers.Projection("EPSG:4326"),new OpenLayers.Projection("EPSG:900913")), 
                                                               new OpenLayers.Geometry.Point(
                                                                 link[i].childNodes[10].textContent,
                                                                 link[i].childNodes[9].textContent).transform(new OpenLayers.Projection("EPSG:4326"),new OpenLayers.Projection("EPSG:900913")),
    ]);
    var feature = new OpenLayers.Feature.Vector(aLineStringGeometry, null);

    feature.attributes.cost = link[i].childNodes[0].textContent;
    if (parseFloat(feature.attributes.cost) > 1) 
      {
        feature.attributes.color = '#22ee22';
        feature.attributes.width = '2';
      }
      else
        {
          feature.attributes.color = '#ff1111';
          feature.attributes.width = '1';
        }
        feature.name = 'link';
        linksLayer.addFeatures(feature);
  }
}
// debug function to show a node attribues
function array2json(arr) {
  var parts = [];
  var is_list = (Object.prototype.toString.apply(arr) === '[object Array]');

  for(var key in arr) {
    var value = arr[key];
    if(typeof value == "object") { //Custom handling for arrays
      if(is_list) parts.push(array2json(value)); /* :RECURSION: */
      else parts[key] = array2json(value); /* :RECURSION: */
    } else {
      var str = "";
      if(!is_list) str = '"' + key + '":';

      //Custom handling for multiple data types
      if(typeof value == "number") str += value; //Numbers
      else if(value === false) str += 'false'; //The booleans
      else if(value === true) str += 'true';
      else str += '"' + value + '"'; //All other things
      // :TODO: Is there any more datatype we should be in the lookout for? (Functions?)

      parts.push(str);
    }
  }
  var json = parts.join(",");

  if(is_list) return '[' + json + ']';//Return numerical JSON
  return '{' + json + '}';//Return associative JSON
}

function onNodePopupClose() {
  nodesControl.unselect(selectedNode);
}

function onLinkPopupClose() {
  linksControl.unselect(selectedLink);
}
