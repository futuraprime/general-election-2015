var width = 600;
var height = 600;

function getTransformString(x, y, css) {
  return 'translate('+(x || 0)+(css ? 'px' : '')+','+(y || 0)+(css ? 'px' : '')+')';
}

var chart = d3.select('#interactive').append('svg')
  .attr('id', 'chart')
  .attr('width', 600)
  .attr('height', 600);

// lab, con, ld, ukip, green, snp, plaid, other
var parties = {
  lab : {
    key : 'lab',
    name : 'Labour',
    shortName : 'Labour',
    color : '#DA1500'
  },
  con : {
    key : 'con',
    name : 'Conservatives',
    shortName : 'Tories',
    color : '#0096DB'
  },
  ld : {
    key : 'ld',
    name : 'Liberal Democrats',
    shortName : 'Lib Dems',
    color : '#FFB602'
  },
  ukip : {
    key : 'ukip',
    name : 'UK Independence Party',
    shortName : 'UKIP',
    color : '#722889'
  },
  green : {
    key : 'green',
    name : 'Greens',
    shortName : 'Greens',
    color : '#78B82A'
  },
  snp : {
    key : 'snp',
    name : 'Scottish National Party',
    shortName : 'SNP',
    color : '#FFF95D'
  },
  plaid : {
    key : 'plaid',
    name : 'Plaid Cymru',
    shortName : 'Plaid',
    color : '#3F8428'
  },
  others : {
    key : 'others',
    name : 'Other Parties',
    shortName : 'Other',
    color : '#8A8585'
  }
};

// data currently is made up (based on polls/projections 2015-04-13)
var results = [
  {
    key : 'lab',
    seats : 269,
    share : 0.33
  },
  {
    key : 'green',
    seats : 1,
    share : 0.07
  },
  {
    key : 'snp',
    seats : 54,
    share : 0.02
  },
  {
    key : 'ld',
    seats : 29,
    share : 0.08
  },
  {
    key : 'plaid',
    seats : 3,
    share : 0.01
  },
  {
    key : 'others',
    seats : 18,
    share : 0.03
  },
  {
    key : 'ukip',
    seats : 4,
    share : 0.07
  },
  {
    key : 'con',
    seats : 272,
    share : 0.39
  }
];

var arcLayout = d3.layout.pie()
  .sort(null)
  .startAngle(Math.PI * 2)
  .endAngle(0)
  .value(function(d) { return d.share; });

var arc = d3.svg.arc()
  .innerRadius(220)
  .outerRadius(260);

var arcContainer = chart.append('g')
  .attr('transform', getTransformString(width/2, height/2));

var arcJoin = arcContainer.selectAll('.seat-arc')
  .data(arcLayout(results));
arcJoin.enter().append('svg:path')
  .classed('seat-arc', true)
  .attr('fill', function(d) {
    return parties[d.data.key].color;
  });
arcJoin
  .attr('d', arc);

// now we gotta lay out the seats, this should be fun...

// first, we're gonna create an array of all the seats
// in a real election, we might actually have this, with more data
// too, like vote yields or whatever
var seatArray = [];
_.each(results, function(d) {
  for(var i=0;i<d.seats;++i) {
    seatArray.push({ key : d.key });
  }
});
// and now we're gonna stack 'em
var nester = d3.nest()
  .key(function(d) { return d.key; });

var nestedSeatArray = nester.entries(seatArray);

// I think the approach here is to come up with a sort of polar grid-ish
// thing and then assign them each places based on the index in the list
// so we have a width per theta and we base things around that. maybe?
