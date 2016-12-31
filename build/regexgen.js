(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["regexgen"] = factory();
	else
		root["regexgen"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	const Trie = __webpack_require__(1);

	/**
	 * Generates a regular expression that matches the given input strings.
	 * @param {Array<string>} inputs
	 * @param {string} flags
	 * @return {RegExp}
	 */
	function regexgen(inputs, flags) {
	  let trie = new Trie;
	  for (let input of inputs) {
	    trie.add(input);
	  }

	  return trie.toRegExp(flags);
	}

	regexgen.Trie = Trie;
	module.exports = regexgen;


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	const State = __webpack_require__(2);
	const minimize = __webpack_require__(4);
	const toRegex = __webpack_require__(6);

	/**
	 * A Trie represents a set of strings in a tree data structure
	 * where each edge represents a single character.
	 * https://en.wikipedia.org/wiki/Trie
	 */
	class Trie {
	  constructor() {
	    this.alphabet = new Set;
	    this.root = new State;
	  }

	  /**
	   * Adds the given string to the trie.
	   * @param {string} string - the string to add
	   */
	  add(string) {
	    let node = this.root;
	    for (let char of string) {
	      this.alphabet.add(char);
	      node = node.transitions.get(char);
	    }

	    node.accepting = true;
	  }

	  /**
	   * Returns a minimal DFA representing the strings in the trie.
	   * @return {State} - the starting state of the minimal DFA
	   */
	  minimize() {
	    return minimize(this.root);
	  }

	  /**
	   * Returns a regex pattern that matches the strings in the trie.
	   * @return {string} pattern - The regex pattern.
	   */
	  toString() {
	    return toRegex(this.minimize());
	  }

	  /**
	   * Returns a regex that matches the strings in the trie.
	   * @param {string} flags - The flags to add to the regex.
	   * @return {RegExp}
	   */
	  toRegExp(flags) {
	    return new RegExp(this.toString(), flags);
	  }
	}

	module.exports = Trie;


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	const Map = __webpack_require__(3);

	/**
	 * Represents a state in a DFA.
	 */
	class State {
	  constructor() {
	    this.accepting = false;
	    this.transitions = new Map(k => new State);
	  }

	  /**
	   * A generator that yields all states in the subtree
	   * starting with this state.
	   */
	  *visit(visited = new Set) {
	    if (visited.has(this)) return;
	    visited.add(this);

	    yield this;
	    for (let state of this.transitions.values()) {
	      yield* state.visit(visited);
	    }
	  }
	}

	module.exports = State;


/***/ },
/* 3 */
/***/ function(module, exports) {

	/**
	 * This ES6 Map subclass calls the getter function passed to
	 * the constructor to initialize undefined properties when they
	 * are first retrieved.
	 */
	class DefaultMap extends Map {
	  constructor(iterable, defaultGetter) {
	    if (typeof iterable === 'function') {
	      defaultGetter = iterable;
	      iterable = null;
	    }

	    super(iterable);
	    this.defaultGetter = defaultGetter;
	  }

	  get(key) {
	    if (!super.has(key)) {
	      let res = this.defaultGetter(key);
	      this.set(key, res);
	      return res;
	    }

	    return super.get(key);
	  }
	}

	module.exports = DefaultMap;


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	const Map = __webpack_require__(3);
	const Set = __webpack_require__(5);
	const State = __webpack_require__(2);

	/**
	 * Implements Hopcroft's DFA minimization algorithm.
	 * https://en.wikipedia.org/wiki/DFA_minimization#Hopcroft.27s_algorithm
	 *
	 * @param {State} root - the initial state of the DFA
	 * @return {State} - the new initial state
	 */
	function minimize(root) {
	  let states = new Set(root.visit());
	  let finalStates = states.filter(s => s.accepting);

	  // Create a map of incoming transitions to each state, grouped by character.
	  let transitions = new Map(k => new Map(k => new Set));
	  for (let s of states) {
	    for (let [t, st] of s.transitions) {
	      transitions.get(st).get(t).add(s);
	    }
	  }

	  let P = new Set([finalStates, states.difference(finalStates)]);
	  let W = new Set(P);

	  while (W.size > 0) {
	    let A = W.shift();

	    // Collect states that have transitions leading to states in A, grouped by character.
	    let t = new Map(k => new Set);
	    for (let s of A) {
	      for (let [T, X] of transitions.get(s)) {
	        t.get(T).addAll(X);
	      }
	    }

	    for (let X of t.values()) {
	      for (let Y of P) {
	        let i = X.intersection(Y);
	        if (i.size === 0) {
	          continue;
	        }

	        let d = Y.difference(X);
	        if (d.size === 0) {
	          continue;
	        }

	        P.replace(Y, i, d);

	        let y = W.find(v => v.equals(Y));
	        if (y) {
	          W.replace(y, i, d);
	        } else if (i.size <= d.size) {
	          W.add(i);
	        } else {
	          W.add(d);
	        }
	      }
	    }
	  }

	  // Each set S in P now represents a state in the minimized DFA.
	  // Build the new states and transitions.
	  let newStates = new Map(k => new State);
	  let initial = null;

	  for (let S of P) {
	    let first = S.first();
	    let s = newStates.get(S);
	    for (let [c, old] of first.transitions) {
	      s.transitions.set(c, newStates.get(P.find(v => v.has(old))));
	    }

	    s.accepting = first.accepting;

	    if (S.has(root)) {
	      initial = s;
	    }
	  }

	  return initial;
	}

	module.exports = minimize;


/***/ },
/* 5 */
/***/ function(module, exports) {

	/**
	 * This class extends the native ES6 Set class with some additional methods
	 */
	class ExtendedSet extends Set {
	  filter(fn) {
	    let res = new ExtendedSet;
	    for (let x of this) {
	      if (fn(x)) {
	        res.add(x);
	      }
	    }

	    return res;
	  }

	  difference(b) {
	    return this.filter(x => !b.has(x));
	  }

	  intersection(b) {
	    return this.filter(x => b.has(x));
	  }

	  equals(b) {
	    if (this.size !== b.size) {
	      return false;
	    }

	    for (let x of this) {
	      if (!b.has(x)) {
	        return false;
	      }
	    }

	    return true;
	  }

	  find(fn) {
	    for (let x of this) {
	      if (fn(x)) {
	        return x;
	      }
	    }

	    return null;
	  }

	  first() {
	    return this.values().next().value;
	  }

	  shift() {
	    let v = this.first();
	    this.delete(v);
	    return v;
	  }

	  replace(search, ...replacements) {
	    if (this.delete(search)) {
	      this.addAll(replacements);
	    }
	  }

	  addAll(items) {
	    for (let x of items) {
	      this.add(x);
	    }
	  }
	}

	module.exports = ExtendedSet;


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	const {Alternation, CharClass, Concatenation, Repetition, Literal} = __webpack_require__(7);

	/**
	 * Implements Brzozowski's algebraic method to convert a DFA into a regular
	 * expression pattern.
	 * http://cs.stackexchange.com/questions/2016/how-to-convert-finite-automata-to-regular-expressions#2392
	 *
	 * @param {State} root - the initial state of the DFA
	 * @return {String} - the converted regular expression pattern
	 */
	function toRegex(root) {
	  let states = Array.from(root.visit());

	  // Setup the system of equations A and B from Arden's Lemma.
	  // A represents a state transition table for the given DFA.
	  // B is a vector of accepting states in the DFA, marked as epsilons.
	  let A = [];
	  let B = [];

	  for (let i = 0; i < states.length; i++) {
	    let a = states[i];
	    if (a.accepting) {
	      B[i] = new Literal('');
	    }

	    A[i] = [];
	    for (let [t, s] of a.transitions) {
	      let j = states.indexOf(s);
	      A[i][j] = A[i][j] ? union(A[i][j], new Literal(t)) : new Literal(t);
	    }
	  }

	  // Solve the of equations
	  for (let n = states.length - 1; n >= 0; n--) {
	    if (A[n][n] != null) {
	      B[n] = concat(star(A[n][n]), B[n]);
	      for (let j = 0; j < n; j++) {
	        A[n][j] = concat(star(A[n][n]), A[n][j]);
	      }
	    }

	    for (let i = 0; i < n; i++) {
	      if (A[i][n] != null) {
	        B[i] = union(B[i], concat(A[i][n], B[n]));
	        for (let j = 0; j < n; j++) {
	          A[i][j] = union(A[i][j], concat(A[i][n], A[n][j]));
	        }
	      }
	    }
	  }

	  return B[0].toString();
	}

	/**
	 * Creates a repetition if `exp` exists.
	 */
	function star(exp) {
	  return exp ? new Repetition(exp, '*') : null;
	}

	/**
	 * Creates a union between two expressions
	 */
	function union(a, b) {
	  if (a != null && b != null && a !== b) {
	    // Hoist common substrings at the start and end of the options
	    let start, end, res;
	    [a, b, start] = removeCommonSubstring(a, b, 'start');
	    [a, b, end] = removeCommonSubstring(a, b, 'end');

	    // If a or b is empty, make an optional group instead
	    if (a.isEmpty || b.isEmpty) {
	      res = new Repetition(a.isEmpty ? b : a, '?');
	    } else if (a instanceof Repetition && a.type === '?') {
	      res = new Repetition(new Alternation(a.expr, b), '?');
	    } else if (b instanceof Repetition && b.type === '?') {
	      res = new Repetition(new Alternation(a, b.expr), '?');
	    } else {
	      // Check if we can make a character class instead of an alternation
	      let ac = a.getCharClass && a.getCharClass();
	      let bc = b.getCharClass && b.getCharClass();
	      if (ac && bc) {
	        res = new CharClass(ac, bc);
	      } else {
	        res = new Alternation(a, b);
	      }
	    }

	    if (start) {
	      res = new Concatenation(new Literal(start), res);
	    }

	    if (end) {
	      res = new Concatenation(res, new Literal(end));
	    }

	    return res;
	  }

	  return a || b;
	}

	/**
	 * Removes the common prefix or suffix from the two expressions
	 */
	function removeCommonSubstring(a, b, side) {
	  let al = a.getLiteral && a.getLiteral(side);
	  let bl = b.getLiteral && b.getLiteral(side);
	  if (!al || !bl) {
	    return [a, b, null];
	  }

	  let s = commonSubstring(al, bl, side);
	  if (!s) {
	    return [a, b, ''];
	  }

	  a = a.removeSubstring(side, s.length);
	  b = b.removeSubstring(side, s.length);

	  return [a, b, s];
	}

	/**
	 * Finds the common prefix or suffix between to strings
	 */
	function commonSubstring(a, b, side) {
	  let dir = side === 'start' ? 1 : -1;
	  a = Array.from(a);
	  b = Array.from(b);
	  let ai = dir === 1 ? 0 : a.length - 1;
	  let ae = dir === 1 ? a.length : -1;
	  let bi = dir === 1 ? 0 : b.length - 1;
	  let be = dir === 1 ? b.length : -1;
	  let res = '';

	  for (; ai !== ae && bi !== be && a[ai] === b[bi]; ai += dir, bi += dir) {
	    if (dir === 1) {
	      res += a[ai];
	    } else {
	      res = a[ai] + res;
	    }
	  }

	  return res;
	}

	/**
	 * Creates a concatenation between expressions a and b
	 */
	function concat(a, b) {
	  if (a == null || b == null) {
	    return null;
	  }

	  if (a.isEmpty) {
	    return b;
	  }

	  if (b.isEmpty) {
	    return a;
	  }

	  // Combine literals
	  if (a instanceof Literal && b instanceof Literal) {
	    return new Literal(a.value + b.value);
	  }

	  if (a instanceof Literal && b instanceof Concatenation && b.a instanceof Literal) {
	    return new Concatenation(new Literal(a.value + b.a.value), b.b);
	  }

	  if (b instanceof Literal && a instanceof Concatenation && a.b instanceof Literal) {
	    return new Concatenation(a.a, new Literal(a.b.value + b.value));
	  }

	  return new Concatenation(a, b);
	}

	module.exports = toRegex;


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	const jsesc = __webpack_require__(8);
	const regenerate = __webpack_require__(13);

	/**
	 * Represents an alternation (e.g. `foo|bar`)
	 */
	class Alternation {
	  constructor(a, b) {
	    this.precedence = 1;
	    this.a = a;
	    this.b = b;
	  }

	  toString() {
	    return parens(this.a, this) + '|' + parens(this.b, this);
	  }
	}

	/**
	 * Represents a character class (e.g. [0-9a-z])
	 */
	class CharClass {
	  constructor(a, b) {
	    this.precedence = 1;
	    this.set = regenerate(a, b);
	  }

	  toString() {
	    return this.set.toString();
	  }

	  getCharClass() {
	    return this.set;
	  }

	  get isSingleCharacter() {
	    return !this.set.toArray().some(c => c > 0xffff);
	  }
	}

	/**
	 * Represents a concatenation (e.g. `foo`)
	 */
	class Concatenation {
	  constructor(a, b) {
	    this.precedence = 2;
	    this.a = a;
	    this.b = b;
	  }

	  toString() {
	    return parens(this.a, this) + parens(this.b, this);
	  }

	  getLiteral(side) {
	    if (side === 'start' && this.a.getLiteral) {
	      return this.a.getLiteral(side);
	    }

	    if (side === 'end' && this.b.getLiteral) {
	      return this.b.getLiteral(side);
	    }
	  }

	  removeSubstring(side, len) {
	    let {a, b} = this;
	    if (side === 'start' && a.removeSubstring) {
	      a = a.removeSubstring(side, len);
	    }

	    if (side === 'end' && b.removeSubstring) {
	      b = b.removeSubstring(side, len);
	    }

	    return a.isEmpty ? b : b.isEmpty ? a : new Concatenation(a, b);
	  }
	}

	/**
	 * Represents a repetition (e.g. `a*` or `a?`)
	 */
	class Repetition {
	  constructor(expr, type) {
	    this.precedence = 3;
	    this.expr = expr;
	    this.type = type;
	  }

	  toString() {
	    return parens(this.expr, this) + this.type;
	  }
	}

	/**
	 * Represents a literal (e.g. a string)
	 */
	class Literal {
	  constructor(value) {
	    this.precedence = 2;
	    this.value = value;
	  }

	  get isEmpty() {
	    return !this.value;
	  }

	  get isSingleCharacter() {
	    return this.value.length === 1;
	  }

	  toString() {
	    return jsesc(this.value).replace(/([\t\n\f\r\$\(\)\*\+\-\.\?\[\]\^\{\|\}])/g, '\\$1');
	  }

	  getCharClass() {
	    if (Array.from(this.value).length === 1) {
	      return this.value;
	    }
	  }

	  getLiteral() {
	    return this.value;
	  }

	  removeSubstring(side, len) {
	    if (side === 'start') {
	      return new Literal(this.value.slice(len));
	    }

	    if (side === 'end') {
	      return new Literal(this.value.slice(0, this.value.length - len));
	    }
	  }
	}

	function parens(exp, parent) {
	  let str = exp.toString();
	  if (exp.precedence < parent.precedence && !exp.isSingleCharacter) {
	    return '(?:' + str + ')';
	  }

	  return str;
	}

	exports.Alternation = Alternation;
	exports.CharClass = CharClass;
	exports.Concatenation = Concatenation;
	exports.Repetition = Repetition;
	exports.Literal = Literal;


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {'use strict';

	const object = {};
	const hasOwnProperty = object.hasOwnProperty;
	const forOwn = function(object, callback) {
		for (const key in object) {
			if (hasOwnProperty.call(object, key)) {
				callback(key, object[key]);
			}
		}
	};

	const extend = function(destination, source) {
		if (!source) {
			return destination;
		}
		forOwn(source, function(key, value) {
			destination[key] = value;
		});
		return destination;
	};

	const forEach = function(array, callback) {
		const length = array.length;
		let index = -1;
		while (++index < length) {
			callback(array[index]);
		}
	};

	const toString = object.toString;
	const isArray = Array.isArray;
	const isBuffer = Buffer.isBuffer;
	const isObject = function(value) {
		// This is a very simple check, but it’s good enough for what we need.
		return toString.call(value) == '[object Object]';
	};
	const isString = function(value) {
		return typeof value == 'string' ||
			toString.call(value) == '[object String]';
	};
	const isNumber = function(value) {
		return typeof value == 'number' ||
			toString.call(value) == '[object Number]';
	};
	const isFunction = function(value) {
		return typeof value == 'function';
	};
	const isMap = function(value) {
		return toString.call(value) == '[object Map]';
	};
	const isSet = function(value) {
		return toString.call(value) == '[object Set]';
	};

	/*--------------------------------------------------------------------------*/

	// https://mathiasbynens.be/notes/javascript-escapes#single
	const singleEscapes = {
		'"': '\\"',
		'\'': '\\\'',
		'\\': '\\\\',
		'\b': '\\b',
		'\f': '\\f',
		'\n': '\\n',
		'\r': '\\r',
		'\t': '\\t'
		// `\v` is omitted intentionally, because in IE < 9, '\v' == 'v'.
		// '\v': '\\x0B'
	};
	const regexSingleEscape = /["'\\\b\f\n\r\t]/;

	const regexDigit = /[0-9]/;
	const regexWhitelist = /[ !#-&\(-\[\]-~]/;

	const jsesc = function(argument, options) {
		const increaseIndentation = function() {
			oldIndent = indent;
			++options.indentLevel;
			indent = options.indent.repeat(options.indentLevel)
		};
		// Handle options
		const defaults = {
			'escapeEverything': false,
			'minimal': false,
			'isScriptContext': false,
			'quotes': 'single',
			'wrap': false,
			'es6': false,
			'json': false,
			'compact': true,
			'lowercaseHex': false,
			'numbers': 'decimal',
			'indent': '\t',
			'indentLevel': 0,
			'__inline1__': false,
			'__inline2__': false
		};
		const json = options && options.json;
		if (json) {
			defaults.quotes = 'double';
			defaults.wrap = true;
		}
		options = extend(defaults, options);
		if (options.quotes != 'single' && options.quotes != 'double') {
			options.quotes = 'single';
		}
		const quote = options.quotes == 'double' ? '"' : '\'';
		const compact = options.compact;
		const lowercaseHex = options.lowercaseHex;
		let indent = options.indent.repeat(options.indentLevel);
		let oldIndent = '';
		const inline1 = options.__inline1__;
		const inline2 = options.__inline2__;
		const newLine = compact ? '' : '\n';
		let result;
		let isEmpty = true;
		const useBinNumbers = options.numbers == 'binary';
		const useOctNumbers = options.numbers == 'octal';
		const useDecNumbers = options.numbers == 'decimal';
		const useHexNumbers = options.numbers == 'hexadecimal';

		if (json && argument && isFunction(argument.toJSON)) {
			argument = argument.toJSON();
		}

		if (!isString(argument)) {
			if (isMap(argument)) {
				if (argument.size == 0) {
					return 'new Map()';
				}
				if (!compact) {
					options.__inline1__ = true;
					options.__inline2__ = false;
				}
				return 'new Map(' + jsesc(Array.from(argument), options) + ')';
			}
			if (isSet(argument)) {
				if (argument.size == 0) {
					return 'new Set()';
				}
				return 'new Set(' + jsesc(Array.from(argument), options) + ')';
			}
			if (isBuffer(argument)) {
				if (argument.length == 0) {
					return 'Buffer()';
				}
				return 'Buffer(' + jsesc(Array.from(argument), options) + ')';
			}
			if (isArray(argument)) {
				result = [];
				options.wrap = true;
				if (inline1) {
					options.__inline1__ = false;
					options.__inline2__ = true;
				}
				if (!inline2) {
					increaseIndentation();
				}
				forEach(argument, function(value) {
					isEmpty = false;
					if (inline2) {
						options.__inline2__ = false;
					}
					result.push(
						(compact || inline2 ? '' : indent) +
						jsesc(value, options)
					);
				});
				if (isEmpty) {
					return '[]';
				}
				if (inline2) {
					return '[' + result.join(', ') + ']';
				}
				return '[' + newLine + result.join(',' + newLine) + newLine +
					(compact ? '' : oldIndent) + ']';
			} else if (isNumber(argument)) {
				if (json) {
					// Some number values (e.g. `Infinity`) cannot be represented in JSON.
					return JSON.stringify(argument);
				}
				if (useDecNumbers) {
					return String(argument);
				}
				if (useHexNumbers) {
					let hexadecimal = argument.toString(16);
					if (!lowercaseHex) {
						hexadecimal = hexadecimal.toUpperCase();
					}
					return '0x' + hexadecimal;
				}
				if (useBinNumbers) {
					return '0b' + argument.toString(2);
				}
				if (useOctNumbers) {
					return '0o' + argument.toString(8);
				}
			} else if (!isObject(argument)) {
				if (json) {
					// For some values (e.g. `undefined`, `function` objects),
					// `JSON.stringify(value)` returns `undefined` (which isn’t valid
					// JSON) instead of `'null'`.
					return JSON.stringify(argument) || 'null';
				}
				return String(argument);
			} else { // it’s an object
				result = [];
				options.wrap = true;
				increaseIndentation();
				forOwn(argument, function(key, value) {
					isEmpty = false;
					result.push(
						(compact ? '' : indent) +
						jsesc(key, options) + ':' +
						(compact ? '' : ' ') +
						jsesc(value, options)
					);
				});
				if (isEmpty) {
					return '{}';
				}
				return '{' + newLine + result.join(',' + newLine) + newLine +
					(compact ? '' : oldIndent) + '}';
			}
		}

		const string = argument;
		// Loop over each code unit in the string and escape it
		let index = -1;
		const length = string.length;
		result = '';
		while (++index < length) {
			const character = string.charAt(index);
			if (options.es6) {
				const first = string.charCodeAt(index);
				if ( // check if it’s the start of a surrogate pair
					first >= 0xD800 && first <= 0xDBFF && // high surrogate
					length > index + 1 // there is a next code unit
				) {
					const second = string.charCodeAt(index + 1);
					if (second >= 0xDC00 && second <= 0xDFFF) { // low surrogate
						// https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
						const codePoint = (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
						let hexadecimal = codePoint.toString(16);
						if (!lowercaseHex) {
							hexadecimal = hexadecimal.toUpperCase();
						}
						result += '\\u{' + hexadecimal + '}';
						++index;
						continue;
					}
				}
			}
			if (!options.escapeEverything) {
				if (regexWhitelist.test(character)) {
					// It’s a printable ASCII character that is not `"`, `'` or `\`,
					// so don’t escape it.
					result += character;
					continue;
				}
				if (character == '"') {
					result += quote == character ? '\\"' : character;
					continue;
				}
				if (character == '\'') {
					result += quote == character ? '\\\'' : character;
					continue;
				}
			}
			if (
				character == '\0' &&
				!json &&
				!regexDigit.test(string.charAt(index + 1))
			) {
				result += '\\0';
				continue;
			}
			if (regexSingleEscape.test(character)) {
				// no need for a `hasOwnProperty` check here
				result += singleEscapes[character];
				continue;
			}
			const charCode = character.charCodeAt(0);
			if (options.minimal && charCode != 0x2028 && charCode != 0x2029) {
				result += character;
				continue;
			}
			let hexadecimal = charCode.toString(16);
			if (!lowercaseHex) {
				hexadecimal = hexadecimal.toUpperCase();
			}
			const longhand = hexadecimal.length > 2 || json;
			const escaped = '\\' + (longhand ? 'u' : 'x') +
				('0000' + hexadecimal).slice(longhand ? -4 : -2);
			result += escaped;
			continue;
		}
		if (options.wrap) {
			result = quote + result + quote;
		}
		if (options.isScriptContext) {
			// https://mathiasbynens.be/notes/etago
			return result
				.replace(/<\/(script|style)/gi, '<\\/$1')
				.replace(/<!--/g, json ? '\\u003C!--' : '\\x3C!--');
		}
		return result;
	};

	jsesc.version = '2.4.0';

	module.exports = jsesc;

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(9).Buffer))

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * @license  MIT
	 */
	/* eslint-disable no-proto */

	'use strict'

	var base64 = __webpack_require__(10)
	var ieee754 = __webpack_require__(11)
	var isArray = __webpack_require__(12)

	exports.Buffer = Buffer
	exports.SlowBuffer = SlowBuffer
	exports.INSPECT_MAX_BYTES = 50

	/**
	 * If `Buffer.TYPED_ARRAY_SUPPORT`:
	 *   === true    Use Uint8Array implementation (fastest)
	 *   === false   Use Object implementation (most compatible, even IE6)
	 *
	 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
	 * Opera 11.6+, iOS 4.2+.
	 *
	 * Due to various browser bugs, sometimes the Object implementation will be used even
	 * when the browser supports typed arrays.
	 *
	 * Note:
	 *
	 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
	 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
	 *
	 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
	 *
	 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
	 *     incorrect length in some situations.

	 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
	 * get the Object implementation, which is slower but behaves correctly.
	 */
	Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
	  ? global.TYPED_ARRAY_SUPPORT
	  : typedArraySupport()

	/*
	 * Export kMaxLength after typed array support is determined.
	 */
	exports.kMaxLength = kMaxLength()

	function typedArraySupport () {
	  try {
	    var arr = new Uint8Array(1)
	    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
	    return arr.foo() === 42 && // typed array instances can be augmented
	        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
	        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
	  } catch (e) {
	    return false
	  }
	}

	function kMaxLength () {
	  return Buffer.TYPED_ARRAY_SUPPORT
	    ? 0x7fffffff
	    : 0x3fffffff
	}

	function createBuffer (that, length) {
	  if (kMaxLength() < length) {
	    throw new RangeError('Invalid typed array length')
	  }
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Return an augmented `Uint8Array` instance, for best performance
	    that = new Uint8Array(length)
	    that.__proto__ = Buffer.prototype
	  } else {
	    // Fallback: Return an object instance of the Buffer class
	    if (that === null) {
	      that = new Buffer(length)
	    }
	    that.length = length
	  }

	  return that
	}

	/**
	 * The Buffer constructor returns instances of `Uint8Array` that have their
	 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
	 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
	 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
	 * returns a single octet.
	 *
	 * The `Uint8Array` prototype remains unmodified.
	 */

	function Buffer (arg, encodingOrOffset, length) {
	  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
	    return new Buffer(arg, encodingOrOffset, length)
	  }

	  // Common case.
	  if (typeof arg === 'number') {
	    if (typeof encodingOrOffset === 'string') {
	      throw new Error(
	        'If encoding is specified then the first argument must be a string'
	      )
	    }
	    return allocUnsafe(this, arg)
	  }
	  return from(this, arg, encodingOrOffset, length)
	}

	Buffer.poolSize = 8192 // not used by this implementation

	// TODO: Legacy, not needed anymore. Remove in next major version.
	Buffer._augment = function (arr) {
	  arr.__proto__ = Buffer.prototype
	  return arr
	}

	function from (that, value, encodingOrOffset, length) {
	  if (typeof value === 'number') {
	    throw new TypeError('"value" argument must not be a number')
	  }

	  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
	    return fromArrayBuffer(that, value, encodingOrOffset, length)
	  }

	  if (typeof value === 'string') {
	    return fromString(that, value, encodingOrOffset)
	  }

	  return fromObject(that, value)
	}

	/**
	 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
	 * if value is a number.
	 * Buffer.from(str[, encoding])
	 * Buffer.from(array)
	 * Buffer.from(buffer)
	 * Buffer.from(arrayBuffer[, byteOffset[, length]])
	 **/
	Buffer.from = function (value, encodingOrOffset, length) {
	  return from(null, value, encodingOrOffset, length)
	}

	if (Buffer.TYPED_ARRAY_SUPPORT) {
	  Buffer.prototype.__proto__ = Uint8Array.prototype
	  Buffer.__proto__ = Uint8Array
	  if (typeof Symbol !== 'undefined' && Symbol.species &&
	      Buffer[Symbol.species] === Buffer) {
	    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
	    Object.defineProperty(Buffer, Symbol.species, {
	      value: null,
	      configurable: true
	    })
	  }
	}

	function assertSize (size) {
	  if (typeof size !== 'number') {
	    throw new TypeError('"size" argument must be a number')
	  } else if (size < 0) {
	    throw new RangeError('"size" argument must not be negative')
	  }
	}

	function alloc (that, size, fill, encoding) {
	  assertSize(size)
	  if (size <= 0) {
	    return createBuffer(that, size)
	  }
	  if (fill !== undefined) {
	    // Only pay attention to encoding if it's a string. This
	    // prevents accidentally sending in a number that would
	    // be interpretted as a start offset.
	    return typeof encoding === 'string'
	      ? createBuffer(that, size).fill(fill, encoding)
	      : createBuffer(that, size).fill(fill)
	  }
	  return createBuffer(that, size)
	}

	/**
	 * Creates a new filled Buffer instance.
	 * alloc(size[, fill[, encoding]])
	 **/
	Buffer.alloc = function (size, fill, encoding) {
	  return alloc(null, size, fill, encoding)
	}

	function allocUnsafe (that, size) {
	  assertSize(size)
	  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) {
	    for (var i = 0; i < size; ++i) {
	      that[i] = 0
	    }
	  }
	  return that
	}

	/**
	 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
	 * */
	Buffer.allocUnsafe = function (size) {
	  return allocUnsafe(null, size)
	}
	/**
	 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
	 */
	Buffer.allocUnsafeSlow = function (size) {
	  return allocUnsafe(null, size)
	}

	function fromString (that, string, encoding) {
	  if (typeof encoding !== 'string' || encoding === '') {
	    encoding = 'utf8'
	  }

	  if (!Buffer.isEncoding(encoding)) {
	    throw new TypeError('"encoding" must be a valid string encoding')
	  }

	  var length = byteLength(string, encoding) | 0
	  that = createBuffer(that, length)

	  var actual = that.write(string, encoding)

	  if (actual !== length) {
	    // Writing a hex string, for example, that contains invalid characters will
	    // cause everything after the first invalid character to be ignored. (e.g.
	    // 'abxxcd' will be treated as 'ab')
	    that = that.slice(0, actual)
	  }

	  return that
	}

	function fromArrayLike (that, array) {
	  var length = array.length < 0 ? 0 : checked(array.length) | 0
	  that = createBuffer(that, length)
	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	function fromArrayBuffer (that, array, byteOffset, length) {
	  array.byteLength // this throws if `array` is not a valid ArrayBuffer

	  if (byteOffset < 0 || array.byteLength < byteOffset) {
	    throw new RangeError('\'offset\' is out of bounds')
	  }

	  if (array.byteLength < byteOffset + (length || 0)) {
	    throw new RangeError('\'length\' is out of bounds')
	  }

	  if (byteOffset === undefined && length === undefined) {
	    array = new Uint8Array(array)
	  } else if (length === undefined) {
	    array = new Uint8Array(array, byteOffset)
	  } else {
	    array = new Uint8Array(array, byteOffset, length)
	  }

	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Return an augmented `Uint8Array` instance, for best performance
	    that = array
	    that.__proto__ = Buffer.prototype
	  } else {
	    // Fallback: Return an object instance of the Buffer class
	    that = fromArrayLike(that, array)
	  }
	  return that
	}

	function fromObject (that, obj) {
	  if (Buffer.isBuffer(obj)) {
	    var len = checked(obj.length) | 0
	    that = createBuffer(that, len)

	    if (that.length === 0) {
	      return that
	    }

	    obj.copy(that, 0, 0, len)
	    return that
	  }

	  if (obj) {
	    if ((typeof ArrayBuffer !== 'undefined' &&
	        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
	      if (typeof obj.length !== 'number' || isnan(obj.length)) {
	        return createBuffer(that, 0)
	      }
	      return fromArrayLike(that, obj)
	    }

	    if (obj.type === 'Buffer' && isArray(obj.data)) {
	      return fromArrayLike(that, obj.data)
	    }
	  }

	  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
	}

	function checked (length) {
	  // Note: cannot use `length < kMaxLength()` here because that fails when
	  // length is NaN (which is otherwise coerced to zero.)
	  if (length >= kMaxLength()) {
	    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
	                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
	  }
	  return length | 0
	}

	function SlowBuffer (length) {
	  if (+length != length) { // eslint-disable-line eqeqeq
	    length = 0
	  }
	  return Buffer.alloc(+length)
	}

	Buffer.isBuffer = function isBuffer (b) {
	  return !!(b != null && b._isBuffer)
	}

	Buffer.compare = function compare (a, b) {
	  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
	    throw new TypeError('Arguments must be Buffers')
	  }

	  if (a === b) return 0

	  var x = a.length
	  var y = b.length

	  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
	    if (a[i] !== b[i]) {
	      x = a[i]
	      y = b[i]
	      break
	    }
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	}

	Buffer.isEncoding = function isEncoding (encoding) {
	  switch (String(encoding).toLowerCase()) {
	    case 'hex':
	    case 'utf8':
	    case 'utf-8':
	    case 'ascii':
	    case 'latin1':
	    case 'binary':
	    case 'base64':
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      return true
	    default:
	      return false
	  }
	}

	Buffer.concat = function concat (list, length) {
	  if (!isArray(list)) {
	    throw new TypeError('"list" argument must be an Array of Buffers')
	  }

	  if (list.length === 0) {
	    return Buffer.alloc(0)
	  }

	  var i
	  if (length === undefined) {
	    length = 0
	    for (i = 0; i < list.length; ++i) {
	      length += list[i].length
	    }
	  }

	  var buffer = Buffer.allocUnsafe(length)
	  var pos = 0
	  for (i = 0; i < list.length; ++i) {
	    var buf = list[i]
	    if (!Buffer.isBuffer(buf)) {
	      throw new TypeError('"list" argument must be an Array of Buffers')
	    }
	    buf.copy(buffer, pos)
	    pos += buf.length
	  }
	  return buffer
	}

	function byteLength (string, encoding) {
	  if (Buffer.isBuffer(string)) {
	    return string.length
	  }
	  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
	      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
	    return string.byteLength
	  }
	  if (typeof string !== 'string') {
	    string = '' + string
	  }

	  var len = string.length
	  if (len === 0) return 0

	  // Use a for loop to avoid recursion
	  var loweredCase = false
	  for (;;) {
	    switch (encoding) {
	      case 'ascii':
	      case 'latin1':
	      case 'binary':
	        return len
	      case 'utf8':
	      case 'utf-8':
	      case undefined:
	        return utf8ToBytes(string).length
	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return len * 2
	      case 'hex':
	        return len >>> 1
	      case 'base64':
	        return base64ToBytes(string).length
	      default:
	        if (loweredCase) return utf8ToBytes(string).length // assume utf8
	        encoding = ('' + encoding).toLowerCase()
	        loweredCase = true
	    }
	  }
	}
	Buffer.byteLength = byteLength

	function slowToString (encoding, start, end) {
	  var loweredCase = false

	  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
	  // property of a typed array.

	  // This behaves neither like String nor Uint8Array in that we set start/end
	  // to their upper/lower bounds if the value passed is out of range.
	  // undefined is handled specially as per ECMA-262 6th Edition,
	  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
	  if (start === undefined || start < 0) {
	    start = 0
	  }
	  // Return early if start > this.length. Done here to prevent potential uint32
	  // coercion fail below.
	  if (start > this.length) {
	    return ''
	  }

	  if (end === undefined || end > this.length) {
	    end = this.length
	  }

	  if (end <= 0) {
	    return ''
	  }

	  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
	  end >>>= 0
	  start >>>= 0

	  if (end <= start) {
	    return ''
	  }

	  if (!encoding) encoding = 'utf8'

	  while (true) {
	    switch (encoding) {
	      case 'hex':
	        return hexSlice(this, start, end)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Slice(this, start, end)

	      case 'ascii':
	        return asciiSlice(this, start, end)

	      case 'latin1':
	      case 'binary':
	        return latin1Slice(this, start, end)

	      case 'base64':
	        return base64Slice(this, start, end)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return utf16leSlice(this, start, end)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = (encoding + '').toLowerCase()
	        loweredCase = true
	    }
	  }
	}

	// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
	// Buffer instances.
	Buffer.prototype._isBuffer = true

	function swap (b, n, m) {
	  var i = b[n]
	  b[n] = b[m]
	  b[m] = i
	}

	Buffer.prototype.swap16 = function swap16 () {
	  var len = this.length
	  if (len % 2 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 16-bits')
	  }
	  for (var i = 0; i < len; i += 2) {
	    swap(this, i, i + 1)
	  }
	  return this
	}

	Buffer.prototype.swap32 = function swap32 () {
	  var len = this.length
	  if (len % 4 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 32-bits')
	  }
	  for (var i = 0; i < len; i += 4) {
	    swap(this, i, i + 3)
	    swap(this, i + 1, i + 2)
	  }
	  return this
	}

	Buffer.prototype.swap64 = function swap64 () {
	  var len = this.length
	  if (len % 8 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 64-bits')
	  }
	  for (var i = 0; i < len; i += 8) {
	    swap(this, i, i + 7)
	    swap(this, i + 1, i + 6)
	    swap(this, i + 2, i + 5)
	    swap(this, i + 3, i + 4)
	  }
	  return this
	}

	Buffer.prototype.toString = function toString () {
	  var length = this.length | 0
	  if (length === 0) return ''
	  if (arguments.length === 0) return utf8Slice(this, 0, length)
	  return slowToString.apply(this, arguments)
	}

	Buffer.prototype.equals = function equals (b) {
	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  if (this === b) return true
	  return Buffer.compare(this, b) === 0
	}

	Buffer.prototype.inspect = function inspect () {
	  var str = ''
	  var max = exports.INSPECT_MAX_BYTES
	  if (this.length > 0) {
	    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
	    if (this.length > max) str += ' ... '
	  }
	  return '<Buffer ' + str + '>'
	}

	Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
	  if (!Buffer.isBuffer(target)) {
	    throw new TypeError('Argument must be a Buffer')
	  }

	  if (start === undefined) {
	    start = 0
	  }
	  if (end === undefined) {
	    end = target ? target.length : 0
	  }
	  if (thisStart === undefined) {
	    thisStart = 0
	  }
	  if (thisEnd === undefined) {
	    thisEnd = this.length
	  }

	  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
	    throw new RangeError('out of range index')
	  }

	  if (thisStart >= thisEnd && start >= end) {
	    return 0
	  }
	  if (thisStart >= thisEnd) {
	    return -1
	  }
	  if (start >= end) {
	    return 1
	  }

	  start >>>= 0
	  end >>>= 0
	  thisStart >>>= 0
	  thisEnd >>>= 0

	  if (this === target) return 0

	  var x = thisEnd - thisStart
	  var y = end - start
	  var len = Math.min(x, y)

	  var thisCopy = this.slice(thisStart, thisEnd)
	  var targetCopy = target.slice(start, end)

	  for (var i = 0; i < len; ++i) {
	    if (thisCopy[i] !== targetCopy[i]) {
	      x = thisCopy[i]
	      y = targetCopy[i]
	      break
	    }
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	}

	// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
	// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
	//
	// Arguments:
	// - buffer - a Buffer to search
	// - val - a string, Buffer, or number
	// - byteOffset - an index into `buffer`; will be clamped to an int32
	// - encoding - an optional encoding, relevant is val is a string
	// - dir - true for indexOf, false for lastIndexOf
	function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
	  // Empty buffer means no match
	  if (buffer.length === 0) return -1

	  // Normalize byteOffset
	  if (typeof byteOffset === 'string') {
	    encoding = byteOffset
	    byteOffset = 0
	  } else if (byteOffset > 0x7fffffff) {
	    byteOffset = 0x7fffffff
	  } else if (byteOffset < -0x80000000) {
	    byteOffset = -0x80000000
	  }
	  byteOffset = +byteOffset  // Coerce to Number.
	  if (isNaN(byteOffset)) {
	    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
	    byteOffset = dir ? 0 : (buffer.length - 1)
	  }

	  // Normalize byteOffset: negative offsets start from the end of the buffer
	  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
	  if (byteOffset >= buffer.length) {
	    if (dir) return -1
	    else byteOffset = buffer.length - 1
	  } else if (byteOffset < 0) {
	    if (dir) byteOffset = 0
	    else return -1
	  }

	  // Normalize val
	  if (typeof val === 'string') {
	    val = Buffer.from(val, encoding)
	  }

	  // Finally, search either indexOf (if dir is true) or lastIndexOf
	  if (Buffer.isBuffer(val)) {
	    // Special case: looking for empty string/buffer always fails
	    if (val.length === 0) {
	      return -1
	    }
	    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
	  } else if (typeof val === 'number') {
	    val = val & 0xFF // Search for a byte value [0-255]
	    if (Buffer.TYPED_ARRAY_SUPPORT &&
	        typeof Uint8Array.prototype.indexOf === 'function') {
	      if (dir) {
	        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
	      } else {
	        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
	      }
	    }
	    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
	  }

	  throw new TypeError('val must be string, number or Buffer')
	}

	function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
	  var indexSize = 1
	  var arrLength = arr.length
	  var valLength = val.length

	  if (encoding !== undefined) {
	    encoding = String(encoding).toLowerCase()
	    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
	        encoding === 'utf16le' || encoding === 'utf-16le') {
	      if (arr.length < 2 || val.length < 2) {
	        return -1
	      }
	      indexSize = 2
	      arrLength /= 2
	      valLength /= 2
	      byteOffset /= 2
	    }
	  }

	  function read (buf, i) {
	    if (indexSize === 1) {
	      return buf[i]
	    } else {
	      return buf.readUInt16BE(i * indexSize)
	    }
	  }

	  var i
	  if (dir) {
	    var foundIndex = -1
	    for (i = byteOffset; i < arrLength; i++) {
	      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
	        if (foundIndex === -1) foundIndex = i
	        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
	      } else {
	        if (foundIndex !== -1) i -= i - foundIndex
	        foundIndex = -1
	      }
	    }
	  } else {
	    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
	    for (i = byteOffset; i >= 0; i--) {
	      var found = true
	      for (var j = 0; j < valLength; j++) {
	        if (read(arr, i + j) !== read(val, j)) {
	          found = false
	          break
	        }
	      }
	      if (found) return i
	    }
	  }

	  return -1
	}

	Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
	  return this.indexOf(val, byteOffset, encoding) !== -1
	}

	Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
	  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
	}

	Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
	  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
	}

	function hexWrite (buf, string, offset, length) {
	  offset = Number(offset) || 0
	  var remaining = buf.length - offset
	  if (!length) {
	    length = remaining
	  } else {
	    length = Number(length)
	    if (length > remaining) {
	      length = remaining
	    }
	  }

	  // must be an even number of digits
	  var strLen = string.length
	  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

	  if (length > strLen / 2) {
	    length = strLen / 2
	  }
	  for (var i = 0; i < length; ++i) {
	    var parsed = parseInt(string.substr(i * 2, 2), 16)
	    if (isNaN(parsed)) return i
	    buf[offset + i] = parsed
	  }
	  return i
	}

	function utf8Write (buf, string, offset, length) {
	  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
	}

	function asciiWrite (buf, string, offset, length) {
	  return blitBuffer(asciiToBytes(string), buf, offset, length)
	}

	function latin1Write (buf, string, offset, length) {
	  return asciiWrite(buf, string, offset, length)
	}

	function base64Write (buf, string, offset, length) {
	  return blitBuffer(base64ToBytes(string), buf, offset, length)
	}

	function ucs2Write (buf, string, offset, length) {
	  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
	}

	Buffer.prototype.write = function write (string, offset, length, encoding) {
	  // Buffer#write(string)
	  if (offset === undefined) {
	    encoding = 'utf8'
	    length = this.length
	    offset = 0
	  // Buffer#write(string, encoding)
	  } else if (length === undefined && typeof offset === 'string') {
	    encoding = offset
	    length = this.length
	    offset = 0
	  // Buffer#write(string, offset[, length][, encoding])
	  } else if (isFinite(offset)) {
	    offset = offset | 0
	    if (isFinite(length)) {
	      length = length | 0
	      if (encoding === undefined) encoding = 'utf8'
	    } else {
	      encoding = length
	      length = undefined
	    }
	  // legacy write(string, encoding, offset, length) - remove in v0.13
	  } else {
	    throw new Error(
	      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
	    )
	  }

	  var remaining = this.length - offset
	  if (length === undefined || length > remaining) length = remaining

	  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
	    throw new RangeError('Attempt to write outside buffer bounds')
	  }

	  if (!encoding) encoding = 'utf8'

	  var loweredCase = false
	  for (;;) {
	    switch (encoding) {
	      case 'hex':
	        return hexWrite(this, string, offset, length)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Write(this, string, offset, length)

	      case 'ascii':
	        return asciiWrite(this, string, offset, length)

	      case 'latin1':
	      case 'binary':
	        return latin1Write(this, string, offset, length)

	      case 'base64':
	        // Warning: maxLength not taken into account in base64Write
	        return base64Write(this, string, offset, length)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return ucs2Write(this, string, offset, length)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = ('' + encoding).toLowerCase()
	        loweredCase = true
	    }
	  }
	}

	Buffer.prototype.toJSON = function toJSON () {
	  return {
	    type: 'Buffer',
	    data: Array.prototype.slice.call(this._arr || this, 0)
	  }
	}

	function base64Slice (buf, start, end) {
	  if (start === 0 && end === buf.length) {
	    return base64.fromByteArray(buf)
	  } else {
	    return base64.fromByteArray(buf.slice(start, end))
	  }
	}

	function utf8Slice (buf, start, end) {
	  end = Math.min(buf.length, end)
	  var res = []

	  var i = start
	  while (i < end) {
	    var firstByte = buf[i]
	    var codePoint = null
	    var bytesPerSequence = (firstByte > 0xEF) ? 4
	      : (firstByte > 0xDF) ? 3
	      : (firstByte > 0xBF) ? 2
	      : 1

	    if (i + bytesPerSequence <= end) {
	      var secondByte, thirdByte, fourthByte, tempCodePoint

	      switch (bytesPerSequence) {
	        case 1:
	          if (firstByte < 0x80) {
	            codePoint = firstByte
	          }
	          break
	        case 2:
	          secondByte = buf[i + 1]
	          if ((secondByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
	            if (tempCodePoint > 0x7F) {
	              codePoint = tempCodePoint
	            }
	          }
	          break
	        case 3:
	          secondByte = buf[i + 1]
	          thirdByte = buf[i + 2]
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
	            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
	              codePoint = tempCodePoint
	            }
	          }
	          break
	        case 4:
	          secondByte = buf[i + 1]
	          thirdByte = buf[i + 2]
	          fourthByte = buf[i + 3]
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
	            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
	              codePoint = tempCodePoint
	            }
	          }
	      }
	    }

	    if (codePoint === null) {
	      // we did not generate a valid codePoint so insert a
	      // replacement char (U+FFFD) and advance only 1 byte
	      codePoint = 0xFFFD
	      bytesPerSequence = 1
	    } else if (codePoint > 0xFFFF) {
	      // encode to utf16 (surrogate pair dance)
	      codePoint -= 0x10000
	      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
	      codePoint = 0xDC00 | codePoint & 0x3FF
	    }

	    res.push(codePoint)
	    i += bytesPerSequence
	  }

	  return decodeCodePointsArray(res)
	}

	// Based on http://stackoverflow.com/a/22747272/680742, the browser with
	// the lowest limit is Chrome, with 0x10000 args.
	// We go 1 magnitude less, for safety
	var MAX_ARGUMENTS_LENGTH = 0x1000

	function decodeCodePointsArray (codePoints) {
	  var len = codePoints.length
	  if (len <= MAX_ARGUMENTS_LENGTH) {
	    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
	  }

	  // Decode in chunks to avoid "call stack size exceeded".
	  var res = ''
	  var i = 0
	  while (i < len) {
	    res += String.fromCharCode.apply(
	      String,
	      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
	    )
	  }
	  return res
	}

	function asciiSlice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; ++i) {
	    ret += String.fromCharCode(buf[i] & 0x7F)
	  }
	  return ret
	}

	function latin1Slice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; ++i) {
	    ret += String.fromCharCode(buf[i])
	  }
	  return ret
	}

	function hexSlice (buf, start, end) {
	  var len = buf.length

	  if (!start || start < 0) start = 0
	  if (!end || end < 0 || end > len) end = len

	  var out = ''
	  for (var i = start; i < end; ++i) {
	    out += toHex(buf[i])
	  }
	  return out
	}

	function utf16leSlice (buf, start, end) {
	  var bytes = buf.slice(start, end)
	  var res = ''
	  for (var i = 0; i < bytes.length; i += 2) {
	    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
	  }
	  return res
	}

	Buffer.prototype.slice = function slice (start, end) {
	  var len = this.length
	  start = ~~start
	  end = end === undefined ? len : ~~end

	  if (start < 0) {
	    start += len
	    if (start < 0) start = 0
	  } else if (start > len) {
	    start = len
	  }

	  if (end < 0) {
	    end += len
	    if (end < 0) end = 0
	  } else if (end > len) {
	    end = len
	  }

	  if (end < start) end = start

	  var newBuf
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    newBuf = this.subarray(start, end)
	    newBuf.__proto__ = Buffer.prototype
	  } else {
	    var sliceLen = end - start
	    newBuf = new Buffer(sliceLen, undefined)
	    for (var i = 0; i < sliceLen; ++i) {
	      newBuf[i] = this[i + start]
	    }
	  }

	  return newBuf
	}

	/*
	 * Need to make sure that buffer isn't trying to write out of bounds.
	 */
	function checkOffset (offset, ext, length) {
	  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
	  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
	}

	Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var val = this[offset]
	  var mul = 1
	  var i = 0
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul
	  }

	  return val
	}

	Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) {
	    checkOffset(offset, byteLength, this.length)
	  }

	  var val = this[offset + --byteLength]
	  var mul = 1
	  while (byteLength > 0 && (mul *= 0x100)) {
	    val += this[offset + --byteLength] * mul
	  }

	  return val
	}

	Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 1, this.length)
	  return this[offset]
	}

	Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  return this[offset] | (this[offset + 1] << 8)
	}

	Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  return (this[offset] << 8) | this[offset + 1]
	}

	Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return ((this[offset]) |
	      (this[offset + 1] << 8) |
	      (this[offset + 2] << 16)) +
	      (this[offset + 3] * 0x1000000)
	}

	Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset] * 0x1000000) +
	    ((this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    this[offset + 3])
	}

	Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var val = this[offset]
	  var mul = 1
	  var i = 0
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul
	  }
	  mul *= 0x80

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

	  return val
	}

	Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var i = byteLength
	  var mul = 1
	  var val = this[offset + --i]
	  while (i > 0 && (mul *= 0x100)) {
	    val += this[offset + --i] * mul
	  }
	  mul *= 0x80

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

	  return val
	}

	Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 1, this.length)
	  if (!(this[offset] & 0x80)) return (this[offset])
	  return ((0xff - this[offset] + 1) * -1)
	}

	Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  var val = this[offset] | (this[offset + 1] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  var val = this[offset + 1] | (this[offset] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset]) |
	    (this[offset + 1] << 8) |
	    (this[offset + 2] << 16) |
	    (this[offset + 3] << 24)
	}

	Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset] << 24) |
	    (this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    (this[offset + 3])
	}

	Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, true, 23, 4)
	}

	Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, false, 23, 4)
	}

	Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, true, 52, 8)
	}

	Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, false, 52, 8)
	}

	function checkInt (buf, value, offset, ext, max, min) {
	  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
	  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
	  if (offset + ext > buf.length) throw new RangeError('Index out of range')
	}

	Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) {
	    var maxBytes = Math.pow(2, 8 * byteLength) - 1
	    checkInt(this, value, offset, byteLength, maxBytes, 0)
	  }

	  var mul = 1
	  var i = 0
	  this[offset] = value & 0xFF
	  while (++i < byteLength && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) {
	    var maxBytes = Math.pow(2, 8 * byteLength) - 1
	    checkInt(this, value, offset, byteLength, maxBytes, 0)
	  }

	  var i = byteLength - 1
	  var mul = 1
	  this[offset + i] = value & 0xFF
	  while (--i >= 0 && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  this[offset] = (value & 0xff)
	  return offset + 1
	}

	function objectWriteUInt16 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
	    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
	      (littleEndian ? i : 1 - i) * 8
	  }
	}

	Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	  } else {
	    objectWriteUInt16(this, value, offset, true)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = (value & 0xff)
	  } else {
	    objectWriteUInt16(this, value, offset, false)
	  }
	  return offset + 2
	}

	function objectWriteUInt32 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffffffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
	    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
	  }
	}

	Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset + 3] = (value >>> 24)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 1] = (value >>> 8)
	    this[offset] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, true)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, false)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) {
	    var limit = Math.pow(2, 8 * byteLength - 1)

	    checkInt(this, value, offset, byteLength, limit - 1, -limit)
	  }

	  var i = 0
	  var mul = 1
	  var sub = 0
	  this[offset] = value & 0xFF
	  while (++i < byteLength && (mul *= 0x100)) {
	    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
	      sub = 1
	    }
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) {
	    var limit = Math.pow(2, 8 * byteLength - 1)

	    checkInt(this, value, offset, byteLength, limit - 1, -limit)
	  }

	  var i = byteLength - 1
	  var mul = 1
	  var sub = 0
	  this[offset + i] = value & 0xFF
	  while (--i >= 0 && (mul *= 0x100)) {
	    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
	      sub = 1
	    }
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  if (value < 0) value = 0xff + value + 1
	  this[offset] = (value & 0xff)
	  return offset + 1
	}

	Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	  } else {
	    objectWriteUInt16(this, value, offset, true)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = (value & 0xff)
	  } else {
	    objectWriteUInt16(this, value, offset, false)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 3] = (value >>> 24)
	  } else {
	    objectWriteUInt32(this, value, offset, true)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (value < 0) value = 0xffffffff + value + 1
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, false)
	  }
	  return offset + 4
	}

	function checkIEEE754 (buf, value, offset, ext, max, min) {
	  if (offset + ext > buf.length) throw new RangeError('Index out of range')
	  if (offset < 0) throw new RangeError('Index out of range')
	}

	function writeFloat (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
	  }
	  ieee754.write(buf, value, offset, littleEndian, 23, 4)
	  return offset + 4
	}

	Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, false, noAssert)
	}

	function writeDouble (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
	  }
	  ieee754.write(buf, value, offset, littleEndian, 52, 8)
	  return offset + 8
	}

	Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, false, noAssert)
	}

	// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
	Buffer.prototype.copy = function copy (target, targetStart, start, end) {
	  if (!start) start = 0
	  if (!end && end !== 0) end = this.length
	  if (targetStart >= target.length) targetStart = target.length
	  if (!targetStart) targetStart = 0
	  if (end > 0 && end < start) end = start

	  // Copy 0 bytes; we're done
	  if (end === start) return 0
	  if (target.length === 0 || this.length === 0) return 0

	  // Fatal error conditions
	  if (targetStart < 0) {
	    throw new RangeError('targetStart out of bounds')
	  }
	  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
	  if (end < 0) throw new RangeError('sourceEnd out of bounds')

	  // Are we oob?
	  if (end > this.length) end = this.length
	  if (target.length - targetStart < end - start) {
	    end = target.length - targetStart + start
	  }

	  var len = end - start
	  var i

	  if (this === target && start < targetStart && targetStart < end) {
	    // descending copy from end
	    for (i = len - 1; i >= 0; --i) {
	      target[i + targetStart] = this[i + start]
	    }
	  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
	    // ascending copy from start
	    for (i = 0; i < len; ++i) {
	      target[i + targetStart] = this[i + start]
	    }
	  } else {
	    Uint8Array.prototype.set.call(
	      target,
	      this.subarray(start, start + len),
	      targetStart
	    )
	  }

	  return len
	}

	// Usage:
	//    buffer.fill(number[, offset[, end]])
	//    buffer.fill(buffer[, offset[, end]])
	//    buffer.fill(string[, offset[, end]][, encoding])
	Buffer.prototype.fill = function fill (val, start, end, encoding) {
	  // Handle string cases:
	  if (typeof val === 'string') {
	    if (typeof start === 'string') {
	      encoding = start
	      start = 0
	      end = this.length
	    } else if (typeof end === 'string') {
	      encoding = end
	      end = this.length
	    }
	    if (val.length === 1) {
	      var code = val.charCodeAt(0)
	      if (code < 256) {
	        val = code
	      }
	    }
	    if (encoding !== undefined && typeof encoding !== 'string') {
	      throw new TypeError('encoding must be a string')
	    }
	    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
	      throw new TypeError('Unknown encoding: ' + encoding)
	    }
	  } else if (typeof val === 'number') {
	    val = val & 255
	  }

	  // Invalid ranges are not set to a default, so can range check early.
	  if (start < 0 || this.length < start || this.length < end) {
	    throw new RangeError('Out of range index')
	  }

	  if (end <= start) {
	    return this
	  }

	  start = start >>> 0
	  end = end === undefined ? this.length : end >>> 0

	  if (!val) val = 0

	  var i
	  if (typeof val === 'number') {
	    for (i = start; i < end; ++i) {
	      this[i] = val
	    }
	  } else {
	    var bytes = Buffer.isBuffer(val)
	      ? val
	      : utf8ToBytes(new Buffer(val, encoding).toString())
	    var len = bytes.length
	    for (i = 0; i < end - start; ++i) {
	      this[i + start] = bytes[i % len]
	    }
	  }

	  return this
	}

	// HELPER FUNCTIONS
	// ================

	var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

	function base64clean (str) {
	  // Node strips out invalid characters like \n and \t from the string, base64-js does not
	  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
	  // Node converts strings with length < 2 to ''
	  if (str.length < 2) return ''
	  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
	  while (str.length % 4 !== 0) {
	    str = str + '='
	  }
	  return str
	}

	function stringtrim (str) {
	  if (str.trim) return str.trim()
	  return str.replace(/^\s+|\s+$/g, '')
	}

	function toHex (n) {
	  if (n < 16) return '0' + n.toString(16)
	  return n.toString(16)
	}

	function utf8ToBytes (string, units) {
	  units = units || Infinity
	  var codePoint
	  var length = string.length
	  var leadSurrogate = null
	  var bytes = []

	  for (var i = 0; i < length; ++i) {
	    codePoint = string.charCodeAt(i)

	    // is surrogate component
	    if (codePoint > 0xD7FF && codePoint < 0xE000) {
	      // last char was a lead
	      if (!leadSurrogate) {
	        // no lead yet
	        if (codePoint > 0xDBFF) {
	          // unexpected trail
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	          continue
	        } else if (i + 1 === length) {
	          // unpaired lead
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	          continue
	        }

	        // valid lead
	        leadSurrogate = codePoint

	        continue
	      }

	      // 2 leads in a row
	      if (codePoint < 0xDC00) {
	        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	        leadSurrogate = codePoint
	        continue
	      }

	      // valid surrogate pair
	      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
	    } else if (leadSurrogate) {
	      // valid bmp char, but last char was a lead
	      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	    }

	    leadSurrogate = null

	    // encode utf8
	    if (codePoint < 0x80) {
	      if ((units -= 1) < 0) break
	      bytes.push(codePoint)
	    } else if (codePoint < 0x800) {
	      if ((units -= 2) < 0) break
	      bytes.push(
	        codePoint >> 0x6 | 0xC0,
	        codePoint & 0x3F | 0x80
	      )
	    } else if (codePoint < 0x10000) {
	      if ((units -= 3) < 0) break
	      bytes.push(
	        codePoint >> 0xC | 0xE0,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      )
	    } else if (codePoint < 0x110000) {
	      if ((units -= 4) < 0) break
	      bytes.push(
	        codePoint >> 0x12 | 0xF0,
	        codePoint >> 0xC & 0x3F | 0x80,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      )
	    } else {
	      throw new Error('Invalid code point')
	    }
	  }

	  return bytes
	}

	function asciiToBytes (str) {
	  var byteArray = []
	  for (var i = 0; i < str.length; ++i) {
	    // Node's code seems to be doing this and not & 0x7F..
	    byteArray.push(str.charCodeAt(i) & 0xFF)
	  }
	  return byteArray
	}

	function utf16leToBytes (str, units) {
	  var c, hi, lo
	  var byteArray = []
	  for (var i = 0; i < str.length; ++i) {
	    if ((units -= 2) < 0) break

	    c = str.charCodeAt(i)
	    hi = c >> 8
	    lo = c % 256
	    byteArray.push(lo)
	    byteArray.push(hi)
	  }

	  return byteArray
	}

	function base64ToBytes (str) {
	  return base64.toByteArray(base64clean(str))
	}

	function blitBuffer (src, dst, offset, length) {
	  for (var i = 0; i < length; ++i) {
	    if ((i + offset >= dst.length) || (i >= src.length)) break
	    dst[i + offset] = src[i]
	  }
	  return i
	}

	function isnan (val) {
	  return val !== val // eslint-disable-line no-self-compare
	}

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 10 */
/***/ function(module, exports) {

	'use strict'

	exports.byteLength = byteLength
	exports.toByteArray = toByteArray
	exports.fromByteArray = fromByteArray

	var lookup = []
	var revLookup = []
	var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

	var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
	for (var i = 0, len = code.length; i < len; ++i) {
	  lookup[i] = code[i]
	  revLookup[code.charCodeAt(i)] = i
	}

	revLookup['-'.charCodeAt(0)] = 62
	revLookup['_'.charCodeAt(0)] = 63

	function placeHoldersCount (b64) {
	  var len = b64.length
	  if (len % 4 > 0) {
	    throw new Error('Invalid string. Length must be a multiple of 4')
	  }

	  // the number of equal signs (place holders)
	  // if there are two placeholders, than the two characters before it
	  // represent one byte
	  // if there is only one, then the three characters before it represent 2 bytes
	  // this is just a cheap hack to not do indexOf twice
	  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
	}

	function byteLength (b64) {
	  // base64 is 4/3 + up to two characters of the original data
	  return b64.length * 3 / 4 - placeHoldersCount(b64)
	}

	function toByteArray (b64) {
	  var i, j, l, tmp, placeHolders, arr
	  var len = b64.length
	  placeHolders = placeHoldersCount(b64)

	  arr = new Arr(len * 3 / 4 - placeHolders)

	  // if there are placeholders, only get up to the last complete 4 chars
	  l = placeHolders > 0 ? len - 4 : len

	  var L = 0

	  for (i = 0, j = 0; i < l; i += 4, j += 3) {
	    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
	    arr[L++] = (tmp >> 16) & 0xFF
	    arr[L++] = (tmp >> 8) & 0xFF
	    arr[L++] = tmp & 0xFF
	  }

	  if (placeHolders === 2) {
	    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
	    arr[L++] = tmp & 0xFF
	  } else if (placeHolders === 1) {
	    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
	    arr[L++] = (tmp >> 8) & 0xFF
	    arr[L++] = tmp & 0xFF
	  }

	  return arr
	}

	function tripletToBase64 (num) {
	  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
	}

	function encodeChunk (uint8, start, end) {
	  var tmp
	  var output = []
	  for (var i = start; i < end; i += 3) {
	    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
	    output.push(tripletToBase64(tmp))
	  }
	  return output.join('')
	}

	function fromByteArray (uint8) {
	  var tmp
	  var len = uint8.length
	  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
	  var output = ''
	  var parts = []
	  var maxChunkLength = 16383 // must be multiple of 3

	  // go through the array every three bytes, we'll deal with trailing stuff later
	  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
	    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
	  }

	  // pad the end with zeros, but make sure to not forget the extra bytes
	  if (extraBytes === 1) {
	    tmp = uint8[len - 1]
	    output += lookup[tmp >> 2]
	    output += lookup[(tmp << 4) & 0x3F]
	    output += '=='
	  } else if (extraBytes === 2) {
	    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
	    output += lookup[tmp >> 10]
	    output += lookup[(tmp >> 4) & 0x3F]
	    output += lookup[(tmp << 2) & 0x3F]
	    output += '='
	  }

	  parts.push(output)

	  return parts.join('')
	}


