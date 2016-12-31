 module.exports = {
     entry: './index.js',
     output: {
         path: './build',
         filename: 'regexgen.js',
         chunkFilename: 'regexgen.min.js',
         libraryTarget: "umd",
         library: "regexgen"
     }
 };