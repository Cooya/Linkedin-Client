Date.prototype.addDays = function(days) {
	const date = new Date(this.valueOf());
	date.setDate(date.getDate() + days);
	return date;
};

Date.prototype.addSeconds = function(seconds) {
	const date = new Date(this.valueOf());
	date.setSeconds(date.getSeconds() + seconds);
	return date;
};
