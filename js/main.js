var width = 600;
var height = 600;

function getTransformString(x, y, css) {
  return 'translate('+(x || 0)+(css ? 'px' : '')+','+(y || 0)+(css ? 'px' : '')+')';
}

var chart = d3.select('#interactive').append('svg')
  .attr('id', 'chart')
  .attr('width', width)
  .attr('height', height);

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

var partyArcs = arcLayout(results);
var arcJoin = arcContainer.selectAll('.seat-arc')
  .data(partyArcs);
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
var seatGroup = chart.append('svg:g')
  .classed('seats-group', true);

var partyJoin = seatGroup.selectAll('.seats-party')
  .data(nestedSeatArray);

partyJoin.enter().append('svg:g')
  .classed('seats-party', true);

var seatSize = 10;
var seatSpace = 12;

function radToDeg(rad) { return 180 * rad / Math.PI; }

// the SeatManager is in charge of distributing the seats around the ring
function SeatManager(size, space, radii, arcGroups) {
  this.size = size;
  this.space = space;
  this.radii = radii;
  this.arcGroups = arcGroups;

  this.arcs = {};
  for(var i=0,l=arcGroups.length;i<l;i++) {
    this.arcs[arcGroups[i].data.key] = arcGroups[i];
  }

  this._generateSeats();
}
SeatManager.prototype._generateSeats = function() {
  var self = this;

  // this figures out where all the seats should go
  var ringSeats = _.map(this.radii, function(r) {
    var circ = Math.PI * 2 * r;
    // this ensures an even distribution of seats in each arc
    var seats = Math.floor(circ / self.space);
    var step = Math.PI * 2 / seats;
    var angles = _.range(0, Math.PI * 2, step);
    return _.map(angles, function(angle) {
      return {
        radius : r,
        angle : angle
      };
    });
  });

  // we want these from the smallest to the largest.
  // also, we're going to use this iteration to calculate some useful
  // values we'll want later on
  var orderedArcs = _.sortBy(this.arcs, function(arc) {
    arc.sweep = arc.startAngle - arc.endAngle;
    arc.centerAngle = arc.startAngle - arc.sweep / 2;
    arc.seats = [];
    return arc.sweep;
  });// .reverse();
  
  // now we allocate all the seats to the parties based on the angles
  // with a rule that each party gets at least one seat in every ring
  //
  // note: this is not an especially efficient approach and is likely
  // to cause performance issues down the road
  _.each(ringSeats, function(ring) {
    var toAllocate = _.clone(ring);
    _.each(orderedArcs, function(arc) {
      // we're going to order all the seats by their proximity to the
      // central angle of this party
      var orderedAllocated = _.sortBy(toAllocate, function(seat) {
        return Math.abs(arc.centerAngle - seat.angle);
      });
      // take the seat out of the toAllocate array and begin the seat
      // array for this party in this ring
      var seats = toAllocate.splice(toAllocate.indexOf(orderedAllocated[0]), 1);

      // now grab all the seats inside the arc. since we started from
      // the smallest party, this should still leave every party with
      // at least one seat in every ring

      // note: we're iterating backwards over the array to be sure we
      // don't change indexes as we remove items from the array
      for(var i=toAllocate.length - 1;i>=0;--i) {
        if(toAllocate[i].angle > arc.endAngle &&
          toAllocate[i].angle <= arc.startAngle) {
          seats = seats.concat(toAllocate.splice(i, 1));
        }
      }
      arc.seats = arc.seats.concat(_.sortBy(seats, 'angle'));
    });
  });
};
SeatManager.prototype.requestSeat = function(key, index) {
  return this.arcs[key].seats[index];
};

var seatManager = new SeatManager(10, 12, _.range(50, 390, 12), partyArcs);

partyJoin.each(function(d) {
  var el = d3.select(this);
  // move this to the center...
  el.attr('transform', getTransformString(width/2, height/2));

  var seatJoin = el.selectAll('.seat')
    .data(d.values);

  seatJoin.enter()
    .append('svg:rect')
    .classed('seat', true)
    .attr({
      x : -seatSize/2, y: -seatSize/2, width: seatSize, height : seatSize,
      fill : function(d) {
        return parties[d.key].color;
      }
    })
    .transition().duration(200).delay(function(d, i) {
      return i * 10;
    })
    .attr('transform', function(d, idx) {
      var seatData = seatManager.requestSeat(d.key, idx);
      var transformString = '';
      transformString += 'rotate('+(180 + radToDeg(seatData.angle))+')';
      transformString += 'translate(0,'+(seatData.radius)+')';
      return transformString;
    });
});

var innerRadius = 75;