/***/ },
/* 11 */
/***/ function(module, exports) {

	exports.read = function (buffer, offset, isLE, mLen, nBytes) {
	  var e, m
	  var eLen = nBytes * 8 - mLen - 1
	  var eMax = (1 << eLen) - 1
	  var eBias = eMax >> 1
	  var nBits = -7
	  var i = isLE ? (nBytes - 1) : 0
	  var d = isLE ? -1 : 1
	  var s = buffer[offset + i]

	  i += d

	  e = s & ((1 << (-nBits)) - 1)
	  s >>= (-nBits)
	  nBits += eLen
	  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  m = e & ((1 << (-nBits)) - 1)
	  e >>= (-nBits)
	  nBits += mLen
	  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  if (e === 0) {
	    e = 1 - eBias
	  } else if (e === eMax) {
	    return m ? NaN : ((s ? -1 : 1) * Infinity)
	  } else {
	    m = m + Math.pow(2, mLen)
	    e = e - eBias
	  }
	  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
	}

	exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
	  var e, m, c
	  var eLen = nBytes * 8 - mLen - 1
	  var eMax = (1 << eLen) - 1
	  var eBias = eMax >> 1
	  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
	  var i = isLE ? 0 : (nBytes - 1)
	  var d = isLE ? 1 : -1
	  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

	  value = Math.abs(value)

	  if (isNaN(value) || value === Infinity) {
	    m = isNaN(value) ? 1 : 0
	    e = eMax
	  } else {
	    e = Math.floor(Math.log(value) / Math.LN2)
	    if (value * (c = Math.pow(2, -e)) < 1) {
	      e--
	      c *= 2
	    }
	    if (e + eBias >= 1) {
	      value += rt / c
	    } else {
	      value += rt * Math.pow(2, 1 - eBias)
	    }
	    if (value * c >= 2) {
	      e++
	      c /= 2
	    }

	    if (e + eBias >= eMax) {
	      m = 0
	      e = eMax
	    } else if (e + eBias >= 1) {
	      m = (value * c - 1) * Math.pow(2, mLen)
	      e = e + eBias
	    } else {
	      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
	      e = 0
	    }
	  }

	  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

	  e = (e << mLen) | m
	  eLen += mLen
	  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

	  buffer[offset + i - d] |= s * 128
	}


