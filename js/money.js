// definitions of the months, days and days of the year
var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
var day_of_the_year = [];
for (var month of months) {
	for (var i=1; i<=31; i++) {
		if (month === "February" && i > 29) { continue; }
		else if (["September", "April", "June", "November"].indexOf(month) !== -1 && i > 30) { continue; }
		day_of_the_year.push(month + " " +i);
	}
}

// extend String to include a Title Case function
String.prototype.toTitleCase = function () {
	return this.replace(/\w\S*/g, function(txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
};

// extend dateFormats in Highcharts to include week number
Highcharts.dateFormats = {
	W: function (timestamp) {
		var date = new Date(timestamp),
			day = date.getUTCDay() === 0 ? 7 : date.getUTCDay(),
			dayNumber;
		date.setDate(date.getUTCDate() + 4 - day);
		dayNumber = Math.floor((date.getTime() - new Date(date.getUTCFullYear(), 0, 1, -6)) / 86400000);
		return 1 + Math.floor(dayNumber / 7);

	}
};

// a function that finds the longest sequences of rises and falls
function calculate_sequences() {
	// define functions used to pick parts in filters
	function choose_which(el) {
		return el[0] === whichone;
	}
	function which_longest(el) {
		return el[0] === whichone && el[2] === longest;
	}
	function greater_than(el) {
		return el > 0;
	}
	function less_than(el) {
		return el < 0;
	}
	function equal_to(el) {
		return el[2] === size[1];
	}
	function format_it(i) {
		return Highcharts.dateFormat("%d %B %Y", i[0]);
	}
	function direction(val) {
		if (val < 0) return "-$";
		return "$";
	}

	// map all the rises and falls into one array
	// data.rates is an array of arrays with each element being:
	// [date, value, difference to previous value, r or f]
	var risefall = data.rates.map(i => i[3]).join("");
	// find all the sequences where the same letter follows itself
	var sequences = letterCount(risefall);
	var parts, which;
	// for each of the rises and falls store the data
	for (which of ["rise", "fall"]) {
		var whichone = which.charAt(0);
		parts = sequences.filter(choose_which).map(i => i[2]);
		var longest = Math.max.apply(Math, parts);
		if (typeof data.summary[which] === "undefined") data.summary[which] = {};
		data.summary[which].longest = sequences.filter(which_longest);
	}

	// map all the rate values into one array and find all the rises and falls
	parts = data.rates.map(i => i[2]);
	var rises = parts.filter(greater_than);
	var falls = parts.filter(less_than);
	// store the largest rises and falls and some stats
	for (var size of [["rise", Math.max.apply(Math, parts)], ["fall", Math.min.apply(Math, parts)]]) {
		data.records[size[0]] = data.rates.filter(equal_to);
		var all = data.records[size[0]].map(format_it);
		data.records[size[0]] = {
			"change": data.records[size[0]][0][2],
			"direction": data.records[size[0]][0][3],
			"rate": data.records[size[0]][0][1],
			"when": human_join(all)};
		parts = rises;
		if (size[0] === "fall") parts = falls;
		data.records[size[0]].mean = parseFloat(ss.mean(parts)).toFixed(4);
		data.records[size[0]].stdev = parseFloat(ss.standardDeviation(parts)).toFixed(4);
		data.records[size[0]].mode = parseFloat(ss.mode(parts)).toFixed(4);
		data.records[size[0]].count = parts.length;
	}

	// build an output phrase
	var phrase = [];
	for (which of ["rise", "fall"]) {
		parts = "risen";
		if (which === "fall") parts = "fallen";
		phrase.push("The rate has " + parts + " " + data.records[which].count + " " + plural("time", data.records[which].count) + " (" + parseFloat(100 * data.records[which].count / data.rates.length).toFixed(0) + "% of the time) and the largest ever " + which + " was " + direction(data.records[which].change) + Math.abs(data.records[which].change).toFixed(4) + " which happened on " + data.records[which].when + ".  The most common " + which + " is " + direction(data.records[which].mode) + Math.abs(data.records[which].mode).toFixed(4) + " with an average " + which + " of " + direction(data.records[which].mean) + Math.abs(data.records[which].mean).toFixed(4) + " ± " + data.records[which].stdev + "." );
	}
	parts = sequences.slice(-1)[0];
	which = "falling";
	if (parts[0] === "r") which = "rising";
	phrase.push("Currently the rate is <span style=\"font-style: italic\">" + which + "</span> and has happened " + parts[2] + " " + plural("time", parts[2]) +" in a row.");
	$("#rate_changes").html(phrase.join("  "));
}

// calculate the means and standard deviations for each different way (which)
// in alist
function compile_data_into(which, alist) {
	var modifier = "";
	if (which === "week") {
		modifier = which.charAt(0);
		alist.shift();
	}
	for (var item in alist) {
		item = modifier + alist[item];
		if (typeof data.compiled[item] !== "undefined") {
			if (typeof data.summary[which] === "undefined") data.summary[which] = [];
			data.summary[which].push([
				item,
				ss.mean(data.compiled[item]),
				ss.standardDeviation(data.compiled[item])]);
		}
	}
}

// draw the graph
function draw_chart() {
	var chart = Highcharts.StockChart("money", {
		chart: {
			events: {
				redraw: function() {
					draw_lines(chart);
				}
			},
			zoomType: "x"
		},
		credits: {
			enabled: false
		},
		rangeSelector: {
			buttons: [{
				type: "week",
				count: 1,
				text: "1w"
			}, {
				type: "week",
				count: 2,
				text: "2w"
			}, {
				type: "month",
				count: 1,
				text: "1m"
			}, {
				type: "month",
				count: 2,
				text: "2m"
			}, {
				type: "month",
				count: 3,
				text: "3m"
			}, {
				type: "month",
				count: 6,
				text: "6m"
			}, {
				type: "year",
				count: 1,
				text: "1y"
			}, {
				type: "year",
				count: 2,
				text: "2y"
			}, {
				type: "all",
				text: "All"
			}],
			selected: 6
		},
		scrollbar: {
			enabled: false
		},
		series: [{
			data: data.rates,
			id: "exchange_rates",
			name: "Exchange rate",
			states: {
				hover: {
					lineWidthPlus: 0
				}
			},
			threshold: null,
			type: "area",
			zIndex: 10
		},
		{
			data: data.bought,
			events: {
				click: function(event) {
					chart.xAxis[0].setExtremes(event.point.x, data.current[0]);
				}
			},
			color: "orange",
			lineWidth: 0,
			marker: {
				enabled: true,
				radius: 5
			},
			name: "bought",
			states: {
				hover: {
					lineWidthPlus: 0
				}
			},
			zIndex: 100
		}],
		tooltip: {
			borderColor: "black",
			borderWidth: 2,
			crosshairs: [false, false],
			formatter: function() {
				var found = false;
				for (var pt of this.points) {
					if (pt.hasOwnProperty("series")) {
						if (pt.series.name === "bought") {
							found = true;
							break;
						}
					}
				}
				if (found) {
					var nearest = data.bought.map(el => Math.abs(el.x - this.x));
					var nearest_index = nearest.indexOf(Math.min.apply(Math, nearest));
					return data.bought[nearest_index].text;
				}
				return "On " + Highcharts.dateFormat("%A %B %e %Y", this.x) + " £1.00 would have bought you $" + parseFloat(this.y).toFixed(4) + ".";
			},
			shared: true
		},
		xAxis: {
			dateTimeLabelFormats: {
				millisecond: "%H:%M:%S.%L",
				second: "%H:%M:%S",
				minute: "%H:%M",
				hour: "%H:%M",
				day: "%e %b",
				week: "%e %b",
				month: "%b '%y",
				year: "%Y"
			},
			minRange: 5 * 86400000,
			ordinal: false,
			tooltip: false
		},
		yAxis: [{
			labels: {
				format: "{value:.2f}"
			},
			title: {
				text: "US Dollars ($)"
			},
			opposite: false,
			plotLines: [{
				color: "rgba(38, 50, 56, 0.65)",
				id: "current",
				label: {
					align: "center",
					style: {
						color: "rgba(38, 50, 56, 0.65)"
					},
					text: "currently: $" + parseFloat(data.current[1]).toFixed(4)
				},
				value: data.current[1],
				width: 2,
				zIndex: 5}]
		},
		{
			labels: {
				format: "{value:.2f}"
			},
			linkedTo:0,
			opposite:true,
			title: {
				text: "US Dollars ($)"
			}
		}]
	});
	return chart;
}

// draw lines for the current value, maximums, minimums and averages on the
// graph
function draw_lines(chart) {
	var extremes = chart.xAxis[0].getExtremes();
	var stats = get_statistics(extremes.min, extremes.max);
	set_grid_values("picked", stats, chart);
	chart.yAxis[0].removePlotLine("average");
	chart.yAxis[0].removePlotLine("record_average");
	chart.yAxis[0].removePlotLine("maximum");
	chart.yAxis[0].removePlotLine("record_maximum");
	chart.yAxis[0].removePlotLine("minimum");
	chart.yAxis[0].removePlotLine("record_minimum");
	var tickdiff = chart.yAxis[0].tickInterval;
	var ymin = chart.yAxis[0].min;
	var ymax = chart.yAxis[0].max;
	var avediff = Math.abs(data.records.average - stats.average);
	var maxdiff = data.records.max - data.records.average;
	var mindiff = data.records.average - data.records.min;
	if (data.records.average > ymin && data.records.average < ymax) {
		chart.yAxis[0].addPlotLine({
			color: "rgba(0, 153, 204, 0.65)",
			id: "record_average",
			label: {
				style: {
					color: "rgba(0, 153, 204, 0.65)"
				},
				text: "all-time average: $" + parseFloat(data.records.average).toFixed(4) + " ± " + parseFloat(data.records.stdev).toFixed(4)
			},
			value: data.records.average,
			width: 2,
			zIndex: 6
		});
	}
	if (mindiff >= tickdiff && data.records.min > ymin) {
		chart.yAxis[0].addPlotLine({
			color: "rgba(204, 0, 0, 0.65)",
			id: "record_minimum",
			label: {
				align: "right",
				style: {
					color: "rgba(204, 0, 0, 0.65)"
				},
				text: "all-time minimum: $" + parseFloat(data.records.min).toFixed(4),
				x: -5
			},
			value: data.records.min,
			width: 2,
			zIndex: 6
		});
	}
	if (maxdiff >= tickdiff && data.records.max < ymax) {
		chart.yAxis[0].addPlotLine({
			color: "rgba(0, 126, 51, 0.65)",
			id: "record_maximum",
			label: {
				align: "right",
				x: -5,
				style: {
					color: "rgba(0, 126, 51, 0.65)"
				},
				text: "all-time maximum: $" + parseFloat(data.records.max).toFixed(4)
			},
			value: data.records.max,
			width: 2,
			zIndex: 6
		});
	}
	maxdiff = stats.max - stats.average;
	mindiff = stats.average - stats.min;
	if (stats.average !== data.records.average && avediff > tickdiff && stats.average > ymin && stats.average < ymax) {
		chart.yAxis[0].addPlotLine({
			color: "rgba(0, 153, 204, 0.65)",
			dashStyle: "shortdash",
			id: "average",
			label: {
				align: "left",
				text: "average: $" + parseFloat(stats.average).toFixed(4) + " ± " + parseFloat(stats.stdev).toFixed(4),
				style: {
					color: "rgba(0, 153, 204, 0.65)"
				}
			},
			value: stats.average,
			width: 2,
			zIndex: 5
		});
	}
	if (stats.max !== data.records.max && maxdiff >= tickdiff && stats.max < ymax) {
		chart.yAxis[0].addPlotLine({
			color: "rgba(0, 126, 51, 0.65)",
			dashStyle: "shortdash",
			id: "maximum",
			label: {
				align: "right",
				text: "maximum: $" + parseFloat(stats.max).toFixed(4),
				style: {
					color: "rgba(0, 126, 51, 0.65)"
				},
				x: -5
			},
			value: stats.max,
			width: 2,
			zIndex: 5
		});
	}
	if (stats.min !== data.records.min && mindiff >= tickdiff && stats.min > ymin) {
		chart.yAxis[0].addPlotLine({
			color: "rgba(204, 0, 0, 0.65)",
			dashStyle: "shortdash",
			id: "minimum",
			label: {
				align: "right",
				text: "minimum: $" + parseFloat(stats.min).toFixed(4),
				style: {
					color: "rgba(204, 0, 0, 0.65)"
				},
				x: -5
			},
			value: stats.min,
			width: 2,
			zIndex: 5
		});
	}
}

// a function that returns the date since the value was higher/lower
function get_since() {
	var dates = [];
	var data_wanted = data.rates.filter(function(el) { return el[1] <= data.current[1] && el[0] !== data.current[0]; });
	dates.push(prettyDate(data_wanted.pop()));
	data_wanted = data.rates.filter(function(el) { return el[1] >= data.current[1] && el[0] !== data.current[0]; });
	dates.push(prettyDate(data_wanted.pop()));
	return dates;
}

// calculate some statistics on the data
function get_statistics(start, stop) {
	var vals = data.rates.filter(function(el) {return stop >= el[0] && el[0] >= start;}).map(i => i[1]);
	var vallength = vals.length;
	return {
		"average": parseFloat(ss.mean(vals)).toFixed(4),
		"count": vallength,
		"max": ss.max(vals),
		"min": ss.min(vals),
		"rank": Math.round((vallength - (ss.quantileRank(vals, data.current[1]) * vallength)), 0),
		"stdev": parseFloat(ss.standardDeviation(vals)).toFixed(4) };
}

// where the fun happens
function go(result) {
	// get all the bought data
	for (var dp in result.bought){
		var date = dp.split("/");
		date = Date.UTC(parseInt(date[0]), parseInt(date[1]) - 1, parseInt(date[2]));
		data.bought.push({
			"text": "Bought " + result.bought[dp].type + " from " + result.bought[dp].where + " on " + Highcharts.dateFormat("%A %e %B %Y", date) + " at $" + result.bought[dp].rate + ".",
			"x": date,
			"y": parseFloat(result.bought[dp].rate)
		});
	}

	// get all the data points into a better array
	var lastv = -1;
	for (var d in result.rates) {
		var thisv = parseFloat(result.rates[d]);
		if (lastv < 0) lastv = thisv;
		var direction = "r";
		if (thisv < lastv) direction = "f";
		data.rates.push([parseInt(d) * 1000, thisv, Math.round(10000 * (thisv - lastv), 4) / 10000, direction]);
		lastv = thisv;
	}

	// define the current data point and set the page title
	data.current = data.rates.slice(-1)[0];
	document.title = "$" + parseFloat(data.current[1]).toFixed(4) + " (" + Highcharts.dateFormat("%d %B %Y", data.current[0]) + ") - Exchange Rate";

	// get the all time statistics and process the data into different periods
	data.records = get_statistics(data.rates[0][0], data.current[0]);
	process_data_range(data.rates, true);

	// draw the chart
	var chart = draw_chart();
	draw_lines(chart);

	// update dynamic html parts
	set_grid_values("record", data.records, chart);
	$("#current_value").html("$" + parseFloat(data.current[1]).toFixed(4));
	$("#last_updated").html(Highcharts.dateFormat("%d %B %Y", data.current[0]));
	var since = get_since();
	var since_when = ["low", "high"];
	for (var lh in since_when){
		$("#" + since_when[lh] + "est_since").html(since[lh][0]);
		$("#" + since_when[lh] + "est_since_value").html(parseFloat(since[lh][1]).toFixed(4));
	}
	calculate_sequences();
	$(".highlightw").hover(function(){
		$(this).css("background-color", "#fcfccc");
		$(this).next().css("background-color", "#fcfccc");
	}, function(){
		$(this).css("background-color", "transparent");
		$(this).next().css("background-color", "transparent");
	});
	$(".highlightv").hover(function(){
		$(this).css("background-color", "#fcfccc");
		$(this).prev().css("background-color", "#fcfccc");
	}, function(){
		$(this).css("background-color", "transparent");
		$(this).prev().css("background-color", "transparent");
	});

	// finally make the dynamic html visible
	$("#summary").css({"visibility": "visible"});
	$("#current").css({"visibility": "visible"});
	$("#buying_advice").css({"visibility": "visible"});
}

// join an array in a human friendly way eg [1,2,3] becomes 1, 2 and 3
function human_join(arr) {
	return [arr.slice(0, -1).join(", "), arr.slice(-1)[0]].join(arr.length < 2 ? "" : " and ");
}

// count the consecutive number of identical letters in a string
function letterCount(str) {
	// see: https://stackoverflow.com/a/28654371
	var s= str.match(/([a-zA-Z])\1*/g)||[];
	var total = 0;
	return s.map(function(itm) {
		return [itm.charAt(0), total+=itm.length, itm.length];
	});
}

// add an s to a string if necessary
function plural(astr, val) {
	if (val === 1) return astr;
	return astr + "s";
}

// Takes an ISO time and returns a string representing how
// long ago the date represents
// see: https://stackoverflow.com/a/7641822
function prettyDate(time_arr) {
	var date = new Date(time_arr[0]);
	var diff = (((new Date()).getTime() - date.getTime()) / 1000);
	var day_diff = Math.floor(diff / 86400);

	if (isNaN(day_diff) || day_diff < 0 || day_diff >= 7) {
		return [Highcharts.dateFormat("%d %B %Y", time_arr[0]), time_arr[1]];
	}

	var r =
	(
		(
			day_diff === 0 &&
			(
				// (diff < 60 && "just now")
				// || (diff < 120 && "1 minute ago")
				(diff < 3600 && Math.floor(diff / 60) + " minutes ago") || (diff < 7200 && "1 hour ago") || (diff < 86400 && Math.floor(diff / 3600) + " hours ago")
			)
		) || (day_diff === 1 && "yesterday") || (day_diff < 7 && day_diff + " days ago")
	);
	return [r + " (" + Highcharts.dateFormat("%d %B %Y", time_arr[0]) + ")", time_arr[1]];
}

// process the data into date parts (eg weeks, months, years)
function process_data_range(datapoints) {
	// output the best and worst for the given period
	function bestworst(period) {
		function equal_maxmin(el) {
			return el[1] === values[maxmin];
		}
		function equal_part(el) {
			return el[2] === part;
		}
		function format_dates(i) {
			return week_dates(i[0]);
		}
		function output_all() {
			for (var ppp of data.summary[period]){
				var when;
				if (period === "week") {
					when = week_dates(ppp[0]);
					when = "Week " + when[2];
				} else {
					when = ppp[0];
				}
				$("#best_" + period + "_full").append("<span class=\"when highlightw\">" + when + "</span><span class=\"value highlightv\">$" + parseFloat(ppp[1]).toFixed(4) + " ± " + parseFloat(ppp[2]).toFixed(4) + "</span>");
			}
		}

		var bestworst = ["best", "worst"];
		var values = {"data": data.summary[period].map(i => i[1])};
		for (var maxmin of bestworst) {
			if (maxmin === bestworst[0]) {
				values[maxmin] = Math.max.apply(Math, values.data);
			} else {
				values[maxmin] = Math.min.apply(Math, values.data);
			}
			values[maxmin] = data.summary[period].filter(equal_maxmin);
			var stdevs = values[maxmin].map(i => i[2]);
			var part = Math.min.apply(Math, stdevs);
			values[maxmin] = values[maxmin].filter(equal_part);
			if (period === "week") {
				part = values[maxmin].map(format_dates).map(i => i[0] + " to " +i[1]);
			}
			else {
				part = values[maxmin].map(i => i[0]);
			}
			values[maxmin] = [human_join(part), parseFloat(values[maxmin][0][1]).toFixed(4), parseFloat(values[maxmin][0][2]).toFixed(4)];
		}
		var phrases = [];
		for (var bwbw of bestworst) {
			var extend = "";
			if (values[bwbw][0].indexOf(" and ") !== -1) extend = "s";
			var tense = ["is", "has"];
			if (period === "year") tense = ["was", "had"];
			phrases.push("The " + bwbw + " " + period.replace(/_/g, " ") + extend + " to buy " + tense[0] + " " + values[bwbw][0] + " which " + tense[1] + " an average exchange rate of $" + values[bwbw][1] + " ± " + values[bwbw][2] + ".");
		}
		$("#best_" + period).html(phrases.join("  "));
		output_all();
	}

	function update_part(part) {
		if (typeof data.compiled[part] === "undefined") data.compiled[part] = [];
		data.compiled[part].push(parseFloat(datapoints[datap][1]));
	}

	for (var datap in datapoints) {
		var adate = new Date(datapoints[datap][0]);
		update_part(Highcharts.dateFormat("%A", adate));
		update_part("w" + Highcharts.dateFormat("%W", adate));
		update_part(Highcharts.dateFormat("%B", adate));
		update_part(Highcharts.dateFormat("%Y", adate));
		update_part(Highcharts.dateFormat("%B %e", adate).replace(/\s{2}/g, " "));
	}
	compile_data_into("day", days);
	compile_data_into("week", [...Array(53).keys()]);
	compile_data_into("month", months);
	compile_data_into("year", [...Array(new Date().getFullYear() - 2004 + 1).keys()].map(i => i + 2004));
	compile_data_into("day_of_the_year", day_of_the_year);
	for (var p of ["day", "week", "month", "year", "day_of_the_year"]) {
		bestworst(p);
	}
}

// update the dynamic html grid with the correct values
function set_grid_values(which, section, chart) {
	function arrow_dir(val) {
		if (val > data.current[1]) {
			return "&uarr; " + parseFloat(100 * (val - data.current[1])).toFixed(2) + "¢";
		}
		else if (val < data.current[1]) {
			return "&darr; " + parseFloat(100 * (data.current[1] - val)).toFixed(2) + "¢";
		}
		return "&harr;";
	}
	var rank_percent = 100 - Math.round(100 * ((section.count - section.rank) / section.count), 0);
	$("#" + which + "_high .less").html("$" + section.max);
	$("#" + which + "_high .more").html(arrow_dir(section.max));
	$("#" + which + "_average .less").html("$" + section.average + " ± " + section.stdev);
	$("#" + which + "_average .more").html(arrow_dir(section.average));
	$("#" + which + "_low .less").html("$" + section.min);
	$("#" + which + "_low .more").html(arrow_dir(section.min));
	$("#" + which + "_rank .less").html(section.rank + " / " + section.count);
	$("#" + which + "_rank .more").html(rank_percent + "%");
	var rank_colour = "rgba(38, 50, 56, 1)";
	if (rank_percent <= 20) {
		rank_colour = "rgba(0, 126, 51, 1)";
	}
	else if (rank_percent >= 80) {
		rank_colour = "rgba(204, 0, 0, 1)";
	}
	var xmin, xmax;
	if (which === "record") {
		xmin = data.rates[0][0];
		xmax = data.current[0];
	} else {
		xmin = 86400000 + chart.xAxis[0].userMin;
		xmax = chart.xAxis[0].userMax;
	}
	$("#" + which + "_from").html(Highcharts.dateFormat("%d %b %Y", xmin));
	$("#" + which + "_to").html(Highcharts.dateFormat("%d %b %Y", xmax));
	$("#current_value").css({"color": rank_colour});
}

// calculate what dates a certain week number corresponds to for the current
// year
function week_dates(weekno) {
	weekno = parseInt(String(weekno).replace(/\D/g,"")) - 1;
	var now = new Date(new Date().getFullYear(), 0, 1, 0, 0, 0, 0);
	var period = now.setSeconds((weekno * 86400 * 7) - (now.getUTCDay() * 86400));
	var output = [Highcharts.dateFormat("%d %B", period)];
	period = new Date(period).getTime() + (86400000 * 6);
	output.push(Highcharts.dateFormat("%d %B", period));
	output.push(weekno + 1);
	return output;
}

// an array to hold all of the data to be used
// "current" is the latest data in [epoch milliseconds int, rate float] format
// "bought" is all the data from when the money was bought
// "rates" is all the data formatted like [[epoch milliseconds int, rate float], [...]]
// "compiled" is all the data compiled into different date ranges (eg day name, week number, month, year, day of the year)
// "summary" is a summary of the compiled data for either all the data ("record") or the selected data
var data = {
	"bought": [],
	"compiled": {},
	"current": [],
	"rates": [],
	"summary": {"record": {}, "selected":{}}};

// i suppose we had better get started and fetch some data
$.ajax({
	url: "money.json",
	beforeSend: function(xhr){
		if (xhr.overrideMimeType) xhr.overrideMimeType("application/json");
	},
	dataType: "json",
	success: function(result) {
		go(result);
	}
});
