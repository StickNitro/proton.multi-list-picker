/**
 * @author Milad Naseri (mmnaseri@programmer.net)
 * @since 1.0 (4/21/16)
 */
(function () {
    var templates = {
        picker: "$/proton/multi-list-picker/picker.html"
    };
    var module = angular.module('proton.multi-list-picker', []);
    module.run(['$templateCache', function ($templateCache) {
        $templateCache.put(templates.picker, "<div class=\'proton-multi-list-picker {{attachment}}\'>\n    <span ng-transclude class=\'proton-multi-list-picker-contents\'></span>\n    <div class=\'before\'></div>\n    <ul class=\'lists\'>\n        <li class=\'before-lists\'></li>\n        <li ng-repeat=\'list in items track by $index\' class=\'list-container {{$index == 0 ? \"first\" : \"\"}} {{$index == items.length - 1 ? \"last\" : \"\"}}\' data-index=\'{{$index}}\' proton-multi-list-motion data-motion-start=\'motionStart($event)\' data-motion-change=\'motionChange($event)\' data-motion-end=\'motionEnd($event)\'>\n            <span class=\'divider {{!list.value ? \"blank\" : \"\"}}\' ng-if=\'list.$divider\'>\n                <span ng-if=\'!bindHtml\' ng-bind=\'list.value\'></span>\n                <span ng-if=\'bindHtml\' ng-bind-html=\'list.value\'></span>\n            </span>\n            <ul class=\'list\' ng-if=\'!list.$divider\' data-selected=\'{{list.selected}}\'>\n                <li class=\'item {{item.index == list.selected ? \"selected\" : \"\"}} {{(!list.cycle && list.selected &lt; 3) ? \"offset-down-\" + (3 - list.selected) : \"\"}} {{(list.cycle ? item.cycleIndex : item.index) &lt; list.selected && (list.cycle ? item.cycleIndex : item.index) &gt;= list.selected - 3 ? \"distance-\" + (list.selected - (list.cycle ? item.cycleIndex : item.index)) : \"\"}} {{(list.cycle ? item.cycleIndex : item.index) &gt; list.selected && (list.cycle ? item.cycleIndex : item.index) &lt;= list.selected + 3 ? \"distance-\" + ((list.cycle ? item.cycleIndex : item.index) - list.selected) : \"\"}}\' ng-repeat=\'item in list.view track by $index\' data-index=\'{{item.index}}\' ng-click=\'select(list, item.index)\' style=\'width: {{list.width}}px;\'>\n                    <span ng-if=\'item.$placeholder\'></span>\n                    <span ng-if=\'!item.$placeholder && !bindHtml\' ng-bind=\'item.label\'></span>\n                    <span ng-if=\'!item.$placeholder && bindHtml\' ng-bind-html=\'item.label\'></span>\n                </li>\n            </ul>\n        </li>\n        <li class=\'after-lists\'></li>\n    </ul>\n    <div class=\'after\'></div>\n</div>");
    }]);
    module.directive('protonMultiListPicker', ["$parse", "$timeout", function ($parse, $timeout) {
        var controller = function ProtonMultiListPickerController($scope) {
            $scope.items = [];
            this.addDivider = function (divider) {
                $scope.items.push({
                    $divider: true,
                    value: divider
                });
            };
            this.add = function (item) {
                if (!item.alias) {
                    item.alias = $scope.items.length;
                }
                item.index = $scope.items.length;
                $scope.items.push(item);
                //we need to set up this watch so that any external changes to this list are reflected immediately
                $scope.$watch(function () {
                    return item.source();
                }, function () {
                    $scope.$broadcast('protonMultiListPicker:changed', item);
                }, true);
            };
        };
        return {
            restrict: "E",
            replace: true,
            templateUrl: templates.picker,
            require: "?ngModel",
            scope: {},
            transclude: true,
            controller: ["$scope", controller],
            link: function ($scope, $element, $attrs) {
                var parentScope = $element.parent().scope();
                $scope.model = null;
                $scope.$watch(function () {
                    return $parse($attrs.ngModel)(parentScope);
                }, function (model) {
                    if (model) {
                        $scope.model = model;
                        $scope.$broadcast('protonMultiListPicker:changed', model);
                    }
                }, true);
                $scope.$watch('model', function (model) {
                    $scope.$broadcast('protonMultiListPicker:changed', model);
                }, true);
                $attrs.$observe("bindHtml", function (value) {
                    $scope.bindHtml = value == "true";
                });
                $scope.$on('protonMultiListPicker:changed', function () {
                    //we need to convert the values, so that the given items are all lists of {label,value}s.
                    angular.forEach($scope.items, function (list) {
                        if (angular.isDefined(list.$divider)) {
                            return;
                        }
                        var source = angular.copy(list.source());
                        var result;
                        if (!angular.isArray(source)) {
                            result = [];
                            if (angular.isObject(source)) {
                                angular.forEach(source, function (value, property) {
                                    result.push({
                                        label: value,
                                        value: property
                                    });
                                });
                                result.sort(function (first, second) {
                                    return first.label < second.label ? -1 : 1;
                                });
                            } else {
                                result.push({
                                    label: source,
                                    value: source
                                });
                            }
                        } else {
                            result = source;
                        }
                        source = result;
                        result = [];
                        var longest = 0;
                        angular.forEach(source, function (item, index) {
                            item.index = index;
                            if (angular.isObject(item) && angular.isDefined(item.label) && angular.isDefined(item.value)) {
                                result.push(item);
                            } else {
                                result.push({
                                    label: item,
                                    value: item
                                });
                            }
                            var element = document.createElement("div");
                            element.innerHTML = String(result[result.length - 1].label);
                            element.className = "sandbox-item";
                            element.style.backgroundColor =  "red";
                            $element.append(element);
                            longest = Math.max(element.offsetWidth, longest);
                            element.parentNode.removeChild(element);
                        });
                        list.width = longest;
                        list.array = result;
                        list.selected = 0;
                    });
                    if (angular.isObject($scope.model)) {
                        //first, let's see if the model has all the required properties
                        angular.forEach($scope.items, function (list) {
                            if (list.$divider) {
                                return;
                            }
                            if (angular.isUndefined($scope.model[list.alias])) {
                                $scope.model[list.alias] = list.array[0].value;
                            }
                        });
                        //now, let's figure out which one is selected
                        angular.forEach($scope.items, function (list) {
                            if (list.$divider) {
                                return;
                            }
                            list.selected = -1;
                            angular.forEach(list.array, function (item, index) {
                                if (list.selected > -1) {
                                    return;
                                }
                                if (item.value == $scope.model[list.alias]) {
                                    list.selected = index;
                                }
                            });
                            if (list.selected == -1) {
                                //if the current selection is invalid, we will choose the first
                                $scope.model[list.alias] = list.array[0].value;
                                list.selected = 0;
                            }
                            $scope.$broadcast('protonMultiListPicker:selected', list);
                        });
                    }
                });
                $scope.$on('protonMultiListPicker:selected', function (event, list) {
                    if (!angular.isArray(list.array)) {
                        return;
                    }
                    list.view = [];
                    var from = Math.max(list.selected - 3, 0);
                    var to = Math.min(list.array.length - 1, list.selected + 3);
                    var i;
                    for (i = from; i <= to; i++) {
                        var item = angular.copy(list.array[i]);
                        item.index = i;
                        list.view.push(item);
                    }
                    if (list.cycle) {
                        if (list.view.length < 7) {
                            var pivot = list.selected - from;
                            var cursor;
                            //we need to add stuff to the beginning of the list, until the selected index is in the middle
                            cursor = list.array.length - 1;
                            while (pivot < 3) {
                                list.view.splice(0, 0, angular.copy(list.array[cursor]));
                                list.view[0].index = list.view[0].index - list.array.length;
                                cursor--;
                                pivot++;
                                if (cursor < 0) {
                                    cursor = list.array.length - 1;
                                }
                            }
                            //if after padding from the left, the view is still short of 7 items, we need to pad from the right
                            cursor = 0;
                            while (list.view.length < 7) {
                                list.view.push(angular.copy(list.array[cursor]));
                                list.view[list.view.length - 1].index = list.view[pivot].index + cursor + 1;
                                cursor++;
                                if (cursor == list.array.length) {
                                    cursor = 0;
                                }
                            }
                        }
                        angular.forEach(list.view, function (item) {
                            item.cycleIndex = item.index;
                        });
                    }
                });
                (function () {
                    var list;
                    var $list;
                    var next = function () {
                        list.selected++;
                        // $list.addClass('one-up');
                        if (list.selected == list.array.length) {
                            if (list.cycle) {
                                list.selected = 0;
                            } else {
                                list.selected = list.array.length - 1;
                            }
                        }
                    };
                    var previous = function () {
                        // $list.addClass('one-down');
                        list.selected--;
                        if (list.selected < 0) {
                            if (list.cycle) {
                                list.selected = list.array.length - 1;
                            } else {
                                list.selected = 0;
                            }
                        }
                    };
                    function setSelection(event) {
                        // $list.addClass('transitioning');
                        // $list.removeClass('one-up');
                        // $list.removeClass('one-down');
                        var direction = -1 * Math.sign(event.speedY);
                        if (direction < 0) {
                            previous();
                        } else {
                            next();
                        }
                        $timeout(function () {
                            // $list.removeClass('one-up');
                            // $list.removeClass('one-down');
                            // $list.removeClass('transitioning');
                            $scope.select(list, list.selected);
                        }, 0);
                    }
                    var listElement = function (e) {
                        var element = angular.element(e);
                        while (element.length && !element.hasClass('list-container')) {
                            element = element.parent();
                        }
                        return element;
                    };
                    $scope.motionStart = function (event) {
                        $list = listElement(event.target);
                        var listIndex = $list.attr('data-index');
                        list = $scope.items[listIndex];
                        event.checkpoint();
                    };

                    $scope.motionChange = function (event) {
                        var element = $list[0];
                        if (!element) {
                            return;
                        }
                        var last = event.last();
                        element = element.getElementsByTagName('li')[0];
                        var threshold = element.offsetHeight;
                        if (Math.abs(last.y - event.y) >= threshold) {
                            event.checkpoint();
                        } else {
                            return;
                        }
                        setSelection(event);
                    };
                    $scope.motionEnd = function (event) {
                        event.slowDown(0.0001, Math.floor(Math.abs(event.speedY) / 0.3), function () {
                            setSelection(event);
                        });
                    };
                })();
                $scope.select = function (list, index) {
                    if (angular.isObject($scope.model)) {
                        $scope.model[list.alias] = list.array[index].value;
                        list.selected = index;
                    }
                    $scope.$broadcast('protonMultiListPicker:selected', list);
                };
            }
        };
    }]);
    module.directive('protonMultiListPickerList', [function () {
        var controller = function ProtonMultiListPickerListController($scope) {
            $scope.items = [];
            this.add = function (item) {
                $scope.items.push(item);
            };
        };
        return {
            scope: {
                source: "&?",
                alias: "@?",
                cycle: "@?"
            },
            restrict: "E",
            require: "^protonMultiListPicker",
            controller: ["$scope", controller],
            link: function ($scope, $element, $attrs, parent) {
                parent.add({
                    source: function () {
                        return $scope.source && $scope.source() || $scope.items;
                    },
                    alias: $scope.alias,
                    cycle: $scope.cycle == "true"
                });
            }
        };
    }]);
    module.directive('protonMultiListPickerDivider', [function () {
        return {
            restrict: "E",
            require: "^protonMultiListPicker",
            link: function ($scope, $element, $attrs, parentController) {
                parentController.addDivider(($element.html() || "").trim());
            }
        };
    }]);
    module.directive('protonMultiListPickerListItem', [function () {
        return {
            restrict: "E",
            require: "^protonMultiListPickerList",
            link: function ($scope, $element, $attrs, parent) {
                parent.add({
                    value: $attrs.value || $element.html(),
                    label: $element.html()
                });
            }
        };
    }]);
    module.service('protonMultiListMomentum', ["$timeout", function ($timeout) {
        var details = function (event) {
            var description = {
                event: event,
                type: event.touches ? "Touch" : "Mouse",
                x: event.touches ? event.touches[0].screenX : event.screenX,
                y: event.touches ? event.touches[0].screenY : event.screenY,
                target: event.touches ? event.touches[0].target : event.target,
                timestamp: Date.now(),
                xDisplacement: 0,
                yDisplacement: 0,
                speedX: 0,
                speedY: 0,
                speedXState: 'stopped',
                speedYState: 'stopped',
                accelerationX: 0,
                accelerationY: 0,
                speed: 0,
                acceleration: 0,
                angle: NaN,
                origin: coordinates ? (coordinates.origin ? coordinates.origin : coordinates) : null,
                remembered: coordinates ? (coordinates.remembered ? coordinates.remembered : null) : null
            };
            description.checkpoint = function () {
                description.remembered = description;
            };
            description.last = function () {
                return description.remembered;
            };
            description.slowDown = function (acceleration, steps, callback) {
                var accelerationX = -1 * Math.sign(description.speedX) * Math.abs(acceleration);
                var accelerationY = -1 * Math.sign(description.speedY) * Math.abs(acceleration);
                var xIntervals = Math.abs(description.speedX * 10 / accelerationX / steps);
                var yIntervals = Math.abs(description.speedY * 10 / accelerationY / steps);
                var intervals = Math.max(xIntervals, yIntervals) / 1000;
                var step = 0;
                (function proceed(delay) {
                    if (isNaN(delay)) {
                        return;
                    }
                    $timeout(function () {
                        if (angular.isFunction(callback)) {
                            callback(step);
                        }
                        step++;
                        if (step < steps) {
                            proceed(delay * 1.1);
                        }
                    }, delay);
                })(intervals);
            };
            return description;
        };
        var coordinates = null;
        this.start = function (event, callback) {
            if (event.touches && event.touches.length > 1) {
                return;
            }
            coordinates = details(event);
            if (angular.isFunction(callback)) {
                callback(coordinates);
            }
        };
        this.move = function (event, callback) {
            if (coordinates === null) {
                return;
            }
            var newCoordinates = details(event);
            var timeDifference = newCoordinates.timestamp - coordinates.timestamp;
            var xDifference = newCoordinates.x - coordinates.x;
            var yDifference = newCoordinates.y - coordinates.y;
            newCoordinates.xDisplacement = xDifference;
            newCoordinates.yDisplacement = yDifference;
            newCoordinates.angle = Math.atan2(newCoordinates.x, newCoordinates.y);
            if (timeDifference == 0) {
                if (xDifference == 0) {
                    newCoordinates.speedX = 0;
                    newCoordinates.speedXState = 'stopped';
                } else {
                    newCoordinates.speedX = Math.sign(xDifference) * Infinity;
                    newCoordinates.speedXState = 'fast';
                }
                if (yDifference == 0) {
                    newCoordinates.speedY = 0;
                    newCoordinates.speedYState = 'stopped';
                } else {
                    newCoordinates.speedY = Math.sign(yDifference) * Infinity;
                    newCoordinates.speedYState = 'fast';
                }
            } else {
                newCoordinates.speedX = xDifference / timeDifference;
                newCoordinates.speedY = yDifference / timeDifference;
                if (Math.abs(newCoordinates.speedX) < 0.2) {
                    newCoordinates.speedXState = 'slow';
                } else if (Math.abs(newCoordinates.speedX) < 0.6) {
                    newCoordinates.speedXState = 'moderate';
                } else {
                    newCoordinates.speedXState = 'fast';
                }
                if (Math.abs(newCoordinates.speedY) < 0.2) {
                    newCoordinates.speedYState = 'slow';
                } else if (Math.abs(newCoordinates.speedY) < 0.6) {
                    newCoordinates.speedYState = 'moderate';
                } else {
                    newCoordinates.speedYState = 'fast';
                }
            }
            var speedXDifference = newCoordinates.speedX - coordinates.speedX;
            var speedYDifference = newCoordinates.speedY - coordinates.speedY;
            if (timeDifference == 0) {
                if (speedXDifference == 0) {
                    newCoordinates.accelerationX = 0;
                } else {
                    newCoordinates.accelerationX = Math.sign(speedXDifference) * Infinity;
                }
                if (speedYDifference == 0) {
                    newCoordinates.accelerationY = 0;
                } else {
                    newCoordinates.accelerationY = Math.sign(speedYDifference) * Infinity;
                }
            } else {
                newCoordinates.accelerationX = speedXDifference / timeDifference;
                newCoordinates.accelerationY = speedYDifference / timeDifference;
            }
            newCoordinates.speed = Math.sqrt(Math.pow(newCoordinates.speedX, 2) + Math.pow(newCoordinates.speedY, 2));
            newCoordinates.acceleration = Math.sqrt(Math.pow(newCoordinates.accelerationX, 2) + Math.pow(newCoordinates.accelerationY, 2));
            coordinates = newCoordinates;
            if (angular.isFunction(callback)) {
                callback(coordinates);
            }
        };
        this.end = function (event, callback) {
            if (coordinates === null) {
                return;
            }
            if (angular.isFunction(callback)) {
                callback(coordinates);
            }
            coordinates = null;
        };
    }]);
    module.directive('protonMultiListMotion', ["protonMultiListMomentum", "$parse", function (protonMultiListMomentum, $parse) {
        return {
            restrict: "A",
            link: function ($scope, $element, $attrs) {
                var move = $attrs.motionChange && $parse($attrs.motionChange);
                var end = $attrs.motionEnd && $parse($attrs.motionEnd);
                var start = $attrs.motionStart && $parse($attrs.motionStart);
                $element.on("mousedown touchstart", function (event) {
                    protonMultiListMomentum.start(event, function (event) {
                        $scope.$apply(function () {
                            start && start($scope, {
                                $event: event
                            });
                        });
                    });
                });
                $element.on("mousemove touchmove", function (event) {
                    protonMultiListMomentum.move(event, function (event) {
                        $scope.$apply(function () {
                            move && move($scope, {
                                $event: event
                            });
                        });
                    });
                });
                $element.on("mouseup touchend touchcancel", function (event) {
                    protonMultiListMomentum.end(event, function (event) {
                        $scope.$apply(function () {
                            end && end($scope, {
                                $event: event
                            });
                        });
                    });
                });
            }
        };
    }]);
})();