/***/ },
/* 12 */
/***/ function(module, exports) {

	var toString = {}.toString;

	module.exports = Array.isArray || function (arr) {
	  return toString.call(arr) == '[object Array]';
	};


/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(module, global) {/*! https://mths.be/regenerate v1.3.2 by @mathias | MIT license */
	;(function(root) {

		// Detect free variables `exports`.
		var freeExports = typeof exports == 'object' && exports;

		// Detect free variable `module`.
		var freeModule = typeof module == 'object' && module &&
			module.exports == freeExports && module;

		// Detect free variable `global`, from Node.js/io.js or Browserified code,
		// and use it as `root`.
		var freeGlobal = typeof global == 'object' && global;
		if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
			root = freeGlobal;
		}

		/*--------------------------------------------------------------------------*/

		var ERRORS = {
			'rangeOrder': 'A range\u2019s `stop` value must be greater than or equal ' +
				'to the `start` value.',
			'codePointRange': 'Invalid code point value. Code points range from ' +
				'U+000000 to U+10FFFF.'
		};

		// https://mathiasbynens.be/notes/javascript-encoding#surrogate-pairs
		var HIGH_SURROGATE_MIN = 0xD800;
		var HIGH_SURROGATE_MAX = 0xDBFF;
		var LOW_SURROGATE_MIN = 0xDC00;
		var LOW_SURROGATE_MAX = 0xDFFF;

		// In Regenerate output, `\0` is never preceded by `\` because we sort by
		// code point value, so let’s keep this regular expression simple.
		var regexNull = /\\x00([^0123456789]|$)/g;

		var object = {};
		var hasOwnProperty = object.hasOwnProperty;
		var extend = function(destination, source) {
			var key;
			for (key in source) {
				if (hasOwnProperty.call(source, key)) {
					destination[key] = source[key];
				}
			}
			return destination;
		};

		var forEach = function(array, callback) {
			var index = -1;
			var length = array.length;
			while (++index < length) {
				callback(array[index], index);
			}
		};

		var toString = object.toString;
		var isArray = function(value) {
			return toString.call(value) == '[object Array]';
		};
		var isNumber = function(value) {
			return typeof value == 'number' ||
				toString.call(value) == '[object Number]';
		};

		// This assumes that `number` is a positive integer that `toString()`s nicely
		// (which is the case for all code point values).
		var zeroes = '0000';
		var pad = function(number, totalCharacters) {
			var string = String(number);
			return string.length < totalCharacters
				? (zeroes + string).slice(-totalCharacters)
				: string;
		};

		var hex = function(number) {
			return Number(number).toString(16).toUpperCase();
		};

		var slice = [].slice;

		/*--------------------------------------------------------------------------*/

		var dataFromCodePoints = function(codePoints) {
			var index = -1;
			var length = codePoints.length;
			var max = length - 1;
			var result = [];
			var isStart = true;
			var tmp;
			var previous = 0;
			while (++index < length) {
				tmp = codePoints[index];
				if (isStart) {
					result.push(tmp);
					previous = tmp;
					isStart = false;
				} else {
					if (tmp == previous + 1) {
						if (index != max) {
							previous = tmp;
							continue;
						} else {
							isStart = true;
							result.push(tmp + 1);
						}
					} else {
						// End the previous range and start a new one.
						result.push(previous + 1, tmp);
						previous = tmp;
					}
				}
			}
			if (!isStart) {
				result.push(tmp + 1);
			}
			return result;
		};

		var dataRemove = function(data, codePoint) {
			// Iterate over the data per `(start, end)` pair.
			var index = 0;
			var start;
			var end;
			var length = data.length;
			while (index < length) {
				start = data[index];
				end = data[index + 1];
				if (codePoint >= start && codePoint < end) {
					// Modify this pair.
					if (codePoint == start) {
						if (end == start + 1) {
							// Just remove `start` and `end`.
							data.splice(index, 2);
							return data;
						} else {
							// Just replace `start` with a new value.
							data[index] = codePoint + 1;
							return data;
						}
					} else if (codePoint == end - 1) {
						// Just replace `end` with a new value.
						data[index + 1] = codePoint;
						return data;
					} else {
						// Replace `[start, end]` with `[startA, endA, startB, endB]`.
						data.splice(index, 2, start, codePoint, codePoint + 1, end);
						return data;
					}
				}
				index += 2;
			}
			return data;
		};

		var dataRemoveRange = function(data, rangeStart, rangeEnd) {
			if (rangeEnd < rangeStart) {
				throw Error(ERRORS.rangeOrder);
			}
			// Iterate over the data per `(start, end)` pair.
			var index = 0;
			var start;
			var end;
			while (index < data.length) {
				start = data[index];
				end = data[index + 1] - 1; // Note: the `- 1` makes `end` inclusive.

				// Exit as soon as no more matching pairs can be found.
				if (start > rangeEnd) {
					return data;
				}

				// Check if this range pair is equal to, or forms a subset of, the range
				// to be removed.
				// E.g. we have `[0, 11, 40, 51]` and want to remove 0-10 → `[40, 51]`.
				// E.g. we have `[40, 51]` and want to remove 0-100 → `[]`.
				if (rangeStart <= start && rangeEnd >= end) {
					// Remove this pair.
					data.splice(index, 2);
					continue;
				}

				// Check if both `rangeStart` and `rangeEnd` are within the bounds of
				// this pair.
				// E.g. we have `[0, 11]` and want to remove 4-6 → `[0, 4, 7, 11]`.
				if (rangeStart >= start && rangeEnd < end) {
					if (rangeStart == start) {
						// Replace `[start, end]` with `[startB, endB]`.
						data[index] = rangeEnd + 1;
						data[index + 1] = end + 1;
						return data;
					}
					// Replace `[start, end]` with `[startA, endA, startB, endB]`.
					data.splice(index, 2, start, rangeStart, rangeEnd + 1, end + 1);
					return data;
				}

				// Check if only `rangeStart` is within the bounds of this pair.
				// E.g. we have `[0, 11]` and want to remove 4-20 → `[0, 4]`.
				if (rangeStart >= start && rangeStart <= end) {
					// Replace `end` with `rangeStart`.
					data[index + 1] = rangeStart;
					// Note: we cannot `return` just yet, in case any following pairs still
					// contain matching code points.
					// E.g. we have `[0, 11, 14, 31]` and want to remove 4-20
					// → `[0, 4, 21, 31]`.
				}

				// Check if only `rangeEnd` is within the bounds of this pair.
				// E.g. we have `[14, 31]` and want to remove 4-20 → `[21, 31]`.
				else if (rangeEnd >= start && rangeEnd <= end) {
					// Just replace `start`.
					data[index] = rangeEnd + 1;
					return data;
				}

				index += 2;
			}
			return data;
		};

		 var dataAdd = function(data, codePoint) {
			// Iterate over the data per `(start, end)` pair.
			var index = 0;
			var start;
			var end;
			var lastIndex = null;
			var length = data.length;
			if (codePoint < 0x0 || codePoint > 0x10FFFF) {
				throw RangeError(ERRORS.codePointRange);
			}
			while (index < length) {
				start = data[index];
				end = data[index + 1];

				// Check if the code point is already in the set.
				if (codePoint >= start && codePoint < end) {
					return data;
				}

				if (codePoint == start - 1) {
					// Just replace `start` with a new value.
					data[index] = codePoint;
					return data;
				}

				// At this point, if `start` is `greater` than `codePoint`, insert a new
				// `[start, end]` pair before the current pair, or after the current pair
				// if there is a known `lastIndex`.
				if (start > codePoint) {
					data.splice(
						lastIndex != null ? lastIndex + 2 : 0,
						0,
						codePoint,
						codePoint + 1
					);
					return data;
				}

				if (codePoint == end) {
					// Check if adding this code point causes two separate ranges to become
					// a single range, e.g. `dataAdd([0, 4, 5, 10], 4)` → `[0, 10]`.
					if (codePoint + 1 == data[index + 2]) {
						data.splice(index, 4, start, data[index + 3]);
						return data;
					}
					// Else, just replace `end` with a new value.
					data[index + 1] = codePoint + 1;
					return data;
				}
				lastIndex = index;
				index += 2;
			}
			// The loop has finished; add the new pair to the end of the data set.
			data.push(codePoint, codePoint + 1);
			return data;
		};

		var dataAddData = function(dataA, dataB) {
			// Iterate over the data per `(start, end)` pair.
			var index = 0;
			var start;
			var end;
			var data = dataA.slice();
			var length = dataB.length;
			while (index < length) {
				start = dataB[index];
				end = dataB[index + 1] - 1;
				if (start == end) {
					data = dataAdd(data, start);
				} else {
					data = dataAddRange(data, start, end);
				}
				index += 2;
			}
			return data;
		};

		var dataRemoveData = function(dataA, dataB) {
			// Iterate over the data per `(start, end)` pair.
			var index = 0;
			var start;
			var end;
			var data = dataA.slice();
			var length = dataB.length;
			while (index < length) {
				start = dataB[index];
				end = dataB[index + 1] - 1;
				if (start == end) {
					data = dataRemove(data, start);
				} else {
					data = dataRemoveRange(data, start, end);
				}
				index += 2;
			}
			return data;
		};

		var dataAddRange = function(data, rangeStart, rangeEnd) {
			if (rangeEnd < rangeStart) {
				throw Error(ERRORS.rangeOrder);
			}
			if (
				rangeStart < 0x0 || rangeStart > 0x10FFFF ||
				rangeEnd < 0x0 || rangeEnd > 0x10FFFF
			) {
				throw RangeError(ERRORS.codePointRange);
			}
			// Iterate over the data per `(start, end)` pair.
			var index = 0;
			var start;
			var end;
			var added = false;
			var length = data.length;
			while (index < length) {
				start = data[index];
				end = data[index + 1];

				if (added) {
					// The range has already been added to the set; at this point, we just
					// need to get rid of the following ranges in case they overlap.

					// Check if this range can be combined with the previous range.
					if (start == rangeEnd + 1) {
						data.splice(index - 1, 2);
						return data;
					}

					// Exit as soon as no more possibly overlapping pairs can be found.
					if (start > rangeEnd) {
						return data;
					}

					// E.g. `[0, 11, 12, 16]` and we’ve added 5-15, so we now have
					// `[0, 16, 12, 16]`. Remove the `12,16` part, as it lies within the
					// `0,16` range that was previously added.
					if (start >= rangeStart && start <= rangeEnd) {
						// `start` lies within the range that was previously added.

						if (end > rangeStart && end - 1 <= rangeEnd) {
							// `end` lies within the range that was previously added as well,
							// so remove this pair.
							data.splice(index, 2);
							index -= 2;
							// Note: we cannot `return` just yet, as there may still be other
							// overlapping pairs.
						} else {
							// `start` lies within the range that was previously added, but
							// `end` doesn’t. E.g. `[0, 11, 12, 31]` and we’ve added 5-15, so
							// now we have `[0, 16, 12, 31]`. This must be written as `[0, 31]`.
							// Remove the previously added `end` and the current `start`.
							data.splice(index - 1, 2);
							index -= 2;
						}

						// Note: we cannot return yet.
					}

				}

				else if (start == rangeEnd + 1) {
					data[index] = rangeStart;
					return data;
				}

				// Check if a new pair must be inserted *before* the current one.
				else if (start > rangeEnd) {
					data.splice(index, 0, rangeStart, rangeEnd + 1);
					return data;
				}

				else if (rangeStart >= start && rangeStart < end && rangeEnd + 1 <= end) {
					// The new range lies entirely within an existing range pair. No action
					// needed.
					return data;
				}

				else if (
					// E.g. `[0, 11]` and you add 5-15 → `[0, 16]`.
					(rangeStart >= start && rangeStart < end) ||
					// E.g. `[0, 3]` and you add 3-6 → `[0, 7]`.
					end == rangeStart
				) {
					// Replace `end` with the new value.
					data[index + 1] = rangeEnd + 1;
					// Make sure the next range pair doesn’t overlap, e.g. `[0, 11, 12, 14]`
					// and you add 5-15 → `[0, 16]`, i.e. remove the `12,14` part.
					added = true;
					// Note: we cannot `return` just yet.
				}

				else if (rangeStart <= start && rangeEnd + 1 >= end) {
					// The new range is a superset of the old range.
					data[index] = rangeStart;
					data[index + 1] = rangeEnd + 1;
					added = true;
				}

				index += 2;
			}
			// The loop has finished without doing anything; add the new pair to the end
			// of the data set.
			if (!added) {
				data.push(rangeStart, rangeEnd + 1);
			}
			return data;
		};

		var dataContains = function(data, codePoint) {
			var index = 0;
			var length = data.length;
			// Exit early if `codePoint` is not within `data`’s overall range.
			var start = data[index];
			var end = data[length - 1];
			if (length >= 2) {
				if (codePoint < start || codePoint > end) {
					return false;
				}
			}
			// Iterate over the data per `(start, end)` pair.
			while (index < length) {
				start = data[index];
				end = data[index + 1];
				if (codePoint >= start && codePoint < end) {
					return true;
				}
				index += 2;
			}
			return false;
		};

		var dataIntersection = function(data, codePoints) {
			var index = 0;
			var length = codePoints.length;
			var codePoint;
			var result = [];
			while (index < length) {
				codePoint = codePoints[index];
				if (dataContains(data, codePoint)) {
					result.push(codePoint);
				}
				++index;
			}
			return dataFromCodePoints(result);
		};

		var dataIsEmpty = function(data) {
			return !data.length;
		};

		var dataIsSingleton = function(data) {
			// Check if the set only represents a single code point.
			return data.length == 2 && data[0] + 1 == data[1];
		};

		var dataToArray = function(data) {
			// Iterate over the data per `(start, end)` pair.
			var index = 0;
			var start;
			var end;
			var result = [];
			var length = data.length;
			while (index < length) {
				start = data[index];
				end = data[index + 1];
				while (start < end) {
					result.push(start);
					++start;
				}
				index += 2;
			}
			return result;
		};

		/*--------------------------------------------------------------------------*/

		// https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
		var floor = Math.floor;
		var highSurrogate = function(codePoint) {
			return parseInt(
				floor((codePoint - 0x10000) / 0x400) + HIGH_SURROGATE_MIN,
				10
			);
		};

		var lowSurrogate = function(codePoint) {
			return parseInt(
				(codePoint - 0x10000) % 0x400 + LOW_SURROGATE_MIN,
				10
			);
		};

		var stringFromCharCode = String.fromCharCode;
		var codePointToString = function(codePoint) {
			var string;
			// https://mathiasbynens.be/notes/javascript-escapes#single
			// Note: the `\b` escape sequence for U+0008 BACKSPACE in strings has a
			// different meaning in regular expressions (word boundary), so it cannot
			// be used here.
			if (codePoint == 0x09) {
				string = '\\t';
			}
			// Note: IE < 9 treats `'\v'` as `'v'`, so avoid using it.
			// else if (codePoint == 0x0B) {
			// 	string = '\\v';
			// }
			else if (codePoint == 0x0A) {
				string = '\\n';
			}
			else if (codePoint == 0x0C) {
				string = '\\f';
			}
			else if (codePoint == 0x0D) {
				string = '\\r';
			}
			else if (codePoint == 0x5C) {
				string = '\\\\';
			}
			else if (
				codePoint == 0x24 ||
				(codePoint >= 0x28 && codePoint <= 0x2B) ||
				codePoint == 0x2D || codePoint == 0x2E || codePoint == 0x3F ||
				(codePoint >= 0x5B && codePoint <= 0x5E) ||
				(codePoint >= 0x7B && codePoint <= 0x7D)
			) {
				// The code point maps to an unsafe printable ASCII character;
				// backslash-escape it. Here’s the list of those symbols:
				//
				//     $()*+-.?[\]^{|}
				//
				// See #7 for more info.
				string = '\\' + stringFromCharCode(codePoint);
			}
			else if (codePoint >= 0x20 && codePoint <= 0x7E) {
				// The code point maps to one of these printable ASCII symbols
				// (including the space character):
				//
				//      !"#%&',/0123456789:;<=>@ABCDEFGHIJKLMNO
				//     PQRSTUVWXYZ_`abcdefghijklmnopqrstuvwxyz~
				//
				// These can safely be used directly.
				string = stringFromCharCode(codePoint);
			}
			else if (codePoint <= 0xFF) {
				// https://mathiasbynens.be/notes/javascript-escapes#hexadecimal
				string = '\\x' + pad(hex(codePoint), 2);
			}
			else { // `codePoint <= 0xFFFF` holds true.
				// https://mathiasbynens.be/notes/javascript-escapes#unicode
				string = '\\u' + pad(hex(codePoint), 4);
			}

			// There’s no need to account for astral symbols / surrogate pairs here,
			// since `codePointToString` is private and only used for BMP code points.
			// But if that’s what you need, just add an `else` block with this code:
			//
			//     string = '\\u' + pad(hex(highSurrogate(codePoint)), 4)
			//     	+ '\\u' + pad(hex(lowSurrogate(codePoint)), 4);

			return string;
		};

		var codePointToStringUnicode = function(codePoint) {
			if (codePoint <= 0xFFFF) {
				return codePointToString(codePoint);
			}
			return '\\u{' + codePoint.toString(16).toUpperCase() + '}';
		};

		var symbolToCodePoint = function(symbol) {
			var length = symbol.length;
			var first = symbol.charCodeAt(0);
			var second;
			if (
				first >= HIGH_SURROGATE_MIN && first <= HIGH_SURROGATE_MAX &&
				length > 1 // There is a next code unit.
			) {
				// `first` is a high surrogate, and there is a next character. Assume
				// it’s a low surrogate (else it’s invalid usage of Regenerate anyway).
				second = symbol.charCodeAt(1);
				// https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
				return (first - HIGH_SURROGATE_MIN) * 0x400 +
					second - LOW_SURROGATE_MIN + 0x10000;
			}
			return first;
		};

		var createBMPCharacterClasses = function(data) {
			// Iterate over the data per `(start, end)` pair.
			var result = '';
			var index = 0;
			var start;
			var end;
			var length = data.length;
			if (dataIsSingleton(data)) {
				return codePointToString(data[0]);
			}
			while (index < length) {
				start = data[index];
				end = data[index + 1] - 1; // Note: the `- 1` makes `end` inclusive.
				if (start == end) {
					result += codePointToString(start);
				} else if (start + 1 == end) {
					result += codePointToString(start) + codePointToString(end);
				} else {
					result += codePointToString(start) + '-' + codePointToString(end);
				}
				index += 2;
			}
			return '[' + result + ']';
		};

		var createUnicodeCharacterClasses = function(data) {
			// Iterate over the data per `(start, end)` pair.
			var result = '';
			var index = 0;
			var start;
			var end;
			var length = data.length;
			if (dataIsSingleton(data)) {
				return codePointToStringUnicode(data[0]);
			}
			while (index < length) {
				start = data[index];
				end = data[index + 1] - 1; // Note: the `- 1` makes `end` inclusive.
				if (start == end) {
					result += codePointToStringUnicode(start);
				} else if (start + 1 == end) {
					result += codePointToStringUnicode(start) + codePointToStringUnicode(end);
				} else {
					result += codePointToStringUnicode(start) + '-' + codePointToStringUnicode(end);
				}
				index += 2;
			}
			return '[' + result + ']';
		};

		var splitAtBMP = function(data) {
			// Iterate over the data per `(start, end)` pair.
			var loneHighSurrogates = [];
			var loneLowSurrogates = [];
			var bmp = [];
			var astral = [];
			var index = 0;
			var start;
			var end;
			var length = data.length;
			while (index < length) {
				start = data[index];
				end = data[index + 1] - 1; // Note: the `- 1` makes `end` inclusive.

				if (start < HIGH_SURROGATE_MIN) {

					// The range starts and ends before the high surrogate range.
					// E.g. (0, 0x10).
					if (end < HIGH_SURROGATE_MIN) {
						bmp.push(start, end + 1);
					}

					// The range starts before the high surrogate range and ends within it.
					// E.g. (0, 0xD855).
					if (end >= HIGH_SURROGATE_MIN && end <= HIGH_SURROGATE_MAX) {
						bmp.push(start, HIGH_SURROGATE_MIN);
						loneHighSurrogates.push(HIGH_SURROGATE_MIN, end + 1);
					}

					// The range starts before the high surrogate range and ends in the low
					// surrogate range. E.g. (0, 0xDCFF).
					if (end >= LOW_SURROGATE_MIN && end <= LOW_SURROGATE_MAX) {
						bmp.push(start, HIGH_SURROGATE_MIN);
						loneHighSurrogates.push(HIGH_SURROGATE_MIN, HIGH_SURROGATE_MAX + 1);
						loneLowSurrogates.push(LOW_SURROGATE_MIN, end + 1);
					}

					// The range starts before the high surrogate range and ends after the
					// low surrogate range. E.g. (0, 0x10FFFF).
					if (end > LOW_SURROGATE_MAX) {
						bmp.push(start, HIGH_SURROGATE_MIN);
						loneHighSurrogates.push(HIGH_SURROGATE_MIN, HIGH_SURROGATE_MAX + 1);
						loneLowSurrogates.push(LOW_SURROGATE_MIN, LOW_SURROGATE_MAX + 1);
						if (end <= 0xFFFF) {
							bmp.push(LOW_SURROGATE_MAX + 1, end + 1);
						} else {
							bmp.push(LOW_SURROGATE_MAX + 1, 0xFFFF + 1);
							astral.push(0xFFFF + 1, end + 1);
						}
					}

				} else if (start >= HIGH_SURROGATE_MIN && start <= HIGH_SURROGATE_MAX) {

					// The range starts and ends in the high surrogate range.
					// E.g. (0xD855, 0xD866).
					if (end >= HIGH_SURROGATE_MIN && end <= HIGH_SURROGATE_MAX) {
						loneHighSurrogates.push(start, end + 1);
					}

					// The range starts in the high surrogate range and ends in the low
					// surrogate range. E.g. (0xD855, 0xDCFF).
					if (end >= LOW_SURROGATE_MIN && end <= LOW_SURROGATE_MAX) {
						loneHighSurrogates.push(start, HIGH_SURROGATE_MAX + 1);
						loneLowSurrogates.push(LOW_SURROGATE_MIN, end + 1);
					}

					// The range starts in the high surrogate range and ends after the low
					// surrogate range. E.g. (0xD855, 0x10FFFF).
					if (end > LOW_SURROGATE_MAX) {
						loneHighSurrogates.push(start, HIGH_SURROGATE_MAX + 1);
						loneLowSurrogates.push(LOW_SURROGATE_MIN, LOW_SURROGATE_MAX + 1);
						if (end <= 0xFFFF) {
							bmp.push(LOW_SURROGATE_MAX + 1, end + 1);
						} else {
							bmp.push(LOW_SURROGATE_MAX + 1, 0xFFFF + 1);
							astral.push(0xFFFF + 1, end + 1);
						}
					}

				} else if (start >= LOW_SURROGATE_MIN && start <= LOW_SURROGATE_MAX) {

					// The range starts and ends in the low surrogate range.
					// E.g. (0xDCFF, 0xDDFF).
					if (end >= LOW_SURROGATE_MIN && end <= LOW_SURROGATE_MAX) {
						loneLowSurrogates.push(start, end + 1);
					}

					// The range starts in the low surrogate range and ends after the low
					// surrogate range. E.g. (0xDCFF, 0x10FFFF).
					if (end > LOW_SURROGATE_MAX) {
						loneLowSurrogates.push(start, LOW_SURROGATE_MAX + 1);
						if (end <= 0xFFFF) {
							bmp.push(LOW_SURROGATE_MAX + 1, end + 1);
						} else {
							bmp.push(LOW_SURROGATE_MAX + 1, 0xFFFF + 1);
							astral.push(0xFFFF + 1, end + 1);
						}
					}

				} else if (start > LOW_SURROGATE_MAX && start <= 0xFFFF) {

					// The range starts and ends after the low surrogate range.
					// E.g. (0xFFAA, 0x10FFFF).
					if (end <= 0xFFFF) {
						bmp.push(start, end + 1);
					} else {
						bmp.push(start, 0xFFFF + 1);
						astral.push(0xFFFF + 1, end + 1);
					}

				} else {

					// The range starts and ends in the astral range.
					astral.push(start, end + 1);

				}

				index += 2;
			}
			return {
				'loneHighSurrogates': loneHighSurrogates,
				'loneLowSurrogates': loneLowSurrogates,
				'bmp': bmp,
				'astral': astral
			};
		};

		var optimizeSurrogateMappings = function(surrogateMappings) {
			var result = [];
			var tmpLow = [];
			var addLow = false;
			var mapping;
			var nextMapping;
			var highSurrogates;
			var lowSurrogates;
			var nextHighSurrogates;
			var nextLowSurrogates;
			var index = -1;
			var length = surrogateMappings.length;
			while (++index < length) {
				mapping = surrogateMappings[index];
				nextMapping = surrogateMappings[index + 1];
				if (!nextMapping) {
					result.push(mapping);
					continue;
				}
				highSurrogates = mapping[0];
				lowSurrogates = mapping[1];
				nextHighSurrogates = nextMapping[0];
				nextLowSurrogates = nextMapping[1];

				// Check for identical high surrogate ranges.
				tmpLow = lowSurrogates;
				while (
					nextHighSurrogates &&
					highSurrogates[0] == nextHighSurrogates[0] &&
					highSurrogates[1] == nextHighSurrogates[1]
				) {
					// Merge with the next item.
					if (dataIsSingleton(nextLowSurrogates)) {
						tmpLow = dataAdd(tmpLow, nextLowSurrogates[0]);
					} else {
						tmpLow = dataAddRange(
							tmpLow,
							nextLowSurrogates[0],
							nextLowSurrogates[1] - 1
						);
					}
					++index;
					mapping = surrogateMappings[index];
					highSurrogates = mapping[0];
					lowSurrogates = mapping[1];
					nextMapping = surrogateMappings[index + 1];
					nextHighSurrogates = nextMapping && nextMapping[0];
					nextLowSurrogates = nextMapping && nextMapping[1];
					addLow = true;
				}
				result.push([
					highSurrogates,
					addLow ? tmpLow : lowSurrogates
				]);
				addLow = false;
			}
			return optimizeByLowSurrogates(result);
		};

		var optimizeByLowSurrogates = function(surrogateMappings) {
			if (surrogateMappings.length == 1) {
				return surrogateMappings;
			}
			var index = -1;
			var innerIndex = -1;
			while (++index < surrogateMappings.length) {
				var mapping = surrogateMappings[index];
				var lowSurrogates = mapping[1];
				var lowSurrogateStart = lowSurrogates[0];
				var lowSurrogateEnd = lowSurrogates[1];
				innerIndex = index; // Note: the loop starts at the next index.
				while (++innerIndex < surrogateMappings.length) {
					var otherMapping = surrogateMappings[innerIndex];
					var otherLowSurrogates = otherMapping[1];
					var otherLowSurrogateStart = otherLowSurrogates[0];
					var otherLowSurrogateEnd = otherLowSurrogates[1];
					if (
						lowSurrogateStart == otherLowSurrogateStart &&
						lowSurrogateEnd == otherLowSurrogateEnd
					) {
						// Add the code points in the other item to this one.
						if (dataIsSingleton(otherMapping[0])) {
							mapping[0] = dataAdd(mapping[0], otherMapping[0][0]);
						} else {
							mapping[0] = dataAddRange(
								mapping[0],
								otherMapping[0][0],
								otherMapping[0][1] - 1
							);
						}
						// Remove the other, now redundant, item.
						surrogateMappings.splice(innerIndex, 1);
						--innerIndex;
					}
				}
			}
			return surrogateMappings;
		};

		var surrogateSet = function(data) {
			// Exit early if `data` is an empty set.
			if (!data.length) {
				return [];
			}

			// Iterate over the data per `(start, end)` pair.
			var index = 0;
			var start;
			var end;
			var startHigh;
			var startLow;
			var endHigh;
			var endLow;
			var surrogateMappings = [];
			var length = data.length;
			while (index < length) {
				start = data[index];
				end = data[index + 1] - 1;

				startHigh = highSurrogate(start);
				startLow = lowSurrogate(start);
				endHigh = highSurrogate(end);
				endLow = lowSurrogate(end);

				var startsWithLowestLowSurrogate = startLow == LOW_SURROGATE_MIN;
				var endsWithHighestLowSurrogate = endLow == LOW_SURROGATE_MAX;
				var complete = false;

				// Append the previous high-surrogate-to-low-surrogate mappings.
				// Step 1: `(startHigh, startLow)` to `(startHigh, LOW_SURROGATE_MAX)`.
				if (
					startHigh == endHigh ||
					startsWithLowestLowSurrogate && endsWithHighestLowSurrogate
				) {
					surrogateMappings.push([
						[startHigh, endHigh + 1],
						[startLow, endLow + 1]
					]);
					complete = true;
				} else {
					surrogateMappings.push([
						[startHigh, startHigh + 1],
						[startLow, LOW_SURROGATE_MAX + 1]
					]);
				}

				// Step 2: `(startHigh + 1, LOW_SURROGATE_MIN)` to
				// `(endHigh - 1, LOW_SURROGATE_MAX)`.
				if (!complete && startHigh + 1 < endHigh) {
					if (endsWithHighestLowSurrogate) {
						// Combine step 2 and step 3.
						surrogateMappings.push([
							[startHigh + 1, endHigh + 1],
							[LOW_SURROGATE_MIN, endLow + 1]
						]);
						complete = true;
					} else {
						surrogateMappings.push([
							[startHigh + 1, endHigh],
							[LOW_SURROGATE_MIN, LOW_SURROGATE_MAX + 1]
						]);
					}
				}

				// Step 3. `(endHigh, LOW_SURROGATE_MIN)` to `(endHigh, endLow)`.
				if (!complete) {
					surrogateMappings.push([
						[endHigh, endHigh + 1],
						[LOW_SURROGATE_MIN, endLow + 1]
					]);
				}

				index += 2;
			}

			// The format of `surrogateMappings` is as follows:
			//
			//     [ surrogateMapping1, surrogateMapping2 ]
			//
			// i.e.:
			//
			//     [
			//       [ highSurrogates1, lowSurrogates1 ],
			//       [ highSurrogates2, lowSurrogates2 ]
			//     ]
			return optimizeSurrogateMappings(surrogateMappings);
		};

		var createSurrogateCharacterClasses = function(surrogateMappings) {
			var result = [];
			forEach(surrogateMappings, function(surrogateMapping) {
				var highSurrogates = surrogateMapping[0];
				var lowSurrogates = surrogateMapping[1];
				result.push(
					createBMPCharacterClasses(highSurrogates) +
					createBMPCharacterClasses(lowSurrogates)
				);
			});
			return result.join('|');
		};

		var createCharacterClassesFromData = function(data, bmpOnly, hasUnicodeFlag) {
			if (hasUnicodeFlag) {
				return createUnicodeCharacterClasses(data);
			}
			var result = [];

			var parts = splitAtBMP(data);
			var loneHighSurrogates = parts.loneHighSurrogates;
			var loneLowSurrogates = parts.loneLowSurrogates;
			var bmp = parts.bmp;
			var astral = parts.astral;
			var hasLoneHighSurrogates = !dataIsEmpty(loneHighSurrogates);
			var hasLoneLowSurrogates = !dataIsEmpty(loneLowSurrogates);

			var surrogateMappings = surrogateSet(astral);

			if (bmpOnly) {
				bmp = dataAddData(bmp, loneHighSurrogates);
				hasLoneHighSurrogates = false;
				bmp = dataAddData(bmp, loneLowSurrogates);
				hasLoneLowSurrogates = false;
			}

			if (!dataIsEmpty(bmp)) {
				// The data set contains BMP code points that are not high surrogates
				// needed for astral code points in the set.
				result.push(createBMPCharacterClasses(bmp));
			}
			if (surrogateMappings.length) {
				// The data set contains astral code points; append character classes
				// based on their surrogate pairs.
				result.push(createSurrogateCharacterClasses(surrogateMappings));
			}
			// https://gist.github.com/mathiasbynens/bbe7f870208abcfec860
			if (hasLoneHighSurrogates) {
				result.push(
					createBMPCharacterClasses(loneHighSurrogates) +
					// Make sure the high surrogates aren’t part of a surrogate pair.
					'(?![\\uDC00-\\uDFFF])'
				);
			}
			if (hasLoneLowSurrogates) {
				result.push(
					// It is not possible to accurately assert the low surrogates aren’t
					// part of a surrogate pair, since JavaScript regular expressions do
					// not support lookbehind.
					'(?:[^\\uD800-\\uDBFF]|^)' +
					createBMPCharacterClasses(loneLowSurrogates)
				);
			}
			return result.join('|');
		};

		/*--------------------------------------------------------------------------*/

		// `regenerate` can be used as a constructor (and new methods can be added to
		// its prototype) but also as a regular function, the latter of which is the
		// documented and most common usage. For that reason, it’s not capitalized.
		var regenerate = function(value) {
			if (arguments.length > 1) {
				value = slice.call(arguments);
			}
			if (this instanceof regenerate) {
				this.data = [];
				return value ? this.add(value) : this;
			}
			return (new regenerate).add(value);
		};

		regenerate.version = '1.3.2';

		var proto = regenerate.prototype;
		extend(proto, {
			'add': function(value) {
				var $this = this;
				if (value == null) {
					return $this;
				}
				if (value instanceof regenerate) {
					// Allow passing other Regenerate instances.
					$this.data = dataAddData($this.data, value.data);
					return $this;
				}
				if (arguments.length > 1) {
					value = slice.call(arguments);
				}
				if (isArray(value)) {
					forEach(value, function(item) {
						$this.add(item);
					});
					return $this;
				}
				$this.data = dataAdd(
					$this.data,
					isNumber(value) ? value : symbolToCodePoint(value)
				);
				return $this;
			},
			'remove': function(value) {
				var $this = this;
				if (value == null) {
					return $this;
				}
				if (value instanceof regenerate) {
					// Allow passing other Regenerate instances.
					$this.data = dataRemoveData($this.data, value.data);
					return $this;
				}
				if (arguments.length > 1) {
					value = slice.call(arguments);
				}
				if (isArray(value)) {
					forEach(value, function(item) {
						$this.remove(item);
					});
					return $this;
				}
				$this.data = dataRemove(
					$this.data,
					isNumber(value) ? value : symbolToCodePoint(value)
				);
				return $this;
			},
			'addRange': function(start, end) {
				var $this = this;
				$this.data = dataAddRange($this.data,
					isNumber(start) ? start : symbolToCodePoint(start),
					isNumber(end) ? end : symbolToCodePoint(end)
				);
				return $this;
			},
			'removeRange': function(start, end) {
				var $this = this;
				var startCodePoint = isNumber(start) ? start : symbolToCodePoint(start);
				var endCodePoint = isNumber(end) ? end : symbolToCodePoint(end);
				$this.data = dataRemoveRange(
					$this.data,
					startCodePoint,
					endCodePoint
				);
				return $this;
			},
			'intersection': function(argument) {
				var $this = this;
				// Allow passing other Regenerate instances.
				// TODO: Optimize this by writing and using `dataIntersectionData()`.
				var array = argument instanceof regenerate ?
					dataToArray(argument.data) :
					argument;
				$this.data = dataIntersection($this.data, array);
				return $this;
			},
			'contains': function(codePoint) {
				return dataContains(
					this.data,
					isNumber(codePoint) ? codePoint : symbolToCodePoint(codePoint)
				);
			},
			'clone': function() {
				var set = new regenerate;
				set.data = this.data.slice(0);
				return set;
			},
			'toString': function(options) {
				var result = createCharacterClassesFromData(
					this.data,
					options ? options.bmpOnly : false,
					options ? options.hasUnicodeFlag : false
				);
				if (!result) {
					// For an empty set, return something that can be inserted `/here/` to
					// form a valid regular expression. Avoid `(?:)` since that matches the
					// empty string.
					return '[]';
				}
				// Use `\0` instead of `\x00` where possible.
				return result.replace(regexNull, '\\0$1');
			},
			'toRegExp': function(flags) {
				var pattern = this.toString(
					flags && flags.indexOf('u') != -1 ?
						{ 'hasUnicodeFlag': true } :
						null
				);
				return RegExp(pattern, flags || '');
			},
			'valueOf': function() { // Note: `valueOf` is aliased as `toArray`.
				return dataToArray(this.data);
			}
		});

		proto.toArray = proto.valueOf;

		// Some AMD build optimizers, like r.js, check for specific condition patterns
		// like the following:
		if (
			true
		) {
			!(__WEBPACK_AMD_DEFINE_RESULT__ = function() {
				return regenerate;
			}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
		}	else if (freeExports && !freeExports.nodeType) {
			if (freeModule) { // in Node.js, io.js, or RingoJS v0.8.0+
				freeModule.exports = regenerate;
			} else { // in Narwhal or RingoJS v0.7.0-
				freeExports.regenerate = regenerate;
			}
		} else { // in Rhino or a web browser
			root.regenerate = regenerate;
		}

	}(this));

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(14)(module), (function() { return this; }())))

/***/ },
/* 14 */
/***/ function(module, exports) {

	module.exports = function(module) {
		if(!module.webpackPolyfill) {
			module.deprecate = function() {};
			module.paths = [];
			// module.parent = undefined by default
			module.children = [];
			module.webpackPolyfill = 1;
		}
		return module;
	}


/***/ }
/******/ ])
});
;