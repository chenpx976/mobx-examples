var Timer = function (initialMilliseconds) {
	this.id = _.uniqueId('timer_');
	mobx.extendObservable(this, {
		milliseconds: initialMilliseconds || 0,
		savedMilliseconds: 0,
		totalMilliSeconds: function () {
			return this.milliseconds + this.savedMilliseconds;
		},
		display: function () {
			return moment(this.totalMilliSeconds).format('mm : ss : SS');
		},
		saveTime: mobx.action('saveTime', function () {
			this.savedMilliseconds += this.milliseconds;
			this.milliseconds = 0;
		}),
		reset: mobx.action('reset', function () {
			this.milliseconds = this.savedMilliseconds = 0;
		})
	});
};

var TimerStore = function () {
	mobx.extendObservable(this, {
		isRunning: false,
		timer: new Timer(),
		startTime: null,
		laps: [],
		mainDisplay: function () {
			return this.timer.display;
		},
		hasStarted: function () {
			return this.timer.totalMilliSeconds !== 0;
		},
		length: function () {
			return this.laps.length;
		},
		lapTime: function () {
			return _.reduce(this.laps, function (result, lap) {
				result += lap.totalMilliSeconds;
				return result;
			}, 0);
		},
		lapData: function () {
			return _.map(this.laps, function (lap, index) {
				return _.assign({
					text: 'Lap ' + (index + 1) + ': ' + lap.display
				}, lap);
			}).reverse();
		},
		measure: mobx.action('measure', function () {
			var self = this;
			if (!this.isRunning) {
				return;
			}

			this.timer.milliseconds = moment().diff(this.startTime);

			setTimeout(function () {
				self.measure()
			}, 10);
		}),
		startTimer: mobx.action('startTimer', function () {
			if (this.isRunning) {
				return;
			}
			this.isRunning = true;
			this.startTime = moment();
			this.measure();
		}),
		lapTimer: mobx.action('lapTimer', function () {
			this.laps.push(new Timer(this.timer.totalMilliSeconds - this.lapTime));
		}),
		stopTimer: mobx.action(function () {
			this.timer.saveTime();
			this.isRunning = false;
		}),
		resetTimer: mobx.action(function () {
			this.timer.reset();
			this.laps = [];
			this.isRunning = false;
		})
	});
};

var Main = mobxReact.observer(React.createClass({
	displayName: 'Main',
	render: function () {
		return React.createElement(mobxReact.Provider, {timerStore: this.props.timerStore},
			React.DOM.div(null,
				React.createElement(mobxDevtools.default),
				React.createElement(activeTimerRenderer),
				React.createElement(buttonRenderer),
				React.createElement(lapTimerRenderer)
			)
		);
	}
}));

var activeTimerRenderer = mobxReact.observer(['timerStore'], React.createClass({
	displayName: 'activeTimer',
	render: function () {
		return React.DOM.div(null, this.props.timerStore.mainDisplay);
	}
}));

var lapTimerRenderer = mobxReact.observer(['timerStore'], React.createClass({
	displayName: 'lapTimer',
	render: function () {
		return React.DOM.div(null, React.DOM.ul(null, this.props.timerStore.lapData.map(function (lap) {
			return React.DOM.li({key: lap.id}, lap.text);
		})));
	}
}));

var buttonRenderer = mobxReact.observer(['timerStore'], React.createClass({
	displayName: 'buttons',
	render: function () {
		var timerStore = this.props.timerStore;
		var buttons = [];
		var buttonMaker = function (title, callBack) {
			return React.DOM.button(
				{
					key: title,
					onClick: function () {
						_.bind(callBack, timerStore)();
					}
				}, title
			);
		};
		if (!timerStore.isRunning) {
			if (timerStore.hasStarted) {
				buttons.push(buttonMaker('Reset', timerStore.resetTimer));
			}
			buttons.push(buttonMaker('Start', timerStore.startTimer));
		} else {
			buttons.push(buttonMaker('Stop', timerStore.stopTimer));
			buttons.push(buttonMaker('Lap', timerStore.lapTimer));
		}
		return React.DOM.div(null, buttons);
	}
}));

var timerStore = new TimerStore();

ReactDOM.render(
	React.createElement(Main, {
		timerStore: timerStore
	}),
	document.getElementById('mount')
);