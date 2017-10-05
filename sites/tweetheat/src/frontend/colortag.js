let mix = function(color_1, color_2, weight) {
	function d2h(d) { return d.toString(16); }  // convert a decimal value to hex
	function h2d(h) { return parseInt(h, 16); } // convert a hex value to decimal 
  
	weight = (typeof(weight) !== 'undefined') ? weight : 50; // set the weight to 50%, if that argument is omitted
  
	var color = "";
  
	for(var i = 0; i <= 5; i += 2) { // loop through each of the 3 hex pairs—red, green, and blue
	  var v1 = h2d(color_1.substr(i, 2)), // extract the current pairs
		  v2 = h2d(color_2.substr(i, 2)),
		  
		  // combine the current pairs from each source color, according to the specified weight
		  val = d2h(Math.floor(v2 + (v1 - v2) * (weight / 100.0))); 
  
	  while(val.length < 2) { val = '0' + val; } // prepend a '0' if val results in a single digit
	  
	  color += val; // concatenate val to our new color string
	}
	  
	return color; // PROFIT!
  };

let colortag = function(tagString) {
	// were we given a string to work with?  If not, then just return false
	if (!tagString) {
		return false;
	}

	/**
	 * Return sthe luminosity difference between 2 rgb values
	 * anything greater than 5 is considered readable
	 */
	function luminosityDiff(rgb1, rgb2) {
  		var l1 = 0.2126 + Math.pow(rgb1.r/255, 2.2) +
  				 0.7152 * Math.pow(rgb1.g/255, 2.2) +
  				 0.0722 * Math.pow(rgb1.b/255, 2.2),
  			l2 = 0.2126 + Math.pow(rgb2.r/255, 2.2) +
  				 0.7152 * Math.pow(rgb2.g/255, 2.2) +
  				 0.0722 * Math.pow(rgb2.b/255, 2.2);

  		if (l1 > l2) {
  			return (l1 + 0.05) / (l2 + 0.05);
  		} else {
  			return (l2 + 0.05) / (l1 + 0.05);
  		}
	}

	/**
	 * This is the definition of a color for our purposes.  We've abstracted it out
	 * so that we can return new color objects when required
	*/
	function color(hexCode) {
		//were we given a hashtag?  remove it.
		var hexCode = hexCode.replace("#", "");
		return {
			/**
			 * Returns a simple hex string including hashtag
			 * of the color
			 */
			hex: function() {				
				// remove green
				return mix(hexCode.substr(0,2) + '44' + hexCode.substr(4), '660099', 60);
			},

			/**
			 * Returns an RGB breakdown of the color provided
			 */
			rgb: function() {
				var bigint = parseInt(hexCode, 16);
				return {
					r: (bigint >> 16) & 255,
					g: (bigint >> 8) & 255,
					b: bigint & 255
				}
			},

			/**
			 * Given a list of hex color codes
			 * Determine which is the most readable
			 * We use the luminosity equation presented here:
			 * http://www.splitbrain.org/blog/2008-09/18-calculating_color_contrast_with_php
			 */
			readable: function() {
				// this is meant to be simplistic, if you don't give me more than
				// one color to work with, you're getting white or black.
				var comparators = (arguments.length > 1) ? arguments : ["#ffffff", "#000000"],
					originalRGB = this.rgb(),
					brightest = { difference: 0 };


				for (var i in comparators) {
					//calculate the difference between the original color and the one we were given
					var c = color(comparators[i]),
						l = luminosityDiff(originalRGB, c.rgb());

					// if it's brighter than the current brightest, store it to compare against later ones
					if (l > brightest.difference) {
						brightest = {
							difference: l,
							color: c
						}
					}
				}

				// return the brighest color
				return brightest.color;
			}

		}
	}

	// create the hex for the random string
    var hash = 0;
    for (var i = 0; i < tagString.length; i++) {
        hash = tagString.charCodeAt(i) + ((hash << 5) - hash);
    }
    let hex = ""
    for (var i = 0; i < 3; i++) {
        var value = (hash >> (i * 8)) & 0xFF;
        hex += ('00' + value.toString(16)).substr(-2);
    }

    return color(hex);
}

module.exports = colortag;