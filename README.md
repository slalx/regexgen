# regexgen

通过想匹配的字符串自动生成正则表达式

## Installation

`regexgen` can be installed using [npm](https://npmjs.com):

```
npm install regexgen
```

或者
```
把build文件中的打包文件直接通过script标签引用
```


## Example

最简单的用法就是为regexgen传入一个要匹配字符串的数组

```javascript
const regexgen = require('regexgen');

regexgen(['foobar', 'foobaz', 'foozap', 'fooza']); // => /foo(?:zap?|ba[rz])/
```

You can also use the `Trie` class directly:

```javascript
const {Trie} = require('regexgen');

let t = new Trie;
t.add('foobar');
t.add('foobaz');

t.toRegExp(); // => /fooba[rz]/
```
可以在浏览器中直接使用

```javascript
<html>
    <head>
        <script src="../build/regexgen.js"></script>
    </head>
    <body>
        <script>
            console.log(regexgen(['foobar', 'foobaz', 'foozap', 'fooza']))
        </script>
    </body>
</html>

```


## CLI

`regexgen` also has a simple CLI to generate regexes using inputs from the command line.

```
$ regexgen
Usage: regexgen [-gimuy] string1 string2 string3...
```

The optional first parameter is the [flags](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp) to add
to the regex (e.g. `-i` for a case insensitive match).

## How does it work?

1. Generate a [Trie](https://en.wikipedia.org/wiki/Trie) containing all of the input strings.
   This is a tree structure where each edge represents a single character. This removes
   redundancies at the start of the strings, but common branches further down are not merged.

2. A trie can be seen as a tree-shaped deterministic finite automaton (DFA), so DFA algorithms
   can be applied. In this case, we apply [Hopcroft's DFA minimization algorithm](https://en.wikipedia.org/wiki/DFA_minimization#Hopcroft.27s_algorithm)
   to merge the nondistinguishable states.

3. Convert the resulting minimized DFA to a regular expression. This is done using
   [Brzozowski's algebraic method](http://cs.stackexchange.com/questions/2016/how-to-convert-finite-automata-to-regular-expressions#2392),
   which is quite elegant. It expresses the DFA as a system of equations which can be solved
   for a resulting regex. Along the way, some additional optimizations are made, such
   as hoisting common substrings out of an alternation, and using character class ranges.
   This produces an an [Abstract Syntax Tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree)
   (AST) for the regex, which is then converted to a string and compiled to a JavaScript
   `RegExp` object.

## License

MIT
